// 테마 런타임 번들. 기본 build 는 Phase 1 의 index.html 을 대상으로 하고 그 산출물은
// phase-1 기준선과 대조되므로, 테마 번들은 설정을 나눠 따로 낸다.
//
// 파일명에 해시를 넣지 않는다. functions.php 가 이름으로 enqueue 하고, 캐시는 테마 버전을
// 쿼리로 붙여 깬다 — style.css 를 건 방식과 같다.
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "theme/artpsy/assets",
    emptyOutDir: false, // assets/fonts/ 가 여기 산다
    rollupOptions: {
      input: "theme/artpsy/src/main.js",
      output: {
        entryFileNames: "main.js",
        format: "iife",
      },
    },
  },
});
