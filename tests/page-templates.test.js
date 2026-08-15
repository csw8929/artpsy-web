// 페이지 다섯의 L1 계약. "파일이 그렇게 적혀 있나"까지가 여기고, "그 URL 이 200 이고
// 그 템플릿이 골렸나"는 `npm run smoke` 가 본다 (PR2-SMOKE §1).
//
// 정본은 `smoke/pages.mjs` 하나다. 이 파일은 슬러그를 다시 적지 않고 **거기서 읽어서**
// 대조한다 — 두 곳에 적으면 갈리고, 갈린 쪽이 어디인지는 아무도 안 본다 (PR4-PAGES §1).
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { PAGES, NAV_PAGES, pathOf, templateOf, markerOf } from "../smoke/pages.mjs";
import { ROUTES, EXPECTED_ROUTE_COUNT } from "../smoke/routes.mjs";

const read = (relative) => readFileSync(new URL(relative, import.meta.url), "utf8");
const themeJson = JSON.parse(read("../theme/artpsy/theme.json"));
const index = read("../theme/artpsy/templates/index.html");

describe("페이지 다섯", () => {
  // 이 수 둘이 PR 6 에서 갈렸다. 그전에는 "요구사항의 다섯" 과 "시드할 다섯" 이 같은
  // 값이었는데, 처리방침이 템플릿·시드는 필요하고 헤더에는 안 뜨면서 달라졌다.
  // 하나로 합치면 다음에 내비 밖 페이지가 하나 더 늘 때 조용히 통과한다.
  it("내비에 뜨는 것이 다섯이다", () => {
    // 요구사항 §기능 범위의 PHILOSOPHY · INDIVIDUALS / ORGANIZATIONS · CONTACT ·
    // Learning Center 다. **이 수는 안 변한다** — 늘리려면 요구사항 쪽에 근거가 있어야 한다.
    expect(NAV_PAGES).toHaveLength(5);
  });

  it("시드할 것이 여섯이다 — 내비 밖에 처리방침이 있다", () => {
    expect(PAGES).toHaveLength(6);
    expect(PAGES.filter((page) => !page.inNav).map((page) => page.slug)).toEqual(["privacy"]);
  });

  it("슬러그가 겹치지 않는다", () => {
    expect(new Set(PAGES.map((page) => page.slug)).size).toBe(PAGES.length);
  });

  for (const page of PAGES) {
    describe(pathOf(page), () => {
      const file = `../theme/artpsy/templates/${templateOf(page)}.html`;

      it(`${templateOf(page)}.html 이 있다`, () => {
        expect(existsSync(new URL(file, import.meta.url))).toBe(true);
      });

      it(`main 그룹이 ${markerOf(page)} 표식을 든다`, () => {
        // 코어가 className 을 그 요소에 낸다. body class 는 안 쓴다 —
        // "어느 페이지냐"이지 "어느 템플릿이 골렸냐"가 아니다 (PR4-PAGES §2).
        const html = read(file);
        expect(html).toContain(`{"tagName":"main","className":"${markerOf(page)}"`);
        expect(html).toMatch(new RegExp(`<main class="[^"]*\\b${markerOf(page)}\\b`));
      });

      it("헤더·푸터 파트를 부른다", () => {
        // 템플릿마다 따로 불러야 한다. index.html 에 있다고 따라오지 않는다 —
        // 처음에 다섯 다 빠뜨렸고, 브라우저로 재기 전까지 스위트가 통과했다.
        const html = read(file);
        for (const slug of ["header", "footer"]) {
          expect(html, `${templateOf(page)}.html 이 ${slug} 파트를 안 부른다`).toContain(
            `<!-- wp:template-part {"slug":"${slug}"} /-->`,
          );
        }
      });

      it("헤더가 main 앞, 푸터가 뒤다", () => {
        const html = read(file);
        expect(html.indexOf('{"slug":"header"}')).toBeLessThan(html.indexOf("<main"));
        expect(html.indexOf('{"slug":"footer"}')).toBeGreaterThan(html.indexOf("</main>"));
      });

      it("theme.json 이 customTemplates 로 선언한다", () => {
        expect(themeJson.customTemplates).toContainEqual(
          expect.objectContaining({ name: templateOf(page), postTypes: ["page"] }),
        );
      });

      it("smoke 라우트 표에 있다", () => {
        expect(ROUTES).toContainEqual(
          expect.objectContaining({ path: pathOf(page), marker: markerOf(page), expect: true }),
        );
      });
    });
  }

  it("표식이 서로 다르다 — 다섯이 같은 값을 들면 라우트 다섯이 다 통과한다", () => {
    // 복사-붙여넣기로 표식이 겹치면 L2 가 통째로 무력해진다. 라우트는 그것을 못 잡는다.
    expect(new Set(PAGES.map(markerOf)).size).toBe(PAGES.length);
  });

  it("선언에 죽은 항목이 없다 — 파일 없는 customTemplates 는 편집기에서 빈 템플릿이 된다", () => {
    const declared = themeJson.customTemplates.map((one) => one.name);
    const missing = declared.filter(
      (name) => !existsSync(new URL(`../theme/artpsy/templates/${name}.html`, import.meta.url)),
    );
    expect(missing).toEqual([]);
  });
});

describe("라우트 표 (PR2-SMOKE §2-1)", () => {
  it("개수 단언이 표를 따라왔다", () => {
    // 표만 늘리고 세는 곳이 없으면 "장치가 아무것도 안 재는 상태"로 초록불이 난다.
    expect(ROUTES).toHaveLength(EXPECTED_ROUTE_COUNT);
  });

  it("프론트 라우트가 셋이다 — 페이지를 늘리면서 지우지 않았다", () => {
    expect(ROUTES.filter((route) => route.path === "/")).toHaveLength(3);
  });

  it("tpl-home 라우트가 있다 — 겹침이 이 표식에 걸려 있다", () => {
    expect(ROUTES).toContainEqual(
      expect.objectContaining({ path: "/", marker: "tpl-home", expect: true }),
    );
  });
});

describe("메인의 앵커 링크 (PR3-DECIDE §2)", () => {
  // 페이지가 생기면 같은 주제가 두 곳에 있게 된다. 헤더는 /contact/ 로, 카드는 #contact 로
  // 가면 같은 의도의 링크 둘이 다른 곳을 가리킨다.
  it("카드 링크가 페이지로 간다 — 페이지 안 앵커가 남아 있지 않다", () => {
    const cardLinks = [...index.matchAll(/<a class="link" href="([^"]+)"/g)].map((m) => m[1]);
    expect(cardLinks.filter((href) => href.startsWith("#"))).toEqual([]);
  });

  it("가리키는 페이지가 실제로 있는 슬러그다", () => {
    const slugs = new Set(PAGES.map((page) => page.slug));
    const internal = [...index.matchAll(/<a class="link" href="\/([^/"#]+)\//g)].map((m) => m[1]);
    expect(internal.length).toBeGreaterThan(0);
    expect(internal.filter((slug) => !slugs.has(slug))).toEqual([]);
  });

  it("가리키는 앵커가 그 템플릿에 실제로 있다 — 죽은 딥링크를 만들지 않는다", () => {
    // 라벨이 "예약 안내"·"문의하기"·"소식 받기" 라 /contact/ 로 보내면 라벨이 약속한
    // 자리가 그 페이지에 없다. 각 상세 페이지의 해당 절로 보낸다.
    const links = [...index.matchAll(/<a class="link" href="\/([^/"]+)\/#([^"]+)"/g)];
    expect(links).toHaveLength(3);
    for (const [, slug, anchor] of links) {
      const html = read(`../theme/artpsy/templates/page-${slug}.html`);
      expect(html, `page-${slug}.html 에 #${anchor} 가 없다`).toContain(`id="${anchor}"`);
    }
  });

  it("섹션 id 를 남겼다 — 지우면 이 PR 이 딥링크를 죽인다", () => {
    for (const anchor of ["philosophy", "programs", "journal", "contact"]) {
      expect(index).toContain(`id="${anchor}"`);
    }
  });

  it("메인이 tpl-home 표식을 든다 — 겹침이 여기 걸려 있다", () => {
    expect(index).toContain('"className":"tpl-home"');
    expect(index).toMatch(/<main class="[^"]*\btpl-home\b/);
  });
});

describe("시드 — 템플릿 파일만으로는 URL 이 안 생긴다", () => {
  const seed = read("../smoke/seed-pages.mjs");
  const wpEnv = JSON.parse(read("../.wp-env.json"));
  const pkg = JSON.parse(read("../package.json"));

  it("wp-env 가 start 뒤에 부른다 — 클론하고 띄우면 다섯이 눌러진다", () => {
    expect(wpEnv.lifecycleScripts?.afterStart).toContain("seed-pages.mjs");
  });

  it("손으로도 부를 수 있다", () => {
    expect(pkg.scripts["wp:seed"]).toContain("seed-pages.mjs");
  });

  it("슬러그를 다시 안 적는다 — pages.mjs 를 읽는다", () => {
    expect(seed).toMatch(/from "\.\/pages\.mjs"/);
    for (const page of PAGES) {
      expect(seed).not.toContain(`"${page.slug}"`);
    }
  });

  it("이미 있으면 안 만든다 — start 마다 도는 스크립트다", () => {
    expect(seed).toContain("get_page_by_path");
  });

  it("테마가 시드 콘텐츠를 만들지 않는다 — 산출물은 테마이고 페이지는 고객의 것이다", () => {
    // PR 7 이 wp_insert_post 를 하나 들였다. 그건 시드가 아니라 **제품 기능**이다 —
    // 방문자가 보낸 문의를 저장하는 것이고, 그 자리가 테마 말고 어디에도 없다.
    // 그래서 "호출이 없다" 가 아니라 "만드는 것이 문의뿐이다" 로 좁힌다.
    const php = read("../theme/artpsy/functions.php");
    const types = [...php.matchAll(/wp_insert_post\([\s\S]{0,200}?'post_type'\s*=>\s*'([a-z_]+)'/g)].map((m) => m[1]);
    expect(types.length).toBeGreaterThan(0);
    expect([...new Set(types)]).toEqual(["artpsy_inquiry"]);
  });
});

describe("문의 폼 (PR 6) — 마크업까지. 동작은 PR 7 이다", () => {
  const contact = read("../theme/artpsy/templates/page-contact.html");
  const organizations = read("../theme/artpsy/templates/page-organizations.html");
  const privacy = read("../theme/artpsy/templates/page-privacy.html");
  const footer = read("../theme/artpsy/parts/footer.html");
  const functionsPhp = read("../theme/artpsy/functions.php");

  // 빈 그룹은 코어가 "Group blocks together. Select a layout:" 이라는 초대장을 내는데
  // templateLock: all 이 그것을 조용히 거절한다 — functions.php 의 core/buttons 주석이
  // 적어 둔 "열린 것처럼 보이는 잠금" 과 같은 모양이다(tester 가 캔버스에서 클릭해
  // innerCount 0 → 0 을 확인했다). 그래서 자리에 설명 문단을 두고 렌더에서 갈아끼운다.
  it("캔버스에 설명 문단이 있다 — 빈 상자도 초대장도 아니다", () => {
    expect(contact).toContain('"className":"contact-form__hint"');
    expect(contact).toMatch(/편집 화면에는 안 보입니다/);
  });

  it("그 문단이 잠겨 있다 — 지우면 폼이 조용히 사라지고 200 은 그대로다", () => {
    const hint = contact.slice(contact.indexOf('"className":"contact-form__hint"'));
    expect(hint.slice(0, 120)).toContain('"lock":{"move":true,"remove":true}');
  });

  it("렌더가 안쪽을 갈아끼운다 — 덧붙이면 설명이 프런트에 남는다", () => {
    // smoke 의 "프런트에 설명 문구가 없다" 가 이것의 짝이다. 그건 문구 확인이 아니라
    // **주입 실패 경보** 다 — 필터가 죽으면 화면은 멀쩡해 보이고 설명만 남는다.
    expect(functionsPhp).toContain("preg_replace_callback");
    expect(functionsPhp).not.toMatch(/artpsy_contact_form_html\(\)\s*\.\s*'<\/div>'/);
  });

  it("폼이 템플릿에 리터럴로 없다 — nonce 를 서버가 낸다", () => {
    // 정적 파일에 nonce 를 적어 두면 그 값이 굳고, "nonce 없이 POST 하면 안 들어간다"
    // (PR 7 의 판정 4)를 잴 수 없게 된다.
    expect(contact).not.toMatch(/<form/);
    expect(contact).not.toContain("_wpnonce");
    expect(contact).toContain('"className":"contact-form"');
  });

  it("자리가 잠겨 있다 — 편집자가 안을 채우면 주입한 폼과 겹친다", () => {
    const slot = contact.slice(contact.indexOf('"className":"contact-form"') - 40);
    expect(slot.slice(0, 200)).toContain('"templateLock":"all"');
  });

  it("렌더에서 주입한다 — 히어로 <picture> 와 같은 기법이다", () => {
    expect(functionsPhp).toContain("artpsy_contact_form_html");
    expect(functionsPhp).toMatch(/wp_nonce_field\(\s*'artpsy_contact'/);
    expect(functionsPhp).toMatch(/in_array\(\s*'contact-form',\s*\$classes,\s*true\s*\)/);
  });

  it("두 번 넣지 않는다", () => {
    expect(functionsPhp).toMatch(/strpos\(\s*\$content,\s*'contact-form__form'\s*\)/);
  });

  it("JS 가 안 낀다 — <form method=post> 하나로 선다", () => {
    // 이 테마의 "JS 실패가 백지가 되면 안 된다" 가 여기서는 "JS 없이도 보내진다" 다.
    const form = functionsPhp.slice(functionsPhp.indexOf("function artpsy_contact_form_html"));
    expect(form.slice(0, 3000)).toContain('method="post"');
    expect(form.slice(0, 3000)).not.toMatch(/onsubmit|addEventListener|fetch\(/);
  });

  it("받는 것이 셋뿐이다 — 처리방침에 적은 것과 같아야 한다", () => {
    // 이름이 하나 늘면 처리방침의 "수집하는 항목" 과 갈린다. 갈린 쪽은 화면에 안 보인다.
    const start = functionsPhp.indexOf("function artpsy_contact_form_html");
    const form = functionsPhp.slice(start, functionsPhp.indexOf("add_filter", start));
    // 두 자리를 따로 본다. $fields 배열이 도는 둘, 리터럴로 박힌 셋.
    const fieldsAt = form.indexOf("$fields = array(");
    const fieldsBlock = form.slice(fieldsAt, form.indexOf(");", fieldsAt));
    expect([...fieldsBlock.matchAll(/'(artpsy_[a-z_]+)'/g)].map((m) => m[1])).toEqual([
      "artpsy_name",
      "artpsy_email",
    ]);

    const literal = [...form.matchAll(/name="(artpsy_[a-z_]+)"/g)].map((m) => m[1]);
    expect([...new Set(literal)].sort()).toEqual([
      "artpsy_consent",
      "artpsy_contact", // 제출 표식 (hidden)
      "artpsy_message",
    ]);
  });

  it("동의 체크박스가 required 다", () => {
    const form = functionsPhp.slice(functionsPhp.indexOf("artpsy_consent"));
    expect(form.slice(0, 400)).toContain("required");
  });

  it("동의 라벨이 처리방침으로 간다", () => {
    expect(functionsPhp).toContain('href="/privacy/"');
  });

  it("푸터에 처리방침 링크가 있다", () => {
    expect(footer).toContain('href="/privacy/"');
  });

  it("처리방침이 자리표시자라고 페이지에 적혀 있다 — 주석이 아니다", () => {
    // 공개된 포트폴리오다. 그럴듯한 가짜 처리방침이 제일 나쁘다.
    expect(privacy).toContain("자리표시자");
    expect(privacy).toMatch(/미정/);
  });

  it("처리방침에 없는 사실을 안 적었다", () => {
    // 실제 값이 없는데 있는 것처럼 읽히는 것이 자리표시자보다 나쁘다.
    for (const word of ["사업자등록번호", "대표자", "전화"]) {
      expect(privacy).not.toContain(word);
    }
  });

  it("폼이 한 곳뿐이다 — /organizations/#inquiry 에는 없다", () => {
    // 폼이 둘이면 PR 7 의 판정(행이 정확히 하나 는다)이 어느 폼인지 모르게 된다
    // (PR4-ACK §4).
    const section = organizations.slice(organizations.indexOf('id="inquiry"'));
    expect(section).not.toMatch(/<form|<input|<textarea/);
    expect(section).not.toContain('"className":"contact-form"');
  });
});

describe("smoke 가 응답을 본다 (PR6-CONTACT-FORM §7)", () => {
  const smoke = read("../smoke/smoke.mjs");

  it("폼·nonce·동의 required 를 응답에서 확인한다", () => {
    // 파일을 보는 단언으로는 "주입이 실제로 돌았나" 를 못 잡는다. nonce 는 정적 파일에
    // 아예 없으므로 응답을 보는 검사가 유일한 길이다.
    expect(smoke).toContain("checkContactForm");
    expect(smoke).toContain("artpsy_contact_nonce");
    expect(smoke).toContain("artpsy-consent");
  });
});

describe("폼 처리 (PR 7) — L1. 도는지는 smoke 가 본다", () => {
  const functionsPhp = read("../theme/artpsy/functions.php");
  const smoke = read("../smoke/smoke.mjs");
  const contact = read("../smoke/contact.mjs");

  // 'artpsy_inquiry' 는 저장 함수에도 나온다. 첫 등장으로 자르면 등록 블록이 아니라
  // 그쪽을 보게 되고, 아래 단언 다섯이 전부 엉뚱한 곳을 읽으면서 실패한다.
  const registration = (() => {
    let at = -1;
    while ((at = functionsPhp.indexOf("register_post_type(", at + 1)) !== -1) {
      const block = functionsPhp.slice(at, at + 1400);
      if (block.includes("'artpsy_inquiry'")) return block;
    }
    return "";
  })();

  describe("저장소", () => {
    it("등록 블록을 실제로 찾았다", () => {
      // 못 찾으면 아래가 통째로 빈 문자열을 보고 조용히 실패한다.
      expect(registration).toContain("'artpsy_inquiry'");
    });

    it("커스텀 포스트 타입이다 — 테이블을 만들지 않는다", () => {
      // 테마가 테이블을 만들면 테마를 갈 때 데이터가 고아가 된다. 산출물은 테마고
      // 문의는 고객 데이터다 (PR 4 에서 페이지를 테마에 안 넣은 것과 같은 이유).
      expect(functionsPhp).toMatch(/register_post_type\(\s*\n?\s*'artpsy_inquiry'/);
      expect(functionsPhp).not.toContain("dbDelta");
      expect(functionsPhp).not.toMatch(/CREATE TABLE/i);
    });

    // 이 사이트에서 유일하게 남의 개인정보가 들어오는 자리다. 넷을 따로 단언한다 —
    // 하나만 빠져도 나머지 셋이 통과하고, 새는 것은 화면에 안 보인다.
    const CLOSED = [
      [/'public'\s*=>\s*false/, "공개 쿼리 대상이 아니다"],
      [/'publicly_queryable'\s*=>\s*false/, "URL 로 안 열린다"],
      [/'exclude_from_search'\s*=>\s*true/, "사이트 검색에 안 뜬다"],
      [/'show_in_rest'\s*=>\s*false/, "REST 로 안 샌다"],
    ];

    for (const [pattern, label] of CLOSED) {
      it(`artpsy_inquiry — ${label}`, () => {
        expect(registration).toMatch(pattern);
      });
    }

    it("닫는 값 목록이 조용히 줄어들지 않았다", () => {
      expect(CLOSED).toHaveLength(4);
    });

    it("관리자는 볼 수 있다 — 안 보이면 문의가 도착해도 아무도 모른다", () => {
      expect(registration).toMatch(/'show_ui'\s*=>\s*true/);
    });
  });

  describe("검증", () => {
    // required 는 브라우저 것이다. POST 는 폼 없이도 온다.
    const CHECKS = [
      [/wp_verify_nonce\(/, "nonce"],
      [/empty\(\s*\$raw\['artpsy_consent'\]\s*\)/, "동의"],
      [/is_email\(/, "이메일"],
      [/mb_substr\(/, "길이 상한을 서버에서도 자른다"],
    ];

    for (const [pattern, label] of CHECKS) {
      it(`서버에서 ${label} 를 본다`, () => {
        expect(functionsPhp).toMatch(pattern);
      });
    }

    it("검증 목록이 조용히 줄어들지 않았다", () => {
      expect(CHECKS).toHaveLength(4);
    });

    it("살균만 하고 저장할 때 이스케이프하지 않는다", () => {
      // 이스케이프된 값이 DB 에 들어가면 관리 화면과 메일에서 &amp; 가 보이고,
      // 그때는 원본이 무엇이었는지 알 방법이 없다.
      const store = functionsPhp.slice(functionsPhp.indexOf("function artpsy_store_inquiry"));
      expect(store.slice(0, 1200)).not.toMatch(/esc_html\(|esc_attr\(/);
      expect(functionsPhp).toMatch(/sanitize_text_field\(/);
      expect(functionsPhp).toMatch(/sanitize_email\(/);
      expect(functionsPhp).toMatch(/sanitize_textarea_field\(/);
    });
  });

  describe("흐름", () => {
    it("성공은 302 다 — 새로고침이 재전송이 되면 안 된다", () => {
      expect(functionsPhp).toMatch(/wp_safe_redirect\(\s*add_query_arg\(\s*'artpsy_sent'/);
    });

    it("실패는 리다이렉트하지 않는다 — 입력을 잃으면 안 된다", () => {
      const handler = functionsPhp.slice(functionsPhp.indexOf("'template_redirect'"));
      const upToRedirect = handler.slice(0, handler.indexOf("wp_safe_redirect"));
      expect(upToRedirect).toContain("artpsy_contact_state( $checked )");
      expect(upToRedirect).toMatch(/return;/);
    });

    it("폼이 이전 값과 에러를 받는다", () => {
      expect(functionsPhp).toMatch(/function artpsy_contact_form_html\(\s*array \$values = array\(\), array \$errors = array\(\)\s*\)/);
    });

    it("동의는 되살리지 않는다 — 매번 새로 받는 것이 동의다", () => {
      const consent = functionsPhp.slice(functionsPhp.indexOf("artpsy-consent"));
      expect(consent.slice(0, 600)).not.toContain("checked");
    });

    it("JS 가 안 낀다", () => {
      const form = functionsPhp.slice(functionsPhp.indexOf("function artpsy_contact_form_html"));
      expect(form.slice(0, 4000)).not.toMatch(/onsubmit|addEventListener|fetch\(/);
    });
  });

  describe("알림", () => {
    it("저장이 먼저다 — 문의를 잃는 것이 알림을 잃는 것보다 나쁘다", () => {
      const store = functionsPhp.slice(functionsPhp.indexOf("function artpsy_store_inquiry"));
      expect(store.indexOf("wp_insert_post")).toBeLessThan(store.indexOf("wp_mail"));
    });

    it("실패가 조용하지 않다 — wp_mail 은 예외를 안 던진다", () => {
      expect(functionsPhp).toMatch(/if \(\s*! \$sent\s*\)/);
      expect(functionsPhp).toContain("_artpsy_mail_failed");
    });

    it("수신자가 하드코딩이 아니다", () => {
      expect(functionsPhp).toMatch(/get_option\(\s*'admin_email'\s*\)/);
    });
  });

  describe("smoke 가 여덟을 본다 (PR7-FORM-PROCESS §5)", () => {
    it("검사가 배선돼 있다", () => {
      expect(smoke).toContain("checkContactSubmission");
    });

    // 다섯이 "안 늘어나는 것" 을 재는데 그건 "아무 일도 안 일어남" 과 구분이 안 된다.
    // 유효한 제출이 실제로 늘리는 것을 같은 회차에서 재는지가 이 파일의 핵심이다.
    const JUDGMENTS = [
      ["302", "유효한 제출이 리다이렉트한다"],
      ["contact-form__sent", "따라간 페이지에 성공 표식이 있다"],
      ["정확히 1", "행이 하나 는다"],
      ["nonce 없이", "nonce 없으면 안 는다"],
      ["동의 없이", "동의 없으면 안 는다"],
      ["이메일이 틀린", "이메일이 틀리면 안 늘고 값이 남는다"],
      ["pre_wp_mail", "알림 훅이 발동했다"],
      ["show_in_rest", "밖에서 안 보인다"],
    ];

    for (const [needle, label] of JUDGMENTS) {
      it(label, () => {
        expect(contact).toContain(needle);
      });
    }

    it("여덟이다", () => {
      expect(JUDGMENTS).toHaveLength(8);
    });

    it("만든 것을 지운다 — smoke 가 DB 를 어지럽히지 않는다", () => {
      expect(contact).toContain("wp_delete_post");
      expect(contact).toContain("before.includes(id)");
    });
  });
});
