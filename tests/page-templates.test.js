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

  it("테마가 콘텐츠를 만들지 않는다 — 산출물은 테마이고 페이지는 고객의 것이다", () => {
    expect(read("../theme/artpsy/functions.php")).not.toContain("wp_insert_post");
  });
});

describe("문의 폼 (PR 6) — 마크업까지. 동작은 PR 7 이다", () => {
  const contact = read("../theme/artpsy/templates/page-contact.html");
  const organizations = read("../theme/artpsy/templates/page-organizations.html");
  const privacy = read("../theme/artpsy/templates/page-privacy.html");
  const footer = read("../theme/artpsy/parts/footer.html");
  const functionsPhp = read("../theme/artpsy/functions.php");

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
    const names = [...form.matchAll(/'(artpsy_[a-z_]+)'/g)].map((m) => m[1]);
    expect([...new Set(names)].sort()).toEqual([
      "artpsy_contact", // 제출 표식 (hidden)
      "artpsy_contact_nonce",
      "artpsy_email",
      "artpsy_name",
    ]);
    // 배열 밖에 리터럴로 있는 둘.
    expect(form).toContain('name="artpsy_message"');
    expect(form).toContain('name="artpsy_consent"');
    expect(form).not.toMatch(/name="artpsy_(?!name|email|message|consent|contact")/);
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
