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
