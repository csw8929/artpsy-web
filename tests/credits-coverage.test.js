// CREDITS.md 의 "페이지 표시" 값과 실제 렌더 텍스트를 문자 단위로 대조한다.
//
// 왜 이 테스트가 있나: journal-01 의 작가 표기가 CREDITS.md 표 안에서 `…`로 잘려
// 사진가(Dietmar Kruzwicki) 크레딧이 통째로 빠졌고, 그 잘린 값이 그대로 페이지 푸터/캡션에
// 실렸다(CREDITS-FIX). "옮기다 갈렸다"를 사람 눈이 아니라 코드로 잡는다 — base.css
// 전수 대조와 같은 이유다.
//
// 값을 두 곳에 적지 않는다. CREDITS.md 의 "페이지 표시" 필드가 정본이고, 여기는 그것과
// 테마 마크업이 같은지만 본다.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { JOURNAL } from "../smoke/journal.mjs";

const credits = readFileSync(new URL("../src/assets/CREDITS.md", import.meta.url), "utf8");
const footer = readFileSync(new URL("../theme/artpsy/parts/footer.html", import.meta.url), "utf8");
const index = readFileSync(new URL("../theme/artpsy/templates/index.html", import.meta.url), "utf8");

function stripTags(html) {
  return html.replace(/<[^>]+>/g, "").trim();
}

function pageDisplayValues(md) {
  const out = [];
  const re = /- 페이지 표시: `([^`]+)`/g;
  let m;
  while ((m = re.exec(md))) out.push(m[1]);
  return out;
}

const displayed = pageDisplayValues(credits);

describe("크레딧 페이지 표시 대조 (CREDITS-FIX)", () => {
  // 파서가 조용히 빈 배열을 내면 아래가 통째로 사라지고 초록으로 지나간다.
  it("CREDITS.md 에서 페이지 표시 3건을 뽑았다", () => {
    expect(displayed).toHaveLength(3);
  });

  it("히어로 — 푸터 크레딧과 일치한다", () => {
    const m = footer.match(/<p class="site-credit[^"]*">([\s\S]*?)<\/p>/);
    expect(m, "footer.html 에 .site-credit 단락이 없다").toBeTruthy();
    const rendered = stripTags(m[1]).replace(/^히어로 이미지 — /, "");
    expect(rendered).toBe(displayed[0]);
  });

  it("저널 캡션 2개가 CREDITS.md 값과 순서대로 일치한다", () => {
    const captions = [...index.matchAll(/<figcaption class="wp-element-caption">([\s\S]*?)<\/figcaption>/g)];
    expect(captions, "저널 캡션이 2개가 아니다").toHaveLength(2);
    expect(stripTags(captions[0][1])).toBe(displayed[1]);
    expect(stripTags(captions[1][1])).toBe(displayed[2]);
  });

  // PR 5 부터 같은 두 이미지가 저널 글의 대표 이미지로도 올라간다. 크레딧은 첨부의
  // 캡션에 실려 이미지를 따라다니는데, 그 값이 여기서 세 번째 사본이 된다 —
  // 세 벌이 되면 갈리는 것이 시간 문제라 같은 정본에 붙여 둔다.
  it("저널 시드의 첨부 캡션도 CREDITS.md 값과 일치한다", () => {
    expect(JOURNAL, "시드가 둘이 아니다").toHaveLength(2);
    expect(stripTags(JOURNAL[0].caption)).toBe(displayed[1]);
    expect(stripTags(JOURNAL[1].caption)).toBe(displayed[2]);
  });
});
