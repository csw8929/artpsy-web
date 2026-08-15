<?php
/**
 * 테스트 전용. pre_wp_mail 을 가로채 옵션에 적는다 — wp-env 에서 메일은 안 나가고
 * wp_mail 실패는 조용해서, 알림 기능은 훅 발동을 관측하지 않으면 판정이 불가능하다
 * (PR2-SMOKE §3). 이 PR 에서는 배선만 확인하고, 폼과는 안 엮는다 — PR 7 의 일이다.
 *
 * .wp-env.json 의 mappings 로 붙인다. 테마에는 안 넣는다 — 테스트 전용 코드가
 * 실제 사이트 산출물에 섞이면 안 된다.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_filter(
	'pre_wp_mail',
	function ( $null, $atts ) {
		update_option(
			'artpsy_smoke_last_mail',
			array(
				'to'      => $atts['to'] ?? null,
				'subject' => $atts['subject'] ?? null,
			)
		);

		// 짧은회로한다 — wp-env 에는 실제 발송 경로가 없어 실사용 시도가 조용한 실패로
		// 남는다. 그 실패를 여기서 대신 "처리됨"으로 확정한다.
		return true;
	},
	10,
	2
);
