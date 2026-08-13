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
