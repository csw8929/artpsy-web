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
 * 에디터 캔버스에도 같은 시트를 건다. 캔버스가 프런트와 다르게 보이면 편집자가 잘못된
 * 미리보기를 보고 카피를 다듬는다 — 매핑 §4.1 이 theme.json 의 styles.css 를 고른 이유와
 * 같은 것이고, 이 시트에도 그대로 적용된다.
 *
 * 프런트 전용 규칙(Lenis 연동·.js [data-reveal])은 캔버스에 선택자가 없어서 매치되지
 * 않는다. 그래서 시트를 가르지 않고 통째로 건다.
 */
add_action(
	'after_setup_theme',
	function () {
		add_editor_style( 'style.css' );
	}
);
