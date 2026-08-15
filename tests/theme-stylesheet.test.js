// theme/artpsy/style.css 계약. 매핑 §4.2 가 "theme.json 에 슬롯이 없다"로 판정한 것들이
// 실제로 여기 있는지 본다.
//
// 규칙마다 따로 단언한다. "몇 개 있다"로 세면 하나가 빠져도 안 죽는다 — PR-3 의 fontFace 가
// 정확히 그 모양이었다 (MyPrivate#6).
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";

const css = readFileSync(new URL("../theme/artpsy/style.css", import.meta.url), "utf8");
const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

/** 선언 블록의 본문을 꺼낸다. 공백 차이로 실패하지 않도록 접는다. */
function bodyOf(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = withoutComments.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1].replace(/\s+/g, " ").trim() : null;
}

describe("테마 헤더", () => {
  it("Theme Name 이 있다 — 블록 테마의 필수 조건이다", () => {
    expect(css).toMatch(/^\/\*[\s\S]*Theme Name:\s*artpsy/m);
  });
});

describe("시트가 실릴 배선이 있다", () => {
  // 파일에 규칙이 있는 것과 규칙이 적용되는 것은 다르다. 아래 단언들은 전부 파일의 텍스트를
  // 보므로 그 차이를 못 잡는다 — 처음에 이 배선이 없어서 셋 다 통과하면서 하나도 발동하지
  // 않았다 (ARTPSY-68R). 정적으로 닫을 수 있는 것은 "거는 코드가 있는가"까지다.
  const functionsPhp = readFileSync(
    new URL("../theme/artpsy/functions.php", import.meta.url),
    "utf8",
  );

  it("프런트에 enqueue 한다 — 블록 테마라도 자동으로 걸리지 않는다", () => {
    expect(functionsPhp).toMatch(/wp_enqueue_scripts/);
    expect(functionsPhp).toMatch(/wp_enqueue_style\(\s*[\s\S]*get_stylesheet_uri\(\)/);
  });

  it("data-reveal 을 render_block 으로 붙인다 — 마크업에 박으면 블록 검증이 깨진다", () => {
    // core/heading 의 supports 는 anchor 까지다. 저장된 HTML 에 없는 속성이 있으면 검증이
    // 깨지므로 템플릿이 아니라 서버 렌더에서 붙인다.
    expect(functionsPhp).toMatch(/add_filter\(\s*\n?\s*'render_block'/);
    expect(functionsPhp).toMatch(/data-reveal/);
  });

  it("reveal 대상이 섹션 제목과 리드로 한정된다", () => {
    // 히어로 h1 은 LCP 후보라 빼고, 반복 항목은 편집자가 추가한 것에 속성이 없어서 뺀다.
    // 이 단언은 조건이 코드에 있는지까지만 본다 — 실제 붙는 자리는 PHP 하네스가 판정했다.
    expect(functionsPhp).toMatch(/'core\/heading'\s*===\s*\$name\s*&&\s*2\s*===/);
    expect(functionsPhp).toMatch(/'core\/paragraph'\s*===\s*\$name/);
    expect(functionsPhp).toMatch(/'lead'/);
  });

  it("에디터 캔버스에도 건다 — .link·.grid 는 편집자가 보면서 고친다", () => {
    // PR-4 에서는 안 걸었다. 그 시트의 셋(Lenis·reveal 초기 상태·reduced-motion)은
    // 편집자가 에디터에서 볼 것이 아니었기 때문이다. .link 와 .grid 가 들어오면서
    // 기준이 뒤집혔다 — 캔버스와 프런트가 갈리면 잘못된 미리보기를 보고 카피를 다듬는다.
    //
    // 시트를 가르지 않는다. 프런트 전용 규칙은 캔버스에서 매칭할 것이 없다
    // (tester 실측: canvasHasJs false · matchesRule 0). 가르는 값이 그 무해함보다 크다.
    expect(functionsPhp).toMatch(/add_editor_style\(\s*'style\.css'\s*\)/);
  });
});

describe("Lenis 연동 (매핑 §4.2)", () => {
  // 선택자는 Lenis 가 붙이는 것이라 우리가 이름을 정하지 않는다. 바뀌면 연동이 끊긴다.
  it("html.lenis 의 height 가 auto 다", () => {
    expect(bodyOf("html.lenis body")).toMatch(/height:\s*auto/);
  });

  it("lenis-smooth 가 네이티브 스무스 스크롤을 끈다", () => {
    expect(bodyOf(".lenis.lenis-smooth")).toMatch(/scroll-behavior:\s*auto\s*!important/);
  });

  it("lenis-stopped 가 overflow 를 잠근다", () => {
    expect(bodyOf(".lenis.lenis-stopped")).toMatch(/overflow:\s*hidden/);
  });
});

describe("reveal 초기 상태 (매핑 §4.2)", () => {
  it(".js 가 붙었을 때만 숨긴다 — JS 실패가 백지가 되지 않게", () => {
    const body = bodyOf(".js [data-reveal]");
    expect(body).toMatch(/opacity:\s*0/);
  });

  it("이동 거리가 리터럴로 남아 있다 — 연출 튜닝 상수는 토큰화하지 않는다 (매핑 §4.4)", () => {
    expect(bodyOf(".js [data-reveal]")).toMatch(/transform:\s*translateY\(1\.25rem\)/);
  });
});

describe("모션 감소 (매핑 §4.2 · 프로젝트 CLAUDE.md)", () => {
  // theme.json 에 미디어쿼리 문법이 없어서 이 블록은 스타일시트 말고 갈 곳이 없다.
  // 심리상담 도메인이라 빠지면 안 된다.
  /**
   * 중첩 규칙이 있어서 정규식으로 끝 중괄호를 찾을 수 없다. 여는 중괄호부터 짝을 세어
   * 잘라낸다. 처음에 정규식으로 짰다가 이 블록을 통째로 못 찾았다.
   */
  function mediaBlock(condition) {
    const head = withoutComments.indexOf(condition);
    if (head === -1) return null;
    const open = withoutComments.indexOf("{", head);
    if (open === -1) return null;

    let depth = 0;
    for (let i = open; i < withoutComments.length; i += 1) {
      if (withoutComments[i] === "{") depth += 1;
      else if (withoutComments[i] === "}") {
        depth -= 1;
        if (depth === 0) return withoutComments.slice(open + 1, i);
      }
    }
    return null;
  }

  const block = mediaBlock("prefers-reduced-motion");

  it("블록이 존재한다", () => {
    expect(block).not.toBeNull();
  });

  it("reveal 을 보이는 상태로 되돌린다 — 없으면 콘텐츠가 숨은 채로 남는다", () => {
    expect(block).toMatch(/\.js \[data-reveal\][\s\S]*opacity:\s*1/);
    expect(block).toMatch(/\.js \[data-reveal\][\s\S]*transform:\s*none/);
  });

  it("전역 전환을 억제한다 — 없으면 다른 전환이 계속 돈다", () => {
    expect(block).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    expect(block).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
  });
});

describe("토큰 참조", () => {
  it("모든 var() 참조가 --wp-- 변수다 — Phase 1 토큰 이름은 테마에 없다", () => {
    const refs = [...withoutComments.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((m) => m[1]);
    const stale = refs.filter((name) => !name.startsWith("--wp--"));
    expect(stale).toEqual([]);
  });
});

describe("허용 블록 (편집경계 설계 §3.1)", () => {
  const functionsPhp = readFileSync(
    new URL("../theme/artpsy/functions.php", import.meta.url),
    "utf8",
  );

  it("allowed_block_types_all 필터가 있다", () => {
    expect(functionsPhp).toMatch(/add_filter\(\s*\n?\s*'allowed_block_types_all'/);
  });

  it("core/button 을 뺀다 — 이 디자인에 버튼 컴포넌트가 없다", () => {
    expect(functionsPhp).toMatch(/'core\/button'/);
  });

  it("컨테이너도 같이 뺀다 — 하나만 빼면 죽은 껍데기가 남는다", () => {
    // core/buttons 만 남으면 삽입은 되는데 자식을 못 받는다 (tester 실측:
    // canInsertButtonsAtRoot true · canInsertButtonIntoButtons false).
    // 열린 것처럼 보이는 잠금이라 잠금의 부재보다 나쁘다.
    expect(functionsPhp).toMatch(/'core\/buttons'/);
  });

  it("거부 목록이다 — 허용 목록을 손으로 적지 않는다", () => {
    // 지금 못 박으면 다음 템플릿마다 풀어야 하고, 코어가 블록을 늘려도 안 따라온다.
    // 등록된 것에서 빼는 형태인지를 본다.
    expect(functionsPhp).toMatch(/WP_Block_Type_Registry::get_instance\(\)->get_all_registered\(\)/);
    expect(functionsPhp).toMatch(/array_diff\(/);
  });

  it("$context 로 분기하지 않는다 — 분기할 대상이 아직 없다", () => {
    const filter = functionsPhp.slice(functionsPhp.indexOf("'allowed_block_types_all'"));
    expect(filter).not.toMatch(/\$context\s*(===|==|->|\[)/);
  });
});

describe("미이식분 이식 (매핑 §4.2.0)", () => {
  // 규칙마다 내려간다. "몇 개 있다"로 세면 하나가 빠져도 안 죽는다 (MyPrivate#6).
  const RULES = [
    [".hero", /min-height:\s*100svh/, "히어로 높이"],
    [".hero", /display:\s*grid/, "h1 폭이 여기서 정해진다"],
    [".hero", /align-content:\s*center/, "세로 중앙"],
    [".hero", /position:\s*relative/, "배경 기준"],
    [".hero", /overflow:\s*clip/, "패럴랙스가 넘치지 않게"],
    [".section + .section", /border-top:\s*1px solid var\(--wp--custom--color--line\)/, "섹션 경계"],
    [".eyebrow", /text-transform:\s*uppercase/, "§5.2 로 잠겨 CSS 만이 길이다"],
    [".eyebrow", /color:\s*var\(--wp--preset--color--ink-faint\)/, "eyebrow 색"],
    [".lead", /color:\s*var\(--wp--preset--color--ink-soft\)/, "리드 색"],
    ["h2", /margin:\s*0 0 var\(--wp--preset--spacing--30\)/, "제목 아래 여백"],
    [".card", /border-top:\s*1px solid var\(--wp--custom--color--line\)/, "카드 경계"],
    [".card h3", /margin:\s*0 0 var\(--wp--preset--spacing--20\)/, "제목 아래 여백 — blockGap 이 .card p 의 margin: 0 에 진다"],
    [".card p", /color:\s*var\(--wp--preset--color--ink-soft\)/, "카드 본문 색"],
    [".journal", /gap:\s*var\(--wp--preset--spacing--50\) var\(--wp--preset--spacing--40\)/, "저널 간격"],
    [".journal__date", /color:\s*var\(--wp--preset--color--ink-faint\)/, "날짜 색"],
    [".journal__item h3", /line-height:\s*var\(--wp--custom--line-height--heading\)/, "저널 제목 행간"],
    [".journal__item h3", /letter-spacing:\s*var\(--wp--custom--letter-spacing--heading\)/, "저널 제목 자간"],
  ];

  for (const [selector, pattern, label] of RULES) {
    it(`${selector} — ${label}`, () => {
      expect(bodyOf(selector)).toMatch(pattern);
    });
  }

  it("규칙 목록이 조용히 줄어들지 않았다", () => {
    expect(RULES).toHaveLength(17);
  });

  // PR-5 가 .link 와 .grid 를 넣었는데 프로퍼티 단언이 하나도 없었다. 변이를 걸다가
  // 찾았다 — .eyebrow 의 uppercase 를 지우려던 것이 .link 의 같은 줄을 지웠고 아무것도
  // 안 죽었다. 그 규칙들이 이 파일에 사는 이상 여기서 같이 지킨다.
  describe("PR-5 가 넣은 .link — 단언이 없었다", () => {
    it("밑줄이 border-bottom 이다 — styles.elements.link 로는 표현이 안 된다", () => {
      const body = bodyOf(".link");
      expect(body).toMatch(/border-bottom:\s*1px solid currentColor/);
      expect(body).toMatch(/text-decoration:\s*none/);
    });

    it("포커스 링이 잉크색 2px 다 — 기본 아웃라인은 근백색 위에서 안 보인다", () => {
      const body = bodyOf(".link:focus-visible");
      expect(body).toMatch(/outline:\s*2px solid var\(--wp--preset--color--ink\)/);
      expect(body).toMatch(/outline-offset:\s*4px/);
    });
  });

  describe("전역 안전망 — WP 가 안 준다", () => {
    // box-sizing 은 .wp-block-group 에만, img 는 :where(img[class*=wp-image-]) 에만 붙는다.
    // 둘 다 컨테이너에서 확인했다. 없으면 패딩이 폭에 더해지고 이미지가 컨테이너를 넘는다.
    it("box-sizing 이 전역이다", () => {
      expect(bodyOf("*::after")).toMatch(/box-sizing:\s*border-box/);
    });

    it("img·video 가 컨테이너를 안 넘는다", () => {
      const body = bodyOf("video");
      expect(body).toMatch(/max-width:\s*100%/);
      expect(body).toMatch(/height:\s*auto/);
    });
  });
});

describe("성능 예산 단위 (테스트 전략 §3.4.3)", () => {
  const budget = JSON.parse(
    readFileSync(new URL("../perf-budget.json", import.meta.url), "utf8"),
  );

  // 회고 §2 가 히어로를 3.3MB 로 쓰는데 그 파일이 3,312,600 바이트다. 십진으로 나눠야
  // 3.31 이 나온다 — 같은 문서가 MB 를 십진으로 쓴다.
  it("초기 전송량이 십진 1,500,000 이다", () => {
    expect(budget.budgets["initial.total"].max).toBe(1_500_000);
  });

  it("전체 전송량이 십진 4,000,000 이다", () => {
    expect(budget.budgets["full.total"].max).toBe(4_000_000);
  });

  it("note 가 십진임을 적는다 — 애매함을 다음 사람에게 넘기지 않는다", () => {
    expect(budget.budgets["initial.total"].note).toMatch(/십진/);
    expect(budget.budgets["full.total"].note).toMatch(/십진/);
  });
});

describe("이미지 (설계 §1·§2)", () => {
  const functionsPhp = readFileSync(
    new URL("../theme/artpsy/functions.php", import.meta.url),
    "utf8",
  );
  const template = readFileSync(
    new URL("../theme/artpsy/templates/index.html", import.meta.url),
    "utf8",
  );

  describe("히어로 아트디렉션", () => {
    it("hero-portrait 사이즈를 등록한다 — 세로 파일을 하드코딩하지 않는 이유다", () => {
      // 하드코딩하면 편집자가 히어로를 바꿔도 모바일만 옛 이미지로 남는다.
      // 화면은 멀쩡히 뜨고 폰에서만 다른 그림이 나온다.
      expect(functionsPhp).toMatch(
        /add_image_size\(\s*'hero-portrait',\s*1080,\s*1440,\s*true\s*\)/,
      );
    });

    it("첨부가 있으면 같은 첨부의 크롭을 쓴다", () => {
      expect(functionsPhp).toMatch(/wp_get_attachment_image_url\(\s*\$id,\s*'hero-portrait'\s*\)/);
    });

    it("첨부가 없으면 테마 자산으로 떨어진다 — 시드도 아트디렉션이 된다", () => {
      expect(functionsPhp).toMatch(/hero-codes-1080x1440\.webp/);
    });

    it("media 조건이 Phase 1 과 같다", () => {
      expect(functionsPhp).toContain("(orientation: portrait), (max-width: 768px)");
    });

    it("히어로 블록만 감싼다 — 저널 썸네일은 코어에 맡긴다", () => {
      expect(functionsPhp).toMatch(/'hero__media-block'/);
    });
  });

  describe("저널 썸네일 — 코어에 맡긴다 (설계 §2)", () => {
    it("템플릿에 sizes 상수가 없다", () => {
      // sizes 상수는 Phase 2 에서 살아남지 않는다. 옮기는 것은 값이 아니라 유도식이고,
      // 298px 은 애초에 틀린 값이었다 (266px 이 맞다, 매핑 §4.5).
      expect(template).not.toMatch(/\bsizes=/);
      expect(template).not.toContain("298px");
      expect(template).not.toContain("266px");
    });

    it("썸네일이 코어 image 블록이다", () => {
      expect(template).toMatch(/wp:image[^>]*journal__thumb-block/);
    });

    it("시드에는 srcset 이 없다 — 첨부가 아니면 코어가 못 만든다", () => {
      // "코어에 맡긴다"가 성립하는 것은 편집자가 올린 첨부에 한해서다. 테마 파일은
      // 첨부가 아니라 srcset·sizes 가 아예 안 생긴다. 안 쓰이는 폭 변형을 같이 넣으면
      // "반응형이 된다"는 착각만 남으므로 넣지 않는다.
      expect(template).not.toMatch(/\bsrcset=/);
      expect(existsSync(new URL("../theme/artpsy/assets/img/journal/journal-01-600.webp", import.meta.url))).toBe(false);
    });
  });

  describe("시드 이미지", () => {
    it("alt 가 빈 문자열이다 — 인접 h3 가 내용을 전달한다 (설계 §5)", () => {
      const imgs = [...template.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
      expect(imgs.length).toBeGreaterThan(0);
      expect(imgs.filter((tag) => !/alt=""/.test(tag))).toEqual([]);
    });

    it("src·alt 뿐이다 — 그 밖의 속성은 블록을 무효로 만든다", () => {
      // core/image 의 save() 가 <img> 에 내는 것은 src 와 alt 뿐이다. class 는 첨부일 때의
      // wp-image-N 과 테두리에서만 나오고, width·height 는 블록 주석의 속성이라
      // 인라인 style 로 나가지 HTML 속성이 되지 않는다 (WP 7.0.4 block-library.js save26).
      // 검증은 속성 **개수**부터 보므로 하나만 더 있어도 has-warning 이 붙고, 편집자가
      // 그 이미지를 클릭하면 "블록 복구"가 떠서 마크업이 save() 출력으로 덮인다.
      const imgs = [...template.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
      const names = imgs.map((tag) => [...tag.matchAll(/\s([a-zA-Z-]+)=/g)].map((m) => m[1]).sort());
      expect(names).toEqual(imgs.map(() => ["alt", "src"]));
    });
  });

  describe("이미지 CSS 넷", () => {
    // 선택자가 클래스에서 구조로 바뀌었다. <img> 는 저장 마크업에 클래스를 못 들기
    // 때문이고(위 "src·alt 뿐이다"), 대조하는 선언 목록은 그대로 간다.
    const HERO_MEDIA = ".hero .hero__media-block img";
    const JOURNAL_THUMB = ".journal__thumb-block img";

    const RULES = [
      [HERO_MEDIA, /object-fit:\s*cover/, "박스를 채운다"],
      [HERO_MEDIA, /top:\s*-10%/, "main.js 의 yPercent: 12 와 묶여 있다"],
      [HERO_MEDIA, /height:\s*120%/, "패럴랙스가 들어갈 여유"],
      // width·height 속성을 뺀 뒤 히어로가 CLS 를 안 만드는 근거가 이 한 줄이다 — 흐름
      // 밖이라 파일이 늦게 와도 아래 것을 밀지 않는다.
      [HERO_MEDIA, /position:\s*absolute/, "흐름 밖이라 예약 박스가 필요 없다"],
      [".hero picture", /display:\s*contents/, "figure·picture 를 접어 그리드 아이템으로"],
      [".hero::after", /pointer-events:\s*none/, "글 위 그라디언트가 클릭을 안 먹는다"],
      [JOURNAL_THUMB, /aspect-ratio:\s*4 \/ 3/, "예약 박스가 파일 도착에 의존하지 않게"],
      [JOURNAL_THUMB, /object-fit:\s*cover/, "비율 고정 후 채움"],
    ];

    for (const [selector, pattern, label] of RULES) {
      it(`${selector} — ${label}`, () => {
        expect(bodyOf(selector)).toMatch(pattern);
      });
    }

    it("규칙 목록이 조용히 줄어들지 않았다", () => {
      expect(RULES).toHaveLength(8);
    });
  });

  describe("자산", () => {
    const img = new URL("../theme/artpsy/assets/img/", import.meta.url);

    for (const name of ["hero-codes-2560.webp", "hero-codes-1080x1440.webp"]) {
      it(`${name} 이 테마 아래 있다`, () => {
        expect(existsSync(new URL(name, img))).toBe(true);
      });
    }

    it("원본 JPEG 를 안 옮겼다 — 3.3MB 이고 서빙되지 않는다", () => {
      expect(existsSync(new URL("hero-codes.jpg", img))).toBe(false);
    });
  });
});

describe("flow 마진 (매핑 §4.2.4)", () => {
  // 이 가족의 정의는 **문법이 아니라 기전**이다 — WP flow 가 얹는 세로 마진을 되돌리는 규칙.
  //
  // 처음에는 `margin-block: 0` 이라는 문자열로 식구를 셌다. 그래서 같은 일을 하면서 형태가
  // `margin: 0` 인 .card p 가 집합 밖에 있었고, 그 줄을 지우면 카드 간격이 16 에서 24 로
  // 바뀌는데 스위트는 통과했다 (tester 실측, ARTPSY-96R §6).
  //
  // 이번 라운드에 같은 모양이 네 번째다. 열거의 기준을 표면 형태로 잡으면 그 형태를 안 가진
  // 식구가 조용히 빠진다 — 가르는 쪽, 표의 행, 표의 수, 그리고 이번엔 정규식.
  const MECHANISM = [
    [".grid > *", /margin-block:\s*0/, "gap 위에 세로 간격이 한 번 더 붙는다"],
    [".hero > *", /margin-block:\s*0/, "align-content: center 라 24px 이 콘텐츠를 12px 민다"],
    // 세미콜론까지 본다. /margin:\s*0/ 만으로는 `margin: 0 0 24px` 도 통과하는데 그건
    // 마진을 끈 것이 아니라 다시 켠 것이고 간격이 또 24 가 된다.
    [".card p", /margin:\s*0;/, "코어 blockGap 24px 이 이 줄에 진다 — 지우면 카드 간격이 16 이 아니라 24 다"],
    // PR-3 이 헤더 파트를 얹으면서 <main> 이 두 번째 형제가 됐다. 히어로가 100svh 라
    // 그 24px 이 그대로 첫 화면을 밀어내고, 헤더를 fixed 로 띄운 이유가 사라진다.
    [".wp-site-blocks > *", /margin-block:\s*0/, "헤더 파트 때문에 main 이 두 번째 형제가 된다 — 24px 이 첫 화면을 민다"],
  ];

  for (const [selector, pattern, why] of MECHANISM) {
    it(`${selector} — ${why}`, () => {
      expect(
        bodyOf(selector),
        `${selector} 는 WP flow 가 얹는 세로 마진을 되돌리는 자리다. ${why}. ` +
          `코어가 같은 일을 하는 것처럼 보여서 군더더기로 읽히기 쉬운 줄이다.`,
      ).toMatch(pattern);
    });
  }

  it("가족이 넷이다", () => {
    expect(MECHANISM).toHaveLength(4);
  });

  // 위는 기전으로 닫고 아래는 문법으로 닫는다. 둘은 다른 것을 지킨다.
  //
  // 아래가 지키는 것은 `margin-block: 0` 을 전역으로 확장하지 않는 것이다 — 고정 덩어리
  // 안의 eyebrow-h1-메타 간격이 그 마진에 기대고 있어서 전역으로 끄면 거기가 무너진다.
  //
  // .card p 는 `margin: 0` 이라 여기 안 걸린다. **그것이 의도다.** 이 단언이 세는 것은
  // 가족의 수가 아니라 `margin-block: 0` 을 쓴 자리의 수다. 형태를 맞추려고 .card p 를
  // margin-block 으로 고쳐 쓰지 않는다 — base.css:151 의 1:1 이식이 우선이다.
  const MARGIN_BLOCK_TARGETS = [".grid > *", ".hero > *", ".wp-site-blocks > *"];

  it("margin-block: 0 은 세 곳뿐이다 — 전역으로 끄지 않는다", () => {
    const hits = [...withoutComments.matchAll(/([^{}]+)\{[^}]*margin-block:\s*0[^}]*\}/g)]
      .map((m) => m[1].trim());
    expect(hits.sort()).toEqual([...MARGIN_BLOCK_TARGETS].sort());
  });
});

describe("히어로 메타 (매핑 §4.2.0)", () => {
  const template = readFileSync(
    new URL("../theme/artpsy/templates/index.html", import.meta.url),
    "utf8",
  );

  const RULES = [
    [/display:\s*flex/, "가로 한 줄"],
    [/gap:\s*var\(--wp--preset--spacing--40\)/, "코어 flex 의 blockGap 을 덮는다"],
    [/margin-top:\s*var\(--wp--preset--spacing--50\)/, "h1 과의 간격"],
    [/text-transform:\s*uppercase/, "§5.2 로 잠겨 CSS 만이 길이다"],
    [/color:\s*var\(--wp--preset--color--ink-faint\)/, "메타 색"],
    [/letter-spacing:\s*var\(--wp--custom--letter-spacing--meta\)/, "메타 자간"],
  ];

  for (const [pattern, label] of RULES) {
    it(`.hero__meta — ${label}`, () => {
      expect(bodyOf(".hero__meta")).toMatch(pattern);
    });
  }

  it("규칙 목록이 조용히 줄어들지 않았다", () => {
    expect(RULES).toHaveLength(6);
  });

  it("gap·margin 이 리터럴이 아니다 — 프리셋으로 나온다", () => {
    const body = bodyOf(".hero__meta");
    expect(body).not.toMatch(/gap:\s*[\d.]+(rem|px)/);
    expect(body).not.toMatch(/margin-top:\s*[\d.]+(rem|px)/);
  });

  it("메타 문자열 셋이 Phase 1 그대로다 — 그 자리는 디자인 요소다", () => {
    for (const text of ["Seoul", "Since 2026", "By appointment"]) {
      expect(template).toContain(`<p>${text}</p>`);
    }
  });
});

describe("사이트 헤더 (PR-3)", () => {
  // 헤더가 흐름에 들어가면 min-height: 100svh 인 히어로가 그만큼 밀려 첫 화면
  // 풀블리드가 깨진다. 그리고 LCP 조사에서 8px 짜리 흐름 헤더 하나가 LCP 후보를
  // 뒤집었다 — fixed 는 같은 조작에서 안 뒤집었고 기하는 셋 다 같았다.
  //
  // 셋을 따로 단언한다. position 만 보면 z-index 가 빠져도 통과하는데, .hero 가
  // position: relative 라 헤더와 같은 층에 그려지고 DOM 에서 뒤라 그때 히어로가
  // 헤더를 덮는다 — "헤더가 있는데 안 보인다"가 된다.
  const RULES = [
    [/position:\s*fixed/, "흐름 밖으로 뺀다 — 히어로가 밀리지 않게"],
    [/z-index:\s*\d/, ".hero 가 relative 라 없으면 히어로가 헤더를 덮는다"],
    [/top:\s*0/, "화면 위에 붙인다"],
  ];

  for (const [pattern, label] of RULES) {
    it(`.site-header — ${label}`, () => {
      expect(bodyOf(".site-header")).toMatch(pattern);
    });
  }

  it("규칙 목록이 조용히 줄어들지 않았다", () => {
    expect(RULES).toHaveLength(3);
  });

  it("가로 패딩이 루트 패딩이다 — 헤더가 흐름 밖이라 has-global-padding 이 안 걸린다", () => {
    // 안 맞추면 로고가 히어로 콘텐츠와 다른 선에서 시작한다. 값을 리터럴로 적으면
    // theme.json 의 clamp 과 두 벌이 되어 갈린다.
    const body = bodyOf(".site-header");
    expect(body).toContain("var(--wp--style--root--padding-left)");
    expect(body).toContain("var(--wp--style--root--padding-right)");
  });
});
