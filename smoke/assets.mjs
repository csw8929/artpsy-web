// 이미지 URL을 렌더된 HTML에서 뽑는다. `<script src>` 등 다른 src를 안 섞으려고
// <img>·<source> 태그로 한정한다.
export function extractImageUrls(html, base) {
  const urls = new Set();
  for (const tag of html.matchAll(/<(?:img|source)\b[^>]*>/g)) {
    const t = tag[0];
    const src = t.match(/\bsrc="([^"]+)"/);
    if (src) urls.add(new URL(src[1], base).toString());
    const srcset = t.match(/\bsrcset="([^"]+)"/);
    if (srcset) {
      for (const part of srcset[1].split(",")) {
        const url = part.trim().split(/\s+/)[0];
        if (url) urls.add(new URL(url, base).toString());
      }
    }
  }
  return urls;
}
