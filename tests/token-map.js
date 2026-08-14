// src/styles/tokens.css 의 토큰 35개에 목적지를 준다.
// 정본은 허브 md/architect/20260811_artpsy-theme-json-매핑.md §3 이고, 이 파일은 그 표를
// 기계가 읽는 형태로 옮긴 것이다. 표에 없는 토큰이 tokens.css 에 생기면 테스트가 실패한다 —
// 새 토큰이 목적지 판단 없이 조용히 늘어나는 것을 막는 것이 이 표의 첫 번째 목적이다.
//
// bucket
//   P  프리셋 배열. 편집자가 고르는 것
//   C  settings.custom. 값이지만 편집자가 고를 대상이 아닌 것
//   S  styles / layout. 프리셋이 아니라 문서 자체에 붙는 것
//   X  스타일시트로 가는 것. theme.json 에 슬롯이 없어 path 가 없다
//
// pending
//   매핑은 정해졌는데 theme.json 에 아직 없다는 표시였다. PR-3 이 아홉을 다 채워서 지금은
//   하나도 없다. 다시 생기면 그때 이 플래그를 쓴다 — 몇 개 남았는지가 남은 이식의 크기다.

export const TOKEN_MAP = {
  // §3.1 색
  "--c-paper": { bucket: "P", path: "settings.color.palette[paper].color" },
  "--c-ink": { bucket: "P", path: "settings.color.palette[ink].color" },
  "--c-ink-soft": { bucket: "P", path: "settings.color.palette[ink-soft].color" },
  "--c-ink-faint": { bucket: "P", path: "settings.color.palette[ink-faint].color" },
  "--c-accent": { bucket: "P", path: "settings.color.palette[accent].color" },
  "--c-paper-deep": { bucket: "C", path: "settings.custom.color.paperDeep" },
  "--c-line": { bucket: "C", path: "settings.custom.color.line" },

  // §3.2 폰트
  "--f-display": { bucket: "P", path: "settings.typography.fontFamilies[display].fontFamily" },
  "--f-body": { bucket: "P", path: "settings.typography.fontFamilies[body].fontFamily" },

  // §3.3 크기
  "--t-display": { bucket: "P", path: "settings.typography.fontSizes[display].size" },
  "--t-h2": { bucket: "P", path: "settings.typography.fontSizes[heading].size" },
  "--t-lead": { bucket: "P", path: "settings.typography.fontSizes[lead].size" },
  "--t-body": { bucket: "P", path: "settings.typography.fontSizes[body].size" },
  "--t-meta": { bucket: "P", path: "settings.typography.fontSizes[meta].size" },
  // 카드 제목은 편집자가 고를 대상이 아니라 C 다. P 로 올리면 fontSizes 가 6개가 되어
  // "정확히 5개"와 정면으로 부딪힌다 (설계 §5(나)).
  "--t-card": { bucket: "C", path: "settings.custom.fontSize.card" },

  // §3.4 라인하이트 · 자간
  "--lh-tight": { bucket: "C", path: "settings.custom.lineHeight.tight" },
  "--lh-heading": { bucket: "C", path: "settings.custom.lineHeight.heading" },
  "--lh-normal": { bucket: "C", path: "settings.custom.lineHeight.normal" },
  "--ls-display": { bucket: "C", path: "settings.custom.letterSpacing.display" },
  "--ls-heading": { bucket: "C", path: "settings.custom.letterSpacing.heading" },
  "--ls-meta": { bucket: "C", path: "settings.custom.letterSpacing.meta" },

  // §3.5 간격
  "--s-1": { bucket: "P", path: "settings.spacing.spacingSizes[10].size" },
  "--s-2": { bucket: "P", path: "settings.spacing.spacingSizes[20].size" },
  "--s-3": { bucket: "P", path: "settings.spacing.spacingSizes[30].size" },
  "--s-4": { bucket: "P", path: "settings.spacing.spacingSizes[40].size" },
  "--s-5": { bucket: "P", path: "settings.spacing.spacingSizes[50].size" },
  "--s-6": { bucket: "P", path: "settings.spacing.spacingSizes[60].size" },
  "--s-7": { bucket: "P", path: "settings.spacing.spacingSizes[70].size" },
  "--section-y": { bucket: "P", path: "settings.spacing.spacingSizes[80].size" },

  // §3.6 레이아웃
  "--measure": { bucket: "S", path: "settings.layout.contentSize" },
  // 값이 같지 않다. --page-max 는 거터를 포함한 바깥 폭이고(.wrap 의 border-box max-width),
  // wideSize 는 안쪽 폭이다. 같은 숫자를 넣으면 1280 이상에서 2×거터만큼 넓어진다.
  // 유도식은 token-theme-map.test.js 가 단언한다 — 산문에만 두면 그것도 선언이다.
  "--page-max": {
    bucket: "S",
    path: "settings.layout.wideSize",
    derived: "wideSize = --page-max − 2 × (--gutter clamp 상한)",
  },
  // 좌우가 같은 값이라 왼쪽만 대조한다. 둘이 갈라지는 것은 ③이 잡을 자리가 아니라
  // 디자인 결정이고, 지금은 같아야 한다는 것이 매핑 §3.6 이다.
  "--gutter": { bucket: "S", path: "styles.spacing.padding.left" },

  // §3.7 모션
  "--e-out": { bucket: "C", path: "settings.custom.motion.easeOut" },
  "--d-fast": { bucket: "C", path: "settings.custom.motion.durationFast" },
  "--d-slow": { bucket: "C", path: "settings.custom.motion.durationSlow" },
};

/** WP 가 프리셋 배열 이름에서 만드는 변수 접두사. 표를 늘리는 것이 아니라 WP 의 규칙이다. */
const PRESET_KIND = {
  palette: "color",
  fontSizes: "font-size",
  fontFamilies: "font-family",
  spacingSizes: "spacing",
};

const kebab = (key) => key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/**
 * 목적지 경로에서 WP CSS 변수명을 유도한다. 치환표를 따로 두지 않는 이유는 그 표가
 * 매핑표와 갈라지는 순간 아무도 모르기 때문이다.
 * S 버킷과 X 버킷은 변수를 만들지 않으므로 null 이다.
 */
export function cssVarOf(path) {
  if (!path) return null;

  const preset = path.match(/^settings\.\w+\.(\w+)\[([^\]]+)\]\./);
  if (preset) {
    const kind = PRESET_KIND[preset[1]];
    if (!kind) throw new Error(`프리셋 배열 이름을 모른다: ${preset[1]}`);
    return `--wp--preset--${kind}--${preset[2]}`;
  }

  const custom = path.match(/^settings\.custom\.(\w+)\.(\w+)$/);
  if (custom) return `--wp--custom--${kebab(custom[1])}--${kebab(custom[2])}`;

  return null;
}
