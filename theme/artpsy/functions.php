<?php
/**
 * V-3 확인용. theme.json 에는 Font Library 를 끄는 슬롯이 없어서 필터로만 가능하다고
 * 보고 있는데, 그 판단 자체가 매핑 설계 §9 V-3 의 미검증 가정이다. 이 파일이 있는데도
 * 에디터에 폰트 관리 UI 가 그대로 보이면 "끌 수 없다" 가 결과다.
 *
 * 이 스파이크에서 필요한 최소한만 둔다 — 테마의 나머지는 theme.json 이 정본이다.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_filter(
	'block_editor_settings_all',
	function ( $settings ) {
		$settings['fontLibraryEnabled'] = false;
		return $settings;
	}
);

/**
 * 블록 테마라도 style.css 는 프런트에 자동으로 걸리지 않는다. 테마 헤더는 거기서 읽지만
 * CSS 로드는 별개다 — 코어의 wp_enqueue_scripts 훅 어디에도 get_stylesheet_uri 를 거는
 * 것이 없고, wp_enqueue_classic_theme_styles 는 클래식 테마 전용이다 (WP 7.0.4 확인).
 *
 * 파일에 규칙이 0줄일 때는 이 공백이 무해했다. 규칙이 들어오는 순간 결함이 된다.
 */
add_action(
	'wp_enqueue_scripts',
	function () {
		wp_enqueue_style(
			'artpsy',
			get_stylesheet_uri(),
			array(),
			wp_get_theme()->get( 'Version' )
		);
	}
);

/**
 * 에디터 캔버스에도 같은 시트를 건다. .link 와 .grid 는 편집자가 보면서 고치는 것이라
 * 캔버스와 프런트가 갈리면 잘못된 미리보기를 보고 카피를 다듬게 된다 — 매핑 §4.1 이
 * theme.json 의 styles.css 를 고른 이유와 같다.
 *
 * 시트를 가르지 않고 통째로 건다. 프런트 전용 규칙은 캔버스에서 매칭할 것이 없다 —
 * .js 를 붙이는 것은 프런트 번들이라 캔버스에 안 실리고(실측 matchesRule 0), Lenis
 * 선택자도 붙지 않는다. 파일을 둘로 가르는 값이 그 무해함보다 크다.
 */
add_action(
	'after_setup_theme',
	function () {
		add_editor_style( 'style.css' );
	}
);

/**
 * reveal 대상에 data-reveal 을 붙인다. 마크업에 직접 쓰지 않는 이유는 코어 블록이 임의
 * data-* 를 저장 대상으로 두지 않아서다 — core/heading 의 supports 는 anchor 까지이고,
 * 저장된 HTML 에 없는 속성이 있으면 블록 검증이 깨진다.
 *
 * 대상은 h2 전부와 className 에 lead 가 있는 문단이다 (연출 결정, ARTPSY-74 §3).
 * 히어로 h1 은 빠진다 — LCP 후보라 첫 화면에서 숨기면 안 된다. 반복 항목(카드·저널)도
 * 빠지는데, 그건 그것들이 h3 라서지 필터가 위치를 보기 때문이 아니다.
 *
 * 즉 "섹션 고정 덩어리의" 라는 한정은 지금 우연히 성립한다. 카드에 h2 가 들어오면 조용히
 * data-reveal 이 붙는다. 그때는 편집자가 추가한 카드에만 속성이 없어서 일부만 움직이고,
 * 일부만 움직이는 것은 아무것도 안 움직이는 것보다 나쁘다.
 *
 * render_block 은 조상 사슬을 주지 않아 위치로 거를 방법이 지금은 없다. 반복 항목의
 * reveal 은 패턴이 들고 있어야 하고, 그 패턴이 생길 때 이 필터도 같이 본다.
 */
add_filter(
	'render_block',
	function ( $content, $block ) {
		$name  = $block['blockName'] ?? '';
		$attrs = $block['attrs'] ?? array();

		$is_section_heading = 'core/heading' === $name && 2 === ( $attrs['level'] ?? 2 );
		$is_lead            = 'core/paragraph' === $name
			&& in_array( 'lead', preg_split( '/\s+/', $attrs['className'] ?? '', -1, PREG_SPLIT_NO_EMPTY ), true );

		if ( ! $is_section_heading && ! $is_lead ) {
			return $content;
		}

		// 첫 여는 태그에만 붙인다. 이미 있으면 두 번 붙이지 않는다.
		if ( false !== strpos( $content, 'data-reveal' ) ) {
			return $content;
		}

		return preg_replace( '/<(h2|p)\b/', '<$1 data-reveal', $content, 1 );
	},
	10,
	2
);

/**
 * 버튼 블록을 전역에서 뺀다. 이 디자인에 버튼 컴포넌트가 없다 — .link 는 밑줄 텍스트다.
 * 스타일을 맞추느니 못 쓰게 하는 편이 싸다 (매핑 §5.3).
 *
 * 거부 목록이다. 허용 목록을 손으로 적지 않는다 — 지금 못 박으면 다음 템플릿마다 풀어야
 * 하고, Journal 본문이 무엇을 쓸지는 아직 정해지지 않았다. 등록된 것에서 빼는 형태라
 * 코어가 블록을 늘려도 따라온다.
 *
 * $context 로 분기하지 않는다. 분기할 대상(Journal 포스트 타입)이 아직 없고, 없는 것을
 * 위한 분기가 다음 불일치가 된다 (설계 §3.1).
 */
add_filter(
	'allowed_block_types_all',
	function ( $allowed, $context ) {
		// 컨테이너도 같이 뺀다. core/buttons 만 남기면 삽입은 되는데 자식을 못 받아
		// 아무것도 담을 수 없는 껍데기가 된다 — 편집자는 "버튼"을 찾아 넣고 빈 상자를
		// 받고 왜 안 되는지 알 방법이 없다. 열린 것처럼 보이는 잠금이다.
		$denied = array( 'core/button', 'core/buttons' );

		if ( ! is_array( $allowed ) ) {
			$allowed = array_keys( WP_Block_Type_Registry::get_instance()->get_all_registered() );
		}

		return array_values( array_diff( $allowed, $denied ) );
	},
	10,
	2
);

/**
 * 테마 런타임. style.css 와 같은 자리다 — 블록 테마라도 자동으로 걸리는 것이 없다.
 *
 * defer 로 건다. Phase 1 은 <script type="module"> 이었고 그건 기본이 defer 다.
 * 파서를 막지 않는 것이 같아야 한다.
 *
 * 버전은 테마 버전이다. 번들 파일명에 해시를 안 넣었으므로 캐시는 이 쿼리가 깬다 —
 * style.css 와 같은 방식이라 테마 버전 하나만 올리면 둘이 같이 깨진다.
 */
add_action(
	'wp_enqueue_scripts',
	function () {
		$relative = 'assets/main.js';
		$path     = get_theme_file_path( $relative );

		// 번들이 없으면 조용히 넘어가지 않는다. 정적 페이지로 내려앉는 것이 맞지만,
		// 왜 그런지는 남아야 한다 — .js 클래스가 안 붙어 콘텐츠는 그대로 보인다.
		if ( ! file_exists( $path ) ) {
			if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				trigger_error( 'artpsy: ' . $relative . ' 가 없다. npm run build:theme 을 돌려야 한다.', E_USER_WARNING );
			}
			return;
		}

		wp_enqueue_script(
			'artpsy',
			get_theme_file_uri( $relative ),
			array(),
			wp_get_theme()->get( 'Version' ),
			array( 'strategy' => 'defer' )
		);
	}
);
