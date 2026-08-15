// 관리자 매뉴얼 대조. **문서라고 "있다" 로 때우지 않는다** — 매뉴얼은 이 저장소에서
// 가장 빨리 썩는 문서이고, 썩어도 아무것도 안 깨지기 때문에 아무도 모른다.
//
// 그래서 매뉴얼에 **글자로 적힌 것**을 코드에서 뽑은 것과 맞춘다. 화면 캡처를 안 넣은
// 이유가 이것이다 — 캡처는 대조할 수가 없다.
//
// 여기서 못 닫는 것: "그 주소가 실제로 열리는가"(로그인이 필요하다)는 smoke 가 본다.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { PAGES, pathOf } from "../smoke/pages.mjs";
import { ARCHIVE_PATH } from "../smoke/journal.mjs";

const read = (relative) => readFileSync(new URL(relative, import.meta.url), "utf8");
const manual = read("../docs/20260815_관리자-매뉴얼.md");
const functionsPhp = read("../theme/artpsy/functions.php");

describe("매뉴얼이 코드와 맞는다", () => {
  it("파일이 규약대로 있다", () => {
    // 날짜 접두 · docs/ 아래. 소스 디렉토리에 문서를 안 만든다.
    const files = readdirSync(new URL("../docs/", import.meta.url));
    expect(files).toContain("20260815_관리자-매뉴얼.md");
  });

  it("화면 캡처가 없다 — 캡처는 대조할 수 없다", () => {
    expect(manual).not.toMatch(/!\[[^\]]*\]\(/);
    expect(manual).not.toMatch(/\.(png|jpe?g|gif|webp)\b/i);
  });

  describe("적어 둔 주소가 실재한다", () => {
    // 매뉴얼에서 관리 화면 경로를 뽑아, 그것을 만드는 코드가 있는지 본다.
    const paths = [...manual.matchAll(/`\/wp-admin\/([^`]+)`/g)].map((m) => m[1]);

    it("주소를 실제로 뽑았다", () => {
      expect(paths.length).toBeGreaterThanOrEqual(4);
    });

    for (const path of new Set(paths)) {
      it(`/wp-admin/${path}`, () => {
        const postType = path.match(/post_type=([a-z_]+)/);
        if (postType) {
          // 그 포스트 타입을 등록하는 코드가 있어야 한다.
          expect(functionsPhp).toContain(`'${postType[1]}'`);
          return;
        }

        const page = path.match(/[?&]page=([a-z-]+)/);
        if (page) {
          expect(functionsPhp).toContain(`'${page[1]}'`);
          return;
        }

        // 코어 화면(index.php 등)은 코드에 없다. 형태만 본다.
        expect(path).toMatch(/^[a-z-]+\.php/);
      });
    }
  });

  describe("적어 둔 페이지 주소가 정본과 같다", () => {
    // 슬러그의 정본은 smoke/pages.mjs 다. 매뉴얼이 두 번째 사본이 되면 갈라진다.
    for (const page of PAGES) {
      it(pathOf(page), () => {
        expect(manual).toContain(`\`${pathOf(page)}\``);
      });
    }

    it("저널 아카이브 주소도 같다", () => {
      expect(manual).toContain(`\`${ARCHIVE_PATH}\``);
    });

    it("없는 페이지 주소를 안 적었다", () => {
      const known = new Set([...PAGES.map(pathOf), ARCHIVE_PATH, "/", "/journal/글주소/"]);
      const mentioned = [...manual.matchAll(/`(\/[a-z0-9가-힣-]*\/)`/g)].map((m) => m[1]);
      expect(mentioned.filter((one) => !known.has(one))).toEqual([]);
    });
  });

  describe("자리표시자 목록이 실제와 같다 (PR12-MANUAL §6-4)", () => {
    // **하나라도 빠지거나 남으면 실패한다.** 이 목록이 매뉴얼의 제일 큰 값이라,
    // 실제 자리표시자를 템플릿에서 뽑아 대조한다 — 매뉴얼끼리 베끼면 같이 틀린다.
    const templates = readdirSync(new URL("../theme/artpsy/templates/", import.meta.url))
      .filter((name) => name.endsWith(".html"));

    const withPlaceholder = templates.filter((name) =>
      /아직 정해지지 않았습니다|자리표시자/.test(read(`../theme/artpsy/templates/${name}`)),
    );

    it("자리표시자가 있는 템플릿을 실제로 찾았다", () => {
      expect(withPlaceholder.length).toBeGreaterThan(0);
    });

    const EXPECTED_FILES = [
      "page-contact.html",
      "page-individuals.html",
      "page-organizations.html",
      "page-privacy.html",
    ];

    it("자리표시자가 있는 템플릿이 넷이다 — 늘면 매뉴얼 §9 도 늘어야 한다", () => {
      expect(withPlaceholder.sort()).toEqual(EXPECTED_FILES);
    });

    // 매뉴얼 §9 의 표. 왼쪽이 비어 있는 것, 오른쪽이 채우는 자리다.
    const rows = [...manual.matchAll(/^\| ([^|]+) \| ([^|]+) \|$/gm)]
      .map(([, left, right]) => [left.trim(), right.trim()])
      .filter(([, right]) => /페이지 >|설정 >/.test(right));

    it("표를 실제로 뽑았다", () => {
      expect(rows.length).toBeGreaterThanOrEqual(5);
    });

    it("채우는 자리가 전부 적혀 있다 — '무엇을' 만 적으면 못 찾는다", () => {
      expect(rows.filter(([, right]) => right.length < 8)).toEqual([]);
    });

    it("자리표시자가 있는 페이지가 전부 표에 있다", () => {
      const mentions = rows.map((row) => row.join(" ")).join("\n");
      const NEEDED = ["처리방침", "오시는 길", "FAQ", "예약", "태그라인"];
      expect(NEEDED.filter((word) => !mentions.includes(word))).toEqual([]);
    });
  });

  describe("지어낸 사실 0 (PR12-MANUAL §6-5)", () => {
    // 매뉴얼이 예시로라도 주소·전화·가격을 적으면 그것이 사실처럼 읽힌다.
    const FORBIDDEN = [
      [/0\d{1,2}-\d{3,4}-\d{4}/, "전화번호"],
      [/\d{1,3},?\d{3}\s*원/, "금액"],
      [/\d+\s*번지|\d+층|\d+호\b/, "주소"],
      [/자격증|학위|경력\s*\d+년/, "자격·실적"],
    ];

    for (const [pattern, label] of FORBIDDEN) {
      it(`${label} 가 없다`, () => {
        expect(manual).not.toMatch(pattern);
      });
    }

    it("금지 목록이 조용히 줄어들지 않았다", () => {
      expect(FORBIDDEN).toHaveLength(4);
    });
  });

  describe("권한 설명이 코드와 맞는다 (PR12-MANUAL §6-6)", () => {
    it("편집자가 못 보는 것 셋을 적었다", () => {
      // #40 · #45 가 세운 경계다. 매뉴얼이 틀리게 적으면 클라이언트가 편집자에게
      // 문의 열람을 기대하거나 그 반대가 된다.
      for (const word of ["문의", "팝업", "대시보드 위젯"]) {
        expect(manual).toContain(word);
      }
      expect(manual).toMatch(/편집자.*403|403.*편집자/s);
    });

    it("코드가 실제로 manage_options 로 잠갔다", () => {
      expect(functionsPhp).toMatch(/'read_private_posts'\s*=>\s*'manage_options'/);
      expect(functionsPhp).toMatch(/add_options_page\([\s\S]{0,200}'manage_options'/);
    });
  });

  describe("없는 기능을 적었다 (PR12-MANUAL §5)", () => {
    const MISSING = ["답장", "CSV", "보관 기간", "스팸", "노출 규칙"];

    for (const word of MISSING) {
      it(`${word}`, () => {
        expect(manual).toContain(word);
      });
    }

    it("목록이 조용히 줄어들지 않았다", () => {
      expect(MISSING).toHaveLength(5);
    });
  });

  describe("숫자의 한계를 적었다", () => {
    it("위젯 문구와 같은 내용을 말한다", () => {
      const widget = functionsPhp.slice(functionsPhp.indexOf("artpsy-dashboard__limits"));
      for (const phrase of ["봇", "캐시", "고유 방문자"]) {
        expect(widget, `위젯에 ${phrase} 가 없다`).toContain(phrase);
        expect(manual, `매뉴얼에 ${phrase} 가 없다`).toContain(phrase);
      }
    });
  });
});

describe("smoke 가 실제로 열어 본다 (PR12-MANUAL §6)", () => {
  const smoke = read("../smoke/smoke.mjs");
  const check = read("../smoke/manual.mjs");

  it("배선돼 있다", () => {
    expect(smoke).toContain("checkManual");
  });

  it("문서에서 주소를 뽑아서 연다 — 목록을 두 번 안 적는다", () => {
    // 검사가 자기 목록을 들고 있으면 매뉴얼이 틀려도 검사는 통과한다.
    expect(check).toContain("관리자-매뉴얼.md");
    expect(check).toContain("/wp-admin/");
  });

  it("주소를 못 뽑으면 실패한다 — 아무것도 안 재는 상태로 초록불이 나지 않게", () => {
    expect(check).toContain("이 검사가 아무것도 안 재고 있다");
  });

  it("매뉴얼이 적은 403 을 숫자까지 맞춘다", () => {
    expect(check).toContain("매뉴얼은 403 이라고 적었다");
  });

  it("만든 계정을 지운다", () => {
    expect(check).toContain("wp_delete_user(");
  });
});

describe("크레딧을 누가 고치는지 적었다", () => {
  // 매뉴얼이 편집자에게 "저장소의 파일을 고치세요" 라고 적으면, **그 독자는 그걸 할 수
  // 없다** — §1 이 편집자를 관리자 화면 권한만 있는 사람으로 정의한다. tester 가 짚은
  // 자리이고, journal-01 의 표기가 잘린 채 화면에 실렸던 원인이 정확히 이 구조다.
  it("화면은 편집자가 고친다고 적혀 있다", () => {
    expect(manual).toContain("화면의 크레딧은 편집자가 고칩니다");
  });

  it("CREDITS.md 는 저장소 권한이 필요하다는 것과 없을 때 무엇을 하는지 적혀 있다", () => {
    expect(manual).toContain("저장소 접근 권한이 있는 사람만");
    expect(manual).toContain("개발자에게");
  });

  it("갈라졌을 때 어느 쪽이 맞는지 적혀 있다", () => {
    // 안 적으면 편집자가 개발자 회신을 기다리는 동안 무엇을 믿을지 모른다.
    expect(manual).toContain("화면에 보이는 것이 맞는 값");
  });
});

describe("자리표시자 목록이 한 곳에만 있다", () => {
  const claudeMd = read("../CLAUDE.md");

  it("CLAUDE.md 가 목록을 다시 안 적고 매뉴얼을 가리킨다", () => {
    // 두 곳에 적히는 순간 갈라지고, 갈라진 쪽이 어디인지는 아무도 안 본다.
    // 매뉴얼 쪽이 정본인 이유는 "어디서 채우나" 가 거기 있어야 하기 때문이다.
    expect(claudeMd).toContain("관리자-매뉴얼.md");
    expect(claudeMd).not.toMatch(/오시는 길 주소 · 네이버 예약 URL/);
  });
});
