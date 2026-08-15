// 공통 파트(헤더·푸터)와 크레딧 계약.
//
// 크레딧이 이 파일의 본론이다. 나머지는 "파일이 있나"라 빠지면 화면에서 바로 보이는데,
// 표시 의무는 **빠져도 화면이 멀쩡해 보인다** — CC BY / BY-SA 는 표시를 요구하고
// (src/assets/CREDITS.md), 그 파일 스스로 "실제 배포 시에는 페이지에 보이는 크레딧이
// 필요하다"고 적어 뒀다. 지워도 아무것도 안 깨지는 것이 이 단언이 필요한 이유다.
//
// 자산마다 다섯을 따로 본다. "크레딧 문단이 있다"로 세면 라이선스 링크만 빠져도 통과한다.
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { NAV_PAGES, pathOf } from "../smoke/pages.mjs";

const read = (relative) => readFileSync(new URL(relative, import.meta.url), "utf8");

const header = read("../theme/artpsy/parts/header.html");
const footer = read("../theme/artpsy/parts/footer.html");
const template = read("../theme/artpsy/templates/index.html");
const themeJson = JSON.parse(read("../theme/artpsy/theme.json"));

describe("템플릿 파트 배선", () => {
  const PARTS = [
    ["header", "header"],
    ["footer", "footer"],
  ];

  for (const [name, area] of PARTS) {
    it(`parts/${name}.html 이 있다`, () => {
      expect(existsSync(new URL(`../theme/artpsy/parts/${name}.html`, import.meta.url))).toBe(true);
    });

    it(`theme.json 이 ${name} 을 ${area} 영역으로 선언한다`, () => {
      // 선언이 없으면 파일이 있어도 파트로 안 잡히고, area 가 없으면 코어가 <div> 로
      // 감싼다 — <header>·<footer> 랜드마크가 사라진다 (block-template-utils.php 의 area_tag).
      expect(themeJson.templateParts).toContainEqual(
        expect.objectContaining({ name, area }),
      );
    });

    it(`index.html 이 ${name} 파트를 부른다`, () => {
      expect(template).toContain(`<!-- wp:template-part {"slug":"${name}"} /-->`);
    });
  }

  it("선언이 둘뿐이다 — 파일 없는 선언이 남으면 편집기에서 빈 파트가 보인다", () => {
    expect(themeJson.templateParts).toHaveLength(2);
  });

  it("파트가 main 바깥에 있다", () => {
    // 안쪽에 있으면 헤더가 constrained 레이아웃에 갇혀 폭이 콘텐츠 폭이 되고,
    // 푸터가 <main> 안의 랜드마크가 된다.
    const headerAt = template.indexOf('{"slug":"header"}');
    const footerAt = template.indexOf('{"slug":"footer"}');
    expect(headerAt).toBeGreaterThan(-1);
    expect(headerAt).toBeLessThan(template.indexOf("<main"));
    expect(footerAt).toBeGreaterThan(template.indexOf("</main>"));
  });
});

describe("내비게이션 — DB 상태를 만들지 않는다", () => {
  it("core/navigation 을 쓰지 않는다", () => {
    // 메뉴를 wp_navigation 포스트 타입에 저장한다. 갓 클론한 설치에는 그 포스트가 없고,
    // 이 repo 는 이제 "클론해서 띄웠을 때 눌러진다"가 판정에 들어 있는 결과물이다.
    // 파일 상태로만 끝나는 목록을 쓴다.
    expect(header).not.toContain("wp:navigation");
  });

  // 슬러그의 정본은 smoke/pages.mjs 다. PR-3 에서는 이 파일이 표를 들고 있었는데,
  // PR-4 가 같은 다섯을 템플릿·라우트·시드에서도 쓰게 되면서 네 곳이 됐다.
  // 두 곳에 적으면 갈리고, 갈린 쪽이 어디인지는 아무도 안 본다 (PR4-PAGES §1).
  // NAV_PAGES 다. PAGES 는 PR 6 부터 내비 밖 페이지(처리방침)를 포함하고, 그것을 그대로
  // 쓰면 헤더에 여섯째 항목이 생겨야 통과하게 된다 (PR6-CONTACT-FORM §2).
  const NAV = NAV_PAGES.map((page) => [pathOf(page), page.label]);

  for (const [href, label] of NAV) {
    it(`${label} → ${href}`, () => {
      expect(header).toContain(`<a href="${href}">${label}</a>`);
    });
  }

  it("정본과 같은 다섯이다 — 헤더만 고치고 라우트를 안 고치는 일이 없게", () => {
    const hrefs = [...header.matchAll(/<li><a href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(NAV.map(([href]) => href));
  });
});

describe("크레딧 — CC 표시 의무 (src/assets/CREDITS.md)", () => {
  // 저널 썸네일 크레딧은 푸터가 아니라 그 이미지의 캡션에 있다. PR-5 에서 썸네일이
  // 포스트 타입으로 옮겨 갈 때 크레딧이 이미지와 같이 움직여야 하기 때문이다 —
  // 푸터에 하드코딩하면 그 이동이 조용히 어긋나고, 어긋난 상태가 화면에서 안 보인다.
  const ASSETS = [
    {
      asset: "히어로",
      where: "푸터",
      text: footer,
      title: "“Codes”",
      author: "Bruce Black",
      source: "https://commons.wikimedia.org/wiki/File:%22Codes%22_Abstract_Watercolor_Painting_by_Bruce_Black_(2020).jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    },
    {
      asset: "journal-01",
      where: "캡션",
      text: template,
      title: "“Abstrakte Komposition”",
      author: "Hans Kruzwicki",
      source: "https://commons.wikimedia.org/wiki/File:%22Abstrakte_Komposition%22_Hans_Kruzwicki.jpg",
      license: "CC BY 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by/3.0",
    },
    {
      asset: "journal-02",
      where: "캡션",
      text: template,
      title: "“Afterglow”",
      author: "Ray L. Burggraf",
      source: "https://commons.wikimedia.org/wiki/File:%22Afterglow%22_by_Ray_L._Burggraf,_2005.jpg",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    },
  ];

  for (const one of ASSETS) {
    describe(`${one.asset} (${one.where})`, () => {
      it("제목", () => expect(one.text).toContain(one.title));
      it("작가", () => expect(one.text).toContain(one.author));
      it("출처 링크", () => expect(one.text).toContain(`href="${one.source}"`));
      it("라이선스 이름", () => expect(one.text).toContain(one.license));
      it("라이선스 링크", () => expect(one.text).toContain(`href="${one.licenseUrl}"`));
    });
  }

  it("자산이 셋이다 — 페이지에 쓰이는 것과 같은 수다", () => {
    expect(ASSETS).toHaveLength(3);
  });

  it("변경 표시가 셋 다 있다 — 크롭 + WebP 재인코딩이라 원본이 아니다", () => {
    // CC 는 변경 여부 표시를 따로 요구한다. 나머지 넷이 다 있어도 이것만 빠질 수 있다.
    expect([...footer.matchAll(/재인코딩/g)]).toHaveLength(1);
    expect([...template.matchAll(/재인코딩/g)]).toHaveLength(2);
  });

  it("캡션이 이미지와 같은 figure 안에 있다 — PR-5 에서 같이 옮겨 가야 한다", () => {
    const figures = [...template.matchAll(/<figure class="[^"]*journal__thumb-block[^"]*">[\s\S]*?<\/figure>/g)];
    expect(figures).toHaveLength(2);
    for (const [figure] of figures) {
      expect(figure).toMatch(/<figcaption class="wp-element-caption">/);
    }
  });

  it("안 쓰는 22 장은 크레딧에 없다 — 있으면 다음 사람이 어디 있는지 찾는다", () => {
    const unused = Array.from({ length: 22 }, (_, i) => `journal-${String(i + 3).padStart(2, "0")}`);
    expect(unused.filter((name) => footer.includes(name) || template.includes(name))).toEqual([]);
  });
});
