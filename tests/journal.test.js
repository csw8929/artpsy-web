// 저널 포스트 타입의 L1 계약. "그 URL 이 200 이고 그 템플릿이 골렸나"는 `npm run smoke`,
// "글을 만들면 목록에 뜨나"는 L3 이 본다 (PR5-JOURNAL §6).
//
// 여기서부터 **개수가 편집자에게 달린다.** 그래서 0개 화면(query-no-results)이 있는지가
// 이 파일의 단언 하나를 차지한다 — 고객이 처음 받는 상태가 그것이다.
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { JOURNAL, ARCHIVE_PATH, pathOf, MARKER_ARCHIVE, MARKER_SINGLE, POST_TYPE } from "../smoke/journal.mjs";
import { ROUTES, EXPECTED_ROUTE_COUNT } from "../smoke/routes.mjs";

const read = (relative) => readFileSync(new URL(relative, import.meta.url), "utf8");
const functionsPhp = read("../theme/artpsy/functions.php");
const css = read("../theme/artpsy/style.css");
const archive = read(`../theme/artpsy/templates/archive-${POST_TYPE}.html`);
const single = read(`../theme/artpsy/templates/single-${POST_TYPE}.html`);

describe("포스트 타입 등록", () => {
  it(`${POST_TYPE} 를 등록한다`, () => {
    expect(functionsPhp).toMatch(/register_post_type\(\s*\n?\s*'artpsy_journal'/);
  });

  it("show_in_rest 가 켜져 있다 — 없으면 블록 에디터가 안 열린다", () => {
    // 클래식 편집기로 떨어지고 이 테마의 블록이 하나도 안 보인다. 조용히 나빠지는 쪽이다.
    expect(functionsPhp).toMatch(/'show_in_rest'\s*=>\s*true/);
  });

  it("아카이브가 /journal/ 이다", () => {
    expect(functionsPhp).toMatch(/'has_archive'\s*=>\s*'journal'/);
    expect(ARCHIVE_PATH).toBe("/journal/");
  });

  it("thumbnail 을 지원한다 — 썸네일이 하드코딩에서 대표 이미지로 간다", () => {
    expect(functionsPhp).toMatch(/'supports'\s*=>\s*array\([^)]*'thumbnail'/);
    expect(functionsPhp).toMatch(/add_theme_support\(\s*'post-thumbnails'\s*\)/);
  });

  it("활성화 때 리라이트 규칙을 다시 쓴다 — 안 하면 템플릿이 있어도 404 다", () => {
    expect(functionsPhp).toMatch(/'after_switch_theme'/);
    expect(functionsPhp).toMatch(/flush_rewrite_rules\(\)/);
  });

  it("이미지 사이즈를 새로 등록하지 않는다 — 크롭은 CSS 가 한다", () => {
    // hero-portrait 는 박스 비율이 뷰포트마다 달라서 필요했다. 저널은 어느 폭에서나 4:3
    // 하나라 남는 문제가 "몇 픽셀을 보낼까" 뿐이고, 코어의 폭 기반 srcset 이 그것을 한다.
    const sizes = [...functionsPhp.matchAll(/add_image_size\(\s*'([^']+)'/g)].map((m) => m[1]);
    expect(sizes).toEqual(["hero-portrait"]);
  });

  it("편집 경계 주석이 현재형이다 — 대상이 생겼다", () => {
    // 예전 주석은 "분기할 대상(Journal 포스트 타입)이 아직 없고" 였다. 이제 있다.
    // 안 고치면 다음 사람이 그 문장을 사실로 믿는다 (PR5-JOURNAL §5).
    const filter = functionsPhp.slice(0, functionsPhp.indexOf("'allowed_block_types_all'"));
    expect(filter).not.toContain("분기할 대상(Journal 포스트 타입)이 아직 없고");
    expect(filter).toContain("대상은 이제 있다");
  });
});

describe("템플릿 둘", () => {
  const TEMPLATES = [
    [`archive-${POST_TYPE}`, archive, MARKER_ARCHIVE],
    [`single-${POST_TYPE}`, single, MARKER_SINGLE],
  ];

  for (const [name, html, marker] of TEMPLATES) {
    describe(name, () => {
      it("파일이 있다", () => {
        expect(existsSync(new URL(`../theme/artpsy/templates/${name}.html`, import.meta.url))).toBe(true);
      });

      it(`main 그룹이 ${marker} 표식을 든다`, () => {
        expect(html).toContain(`{"tagName":"main","className":"${marker}"`);
        expect(html).toMatch(new RegExp(`<main class="[^"]*\\b${marker}\\b`));
      });

      it("헤더·푸터 파트를 부른다", () => {
        // 템플릿마다 따로 불러야 한다. PR 4 에서 페이지 다섯이 이것을 통째로 빠뜨렸고
        // 브라우저로 재기 전까지 스위트가 통과했다.
        for (const slug of ["header", "footer"]) {
          expect(html).toContain(`<!-- wp:template-part {"slug":"${slug}"} /-->`);
        }
      });

      it("헤더가 main 앞, 푸터가 뒤다", () => {
        expect(html.indexOf('{"slug":"header"}')).toBeLessThan(html.indexOf("<main"));
        expect(html.indexOf('{"slug":"footer"}')).toBeGreaterThan(html.indexOf("</main>"));
      });
    });
  }

  it("표식이 서로 다르다 — 같으면 single 템플릿이 없어도 라우트가 통과한다", () => {
    expect(MARKER_ARCHIVE).not.toBe(MARKER_SINGLE);
  });

  it("아카이브에 0개 화면이 있다 — 갓 클론한 설치가 그 상태다", () => {
    // 목록은 개수가 변수다. 비었을 때 깨져 보이면 고객이 처음 받는 화면이 그것이다.
    expect(archive).toContain("<!-- wp:query-no-results -->");
    const noResults = archive.slice(
      archive.indexOf("<!-- wp:query-no-results -->"),
      archive.indexOf("<!-- /wp:query-no-results -->"),
    );
    expect(noResults).toMatch(/<p[^>]*>[^<]+<\/p>/);
  });

  it("아카이브 목록이 journal--archive 를 든다 — .grid 를 안 건드린 자리다", () => {
    expect(archive).toContain('"className":"grid journal journal--archive"');
    expect(css).toContain(".journal--archive");
  });

  it("아카이브가 auto-fill 이다 — 글이 하나일 때 카드가 폭 전체로 안 늘어난다", () => {
    const body = css.slice(css.indexOf(".journal--archive"));
    expect(body.slice(0, 160)).toMatch(/auto-fill/);
  });

  it(".grid 는 그대로 auto-fit 이다 — 저널 사정으로 공유 규칙을 안 바꿨다", () => {
    const grid = css.match(/\.grid \{([^}]*)\}/);
    expect(grid).toBeTruthy();
    expect(grid[1]).toMatch(/auto-fit/);
  });
});

describe("대표 이미지 크레딧", () => {
  it("첨부 캡션을 figcaption 으로 낸다 — core/post-featured-image 는 캡션을 안 낸다", () => {
    expect(functionsPhp).toMatch(/'core\/post-featured-image'\s*!==/);
    expect(functionsPhp).toContain("wp_get_attachment_caption");
    expect(functionsPhp).toContain('class="wp-element-caption"');
  });

  it("두 번 붙이지 않는다", () => {
    expect(functionsPhp).toMatch(/strpos\(\s*\$content,\s*'<figcaption'\s*\)/);
  });

  it("캡션 스타일이 대표 이미지에도 걸린다", () => {
    expect(css).toContain(".wp-block-post-featured-image figcaption");
  });
});

describe("라우트 표", () => {
  it("아카이브·낱글·낱글 반증 셋이 있다", () => {
    expect(ROUTES).toContainEqual(
      expect.objectContaining({ path: ARCHIVE_PATH, marker: MARKER_ARCHIVE, expect: true }),
    );
    expect(ROUTES).toContainEqual(
      expect.objectContaining({ path: pathOf(JOURNAL[0]), marker: MARKER_SINGLE, expect: true }),
    );
    expect(ROUTES).toContainEqual(
      expect.objectContaining({ path: pathOf(JOURNAL[0]), marker: MARKER_ARCHIVE, expect: false }),
    );
  });

  it("개수 단언이 표를 따라왔다", () => {
    expect(ROUTES).toHaveLength(EXPECTED_ROUTE_COUNT);
  });
});

describe("시드", () => {
  const seed = read("../smoke/seed-journal.mjs");
  const wpEnv = JSON.parse(read("../.wp-env.json"));
  const pkg = JSON.parse(read("../package.json"));

  it("wp-env 가 start 뒤에 부른다", () => {
    expect(wpEnv.lifecycleScripts?.afterStart).toContain("seed-journal.mjs");
  });

  it("손으로도 부를 수 있다", () => {
    expect(pkg.scripts["wp:seed"]).toContain("seed-journal.mjs");
  });

  it("슬러그를 다시 안 적는다 — journal.mjs 를 읽는다", () => {
    expect(seed).toMatch(/from "\.\/journal\.mjs"/);
    for (const post of JOURNAL) {
      expect(seed).not.toContain(`"${post.slug}"`);
    }
  });

  it("이미 있으면 안 만든다 — start 마다 도는 스크립트다", () => {
    expect(seed).toContain("get_page_by_path");
  });

  it("리라이트를 flush 한다 — 테마 훅은 활성화될 때만 돈다", () => {
    expect(seed).toContain("flush_rewrite_rules()");
  });

  it("크레딧을 첨부의 캡션으로 넣는다 — 이미지를 따라다녀야 한다", () => {
    expect(seed).toContain("post_excerpt");
    for (const post of JOURNAL) {
      expect(post.caption).toMatch(/creativecommons\.org/);
    }
  });

  it("둘이다 — 메인의 저널 카드와 같은 수다", () => {
    expect(JOURNAL).toHaveLength(2);
  });
});

describe("실패가 보이는가 (SEED-WARN)", () => {
  const smoke = read("../smoke/smoke.mjs");
  const seeds = ["../smoke/seed-pages.mjs", "../smoke/seed-journal.mjs"].map(read);

  it("시드가 실패 사유를 stderr 로도 낸다", () => {
    // wp-env 는 lifecycleScript 가 실패했을 때 **stderr 만** 보여 준다. stdout 은 스피너에
    // 덧쓰이고 사라지고, 성공했을 때는 --debug 에서만 나온다
    // (@wordpress/env execute-lifecycle-script.js). stdout 에만 두면 `afterStart Error:`
    // 뒤가 빈 채로 뜨고, 시드가 왜 실패했는지 아무 데도 안 남는다.
    for (const seed of seeds) {
      expect(seed).toContain("process.stderr.write");
    }
  });

  it("본문을 회차 안에서 한 번만 받는다", () => {
    // 라우트 검사와 자산 검사가 같은 경로를 본다. 두 번 받으면 그 사이에 상태가 갈리고,
    // 라우트는 통과하는데 자산만 실패하는 회차가 나오면 원인을 사이트에서 찾게 된다.
    expect(smoke).toContain("bodyCache");
  });
});
