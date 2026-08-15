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
 * $context 로 분기하지 않는다. **대상은 이제 있다** — PR 5 가 artpsy_journal 을 등록했다.
 * 그래도 분기할 근거가 없다: 버튼을 막는 이유(디자인에 버튼 컴포넌트가 없다)는 저널
 * 본문에서도 그대로고, 저널이 무엇을 쓸지는 아직 안 정해졌다. 블록 목록이 정해지면
 * 그때 본다 (설계 §3.1).
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

/**
 * 히어로 세로 크롭. 폰에서 히어로 박스가 2.6:1 세로인데 아트는 1.48:1 가로라
 * object-fit 이 높이로 스케일하고, 폭으로 고른 소스가 ~3.5배 작게 온다 — WP 코어의
 * 자동 srcset 도 폭 기반이라 같은 실패를 한다 (설계 §1).
 *
 * 세로 파일을 하드코딩하지 않는 이유가 이 사이즈의 존재 이유다. 편집자가 히어로를 바꾸면
 * 모바일만 옛 이미지로 남고, 화면은 멀쩡히 뜨고 폰에서만 다른 그림이 나온다.
 * WP 가 업로드 시 만들게 하면 교체가 자동으로 따라온다 (매핑 §5.4).
 */
add_action(
	'after_setup_theme',
	function () {
		add_image_size( 'hero-portrait', 1080, 1440, true );
		add_theme_support( 'post-thumbnails' );
	}
);

/**
 * 저널 썸네일에는 사이즈를 새로 등록하지 않는다. 위 hero-portrait 와 갈리는 자리라 적어 둔다.
 *
 * hero-portrait 가 있는 이유는 **박스의 비율이 뷰포트마다 다르기** 때문이다 — 폰에서
 * 히어로는 2.6:1 세로인데 아트는 1.48:1 가로라, 폭으로 고르는 코어 srcset 은 무엇을 골라도
 * 틀린다. 그건 아트디렉션이고 크롭이 파일 쪽에 있어야 한다.
 *
 * 저널 썸네일은 그 조건이 아니다. 박스가 어느 폭에서나 4:3 하나고, 크롭은 CSS 가
 * aspect-ratio + object-fit: cover 로 이미 한다. 남는 것은 "몇 픽셀을 보낼까" 뿐이라
 * 코어의 폭 기반 srcset 이 정확히 그 일을 한다. 사이즈를 더 등록하면 업로드마다 파일이
 * 늘고 고르는 규칙은 안 는다.
 */

/**
 * 히어로 이미지를 <picture> 로 감싼다. 폭 기반 srcset 으로는 위 문제를 못 고치므로
 * 아트디렉션이 필요하고, 그건 코어 image 블록이 내지 않는다.
 *
 * 첨부가 있으면(편집자가 올린 것) 같은 첨부의 hero-portrait 를 쓰고, 없으면(템플릿 시드)
 * 테마 자산의 세로 파일을 쓴다. 시드도 아트디렉션이 되어야 첫 화면이 흐리지 않다.
 *
 * 에디터 캔버스는 이 필터를 안 탄다 — 편집자는 데스크톱 크롭만 본다. 못 하는 것을
 * 문서에 적는 편이 되는 것처럼 보이게 두는 것보다 낫다 (설계 §1.1).
 */
add_filter(
	'render_block',
	function ( $content, $block ) {
		if ( 'core/image' !== ( $block['blockName'] ?? '' ) ) {
			return $content;
		}

		$classes = preg_split( '/\s+/', $block['attrs']['className'] ?? '', -1, PREG_SPLIT_NO_EMPTY );
		if ( ! in_array( 'hero__media-block', $classes, true ) ) {
			return $content;
		}

		$id       = $block['attrs']['id'] ?? 0;
		$portrait = $id ? wp_get_attachment_image_url( $id, 'hero-portrait' ) : '';

		if ( ! $portrait ) {
			$portrait = get_theme_file_uri( 'assets/img/hero-codes-1080x1440.webp' );
		}

		$source = sprintf(
			'<source media="(orientation: portrait), (max-width: 768px)" srcset="%s" width="1080" height="1440" />',
			esc_url( $portrait )
		);

		// <img> 를 감싼다. figure 안의 다른 것(캡션)은 건드리지 않는다.
		return preg_replace(
			'/(<img\b[^>]*>)/',
			'<picture>' . $source . '$1</picture>',
			$content,
			1
		);
	},
	10,
	2
);

/**
 * 저널 포스트 타입. 여기서부터 개수가 편집자에게 달린다 (씨앗 3).
 *
 * has_archive 를 'journal' 로 둬서 아카이브가 /journal/ 이다. 메인의 id="journal" 섹션과
 * 이름이 겹치는데 **의도한 겹침이다** — 같은 것의 티저와 목록이라 다른 이름을 붙이면
 * 편집자가 둘을 다른 것으로 읽는다.
 *
 * show_in_rest 가 없으면 블록 에디터가 안 열린다. 클래식 편집기로 떨어지고 이 테마의
 * 블록은 하나도 안 보인다 — 조용히 나빠지는 쪽이라 명시한다.
 */
add_action(
	'init',
	function () {
		register_post_type(
			'artpsy_journal',
			array(
				'labels'       => array(
					'name'          => '저널',
					'singular_name' => '저널 글',
				),
				'public'       => true,
				'show_in_rest' => true,
				'has_archive'  => 'journal',
				'rewrite'      => array(
					'slug'       => 'journal',
					'with_front' => false,
				),
				'menu_icon'    => 'dashicons-book-alt',
				'supports'     => array( 'title', 'editor', 'excerpt', 'thumbnail' ),
			)
		);
	}
);

/**
 * 리라이트 규칙을 테마 활성화 때 다시 쓴다. 규칙은 DB 옵션이라 register_post_type 만으로는
 * 안 생기고, 그 상태에서 /journal/ 은 404 다 — 템플릿이 있어도 그렇다. PR 4 에서 "템플릿
 * 파일만으로는 URL 이 안 생긴다"에 걸린 것과 같은 자리이고, 여기서는 원인이 쿼리가 아니라
 * 리라이트다.
 *
 * 이미 활성화된 테마에 이 코드가 pull 로 들어오면 이 훅이 안 돈다. wp-env 쪽은
 * smoke/seed-pages.mjs 가 같이 flush 한다.
 */
add_action(
	'after_switch_theme',
	function () {
		flush_rewrite_rules();
	}
);

/**
 * 대표 이미지에 첨부의 캡션을 붙인다. CC 표시 의무가 그 이미지를 따라다녀야 하는데
 * core/post-featured-image 는 캡션을 안 낸다 — 그래서 크레딧이 붙을 자리가 없다.
 *
 * 크레딧을 템플릿에 하드코딩하지 않는 이유가 이것이다. 편집자가 대표 이미지를 바꾸면
 * 크레딧도 같이 바뀌어야 하고, 첨부의 캡션에 두면 그것이 저절로 따라온다
 * (PR3-PARTS §5 에서 저널 썸네일 크레딧을 캡션에 둔 것과 같은 판단이다).
 *
 * 아카이브에서도 뗀다는 선택지가 있었는데 안 뗐다. 같은 이미지를 두 화면에 띄우면서
 * 한쪽에만 표시를 붙이는 것은 의무의 해석에 기대는 것이고, 기대야 할 이유가 없다.
 */
add_filter(
	'render_block',
	function ( $content, $block ) {
		if ( 'core/post-featured-image' !== ( $block['blockName'] ?? '' ) ) {
			return $content;
		}

		if ( false !== strpos( $content, '<figcaption' ) ) {
			return $content;
		}

		$id      = get_post_thumbnail_id();
		$caption = $id ? wp_get_attachment_caption( $id ) : '';
		if ( '' === $caption ) {
			return $content;
		}

		return preg_replace(
			'#</figure>\s*$#',
			'<figcaption class="wp-element-caption">' . wp_kses_post( $caption ) . '</figcaption></figure>',
			$content,
			1
		);
	},
	10,
	2
);

/**
 * 문의 폼을 렌더 시점에 주입한다. **템플릿에 담을 수 없기 때문이다** — nonce 는 서버가
 * 요청마다 내고, 블록 템플릿은 정적 파일이라 리터럴로 적을 자리가 없다. 적어 두면
 * 그 값이 굳어서 "nonce 없이 POST 하면 안 들어간다" 를 잴 수 없게 된다.
 *
 * 히어로의 <picture> 주입(위)과 같은 기법이다 — 표식 클래스를 가진 빈 블록을 자리로 두고
 * 그 안을 렌더에서 채운다. 커스텀 블록이나 숏코드로도 되는데 안 골랐다: 커스텀 블록은
 * 빌드 산출물이 하나 더 늘고, 숏코드는 편집자가 지울 수 있는 텍스트가 된다. 빈 그룹은
 * templateLock 으로 잠기고 이미 이 파일에 같은 형태가 있다.
 *
 * JS 없이 선다. <form method="post"> 하나이고 제출에 스크립트가 끼지 않는다 —
 * 이 테마의 "JS 실패가 백지가 되면 안 된다" 가 여기서는 "JS 없이도 보내진다" 다.
 *
 * 받는 것은 셋뿐이다(이름·이메일·문의 내용). 처리방침 동의는 required 로 두는데,
 * **브라우저가 막는 것으로 끝내지 않는다** — 서버에서 다시 보는 것은 PR 7 이다.
 */
function artpsy_contact_form_html( array $values = array(), array $errors = array() ) {
	$fields = array(
		array( 'artpsy_name', 'text', '이름', 'name', 80 ),
		array( 'artpsy_email', 'email', '회신 받을 이메일', 'email', 160 ),
	);

	$error_html = static function ( $key ) use ( $errors ) {
		if ( empty( $errors[ $key ] ) ) {
			return '';
		}
		return '<span class="contact-form__error" id="' . esc_attr( str_replace( '_', '-', $key ) ) . '-error">'
			. esc_html( $errors[ $key ] ) . '</span>';
	};

	$html = '<form class="contact-form__form" method="post" action="">';
	$html .= wp_nonce_field( 'artpsy_contact', 'artpsy_contact_nonce', true, false );
	$html .= '<input type="hidden" name="artpsy_contact" value="1" />';

	if ( ! empty( $errors['nonce'] ) ) {
		$html .= '<p class="contact-form__error" role="alert">' . esc_html( $errors['nonce'] ) . '</p>';
	}

	foreach ( $fields as list( $name, $type, $label, $autocomplete, $maxlength ) ) {
		$id      = str_replace( '_', '-', $name );
		$invalid = ! empty( $errors[ $name ] );
		$html   .= '<p class="contact-form__field">'
			. '<label for="' . esc_attr( $id ) . '">' . esc_html( $label ) . '</label>'
			. '<input id="' . esc_attr( $id ) . '" name="' . esc_attr( $name ) . '"'
			. ' type="' . esc_attr( $type ) . '" maxlength="' . (int) $maxlength . '"'
			. ' autocomplete="' . esc_attr( $autocomplete ) . '"'
			. ' value="' . esc_attr( $values[ $name ] ?? '' ) . '"'
			. ( $invalid ? ' aria-invalid="true" aria-describedby="' . esc_attr( $id ) . '-error"' : '' )
			. ' required />'
			. $error_html( $name )
			. '</p>';
	}

	$message_invalid = ! empty( $errors['artpsy_message'] );
	$html           .= '<p class="contact-form__field">'
		. '<label for="artpsy-message">문의 내용</label>'
		. '<textarea id="artpsy-message" name="artpsy_message" rows="6" maxlength="2000"'
		. ( $message_invalid ? ' aria-invalid="true" aria-describedby="artpsy-message-error"' : '' )
		. ' required>' . esc_textarea( $values['artpsy_message'] ?? '' ) . '</textarea>'
		. $error_html( 'artpsy_message' )
		. '</p>';

	// 동의는 되살리지 않는다. 매번 새로 받는 것이 동의다 — 지난 요청의 체크를 다시 켜 두면
	// 사람이 안 누른 것을 눌렀다고 기록하게 된다.
	$html .= '<p class="contact-form__consent">'
		. '<input id="artpsy-consent" name="artpsy_consent" type="checkbox" value="1"'
		. ( ! empty( $errors['artpsy_consent'] ) ? ' aria-invalid="true" aria-describedby="artpsy-consent-error"' : '' )
		. ' required />'
		. '<label for="artpsy-consent">'
		. '<a class="link" href="/privacy/">개인정보 처리방침</a>을 읽었고 위 항목의 수집·이용에 동의합니다.'
		. '</label>'
		. $error_html( 'artpsy_consent' )
		. '</p>';

	$html .= '<p class="contact-form__submit"><button type="submit" class="link">보내기</button></p>';
	$html .= '</form>';

	return $html;
}

/**
 * 이 요청의 처리 결과를 들고 있는다. 전역 변수 대신 함수 하나로 둔다 — 읽는 곳이
 * render_block 필터 하나뿐이고, 그 사이에 누가 덮어쓸 여지를 안 만든다.
 */
function artpsy_contact_state( array $state = null ) {
	static $current = array();
	if ( null !== $state ) {
		$current = $state;
	}
	return $current;
}

/**
 * 서버에서 다시 본다. **브라우저의 required 를 믿지 않는다** — POST 는 폼 없이도 온다.
 *
 * 살균만 하고 이스케이프는 안 한다. 이스케이프된 값이 DB 에 들어가면 관리 화면과 메일에서
 * `&amp;` 가 보이고, 그때는 원본이 무엇이었는지 알 방법이 없다. 이스케이프는 출력에서 한다.
 *
 * 길이 상한을 서버에서도 자른다. maxlength 는 브라우저 것이라 POST 를 손으로 만들면 없다.
 */
function artpsy_validate_contact( array $raw ) {
	$values = array(
		'artpsy_name'    => mb_substr( sanitize_text_field( wp_unslash( $raw['artpsy_name'] ?? '' ) ), 0, 80 ),
		'artpsy_email'   => mb_substr( sanitize_email( wp_unslash( $raw['artpsy_email'] ?? '' ) ), 0, 160 ),
		'artpsy_message' => mb_substr( sanitize_textarea_field( wp_unslash( $raw['artpsy_message'] ?? '' ) ), 0, 2000 ),
	);

	$errors = array();

	$nonce = isset( $raw['artpsy_contact_nonce'] ) ? sanitize_text_field( wp_unslash( $raw['artpsy_contact_nonce'] ) ) : '';
	if ( ! wp_verify_nonce( $nonce, 'artpsy_contact' ) ) {
		$errors['nonce'] = '요청이 만료됐습니다. 아래 내용을 그대로 두고 다시 보내 주세요.';
	}

	// 동의는 요구사항에 없다. 요구사항분석 R6 이 짚은 자리이고, 심리상담 도메인이라 넣는다.
	if ( empty( $raw['artpsy_consent'] ) ) {
		$errors['artpsy_consent'] = '개인정보 수집·이용에 동의해야 보낼 수 있습니다.';
	}

	if ( '' === $values['artpsy_name'] ) {
		$errors['artpsy_name'] = '이름을 적어 주세요.';
	}

	if ( ! is_email( $values['artpsy_email'] ) ) {
		$errors['artpsy_email'] = '회신 받을 이메일 주소를 확인해 주세요.';
	}

	if ( '' === $values['artpsy_message'] ) {
		$errors['artpsy_message'] = '문의 내용을 적어 주세요.';
	}

	return array(
		'values' => $values,
		'errors' => $errors,
	);
}

/**
 * 저장하고 알린다. **저장이 먼저다** — 문의를 잃는 것이 알림을 잃는 것보다 나쁘다.
 *
 * wp_mail 은 실패해도 예외를 안 던지고 wp-env 에서는 아예 안 나간다. 반환값을 보고
 * 실패를 포스트 메타에 남긴다 — 저장은 그대로 두고 관리자만 보는 자리에 적는 것이다.
 */
function artpsy_store_inquiry( array $values ) {
	$post_id = wp_insert_post(
		array(
			'post_type'    => 'artpsy_inquiry',
			'post_status'  => 'private',
			'post_title'   => $values['artpsy_name'],
			'post_content' => $values['artpsy_message'],
		),
		true
	);

	if ( is_wp_error( $post_id ) ) {
		return $post_id;
	}

	update_post_meta( $post_id, '_artpsy_email', $values['artpsy_email'] );

	$sent = wp_mail(
		get_option( 'admin_email' ),
		'[artpsy] 새 문의 — ' . $values['artpsy_name'],
		"이름: {$values['artpsy_name']}\n이메일: {$values['artpsy_email']}\n\n{$values['artpsy_message']}\n",
		array( 'Reply-To: ' . $values['artpsy_email'] )
	);

	if ( ! $sent ) {
		update_post_meta( $post_id, '_artpsy_mail_failed', 1 );
	}

	return $post_id;
}

/**
 * 제출을 받는다. `artpsy_contact` 가 있는 POST 일 때만 돈다.
 *
 * 성공하면 302 로 넘긴다 — 새로고침이 재전송이 되면 안 된다. 그러면 "행이 정확히 하나 는다"
 * 가 사람 손에서 깨진다.
 *
 * 실패하면 리다이렉트하지 않는다 — 입력을 잃으면 안 된다. 긴 문의를 쓴 사람이 이메일
 * 오타 하나로 전부 다시 쓰게 된다. 같은 요청에서 폼을 값과 함께 다시 그린다.
 */
add_action(
	'template_redirect',
	function () {
		if ( 'POST' !== ( $_SERVER['REQUEST_METHOD'] ?? '' ) ) {
			return;
		}

		if ( ! isset( $_POST['artpsy_contact'] ) ) {
			return;
		}

		$checked = artpsy_validate_contact( $_POST );

		if ( ! empty( $checked['errors'] ) ) {
			artpsy_contact_state( $checked );
			return;
		}

		$post_id = artpsy_store_inquiry( $checked['values'] );

		if ( is_wp_error( $post_id ) ) {
			$checked['errors']['nonce'] = '보내지 못했습니다. 잠시 뒤 다시 시도해 주세요.';
			artpsy_contact_state( $checked );
			return;
		}

		wp_safe_redirect( add_query_arg( 'artpsy_sent', '1', get_permalink() ) );
		exit;
	}
);

/**
 * 문의 저장소. 커스텀 테이블을 만들지 않는다 — 테마를 갈 때 데이터가 고아가 되고,
 * 산출물은 테마지만 문의는 고객 데이터다 (PR 4 에서 페이지를 테마에 안 넣은 것과 같은 이유).
 *
 * 밖에서 안 보이게 하는 값 넷이 이 등록의 본론이다. 이 사이트에서 유일하게 남의
 * 개인정보가 들어오는 자리라 기본값에 기대지 않는다.
 */
add_action(
	'init',
	function () {
		register_post_type(
			'artpsy_inquiry',
			array(
				'labels'              => array(
					'name'          => '문의',
					'singular_name' => '문의',
				),
				'public'              => false,
				'publicly_queryable'  => false,
				'exclude_from_search' => true,
				'show_in_rest'        => false,
				'show_ui'             => true,
				'show_in_menu'        => true,
				'menu_icon'           => 'dashicons-email',
				'capability_type'     => 'post',
				// 권한을 관리자로 좁힌다. capability_type: 'post' 만 두면 문의가 일반 글의
				// 권한을 그대로 쓰고, 코어의 editor 역할이 read_private_posts 와
				// edit_others_posts 를 가져서 **편집자가 상담 문의를 읽는다**
				// (tester 가 임시 계정으로 실측했다 — PR7-FORM-PROCESS-T2).
				//
				// /privacy/ 에 "이용 목적은 문의에 회신하는 것 하나" 라고 적어 놨다.
				// 구현이 그 문장과 어긋나면 고정할 것이 결함이 아니라 거짓말이 된다.
				//
				// 전용 capability_type 을 안 쓴다. 그건 활성화 훅에서 역할을 고쳐야 해서
				// DB 상태가 남고, 지금 필요한 경계는 "관리자만" 하나뿐이다.
				// "문의 담당" 역할이 실제로 생기면 그때 값이 난다 (INQUIRY-CAPS).
				'capabilities'        => array(
					'edit_post'          => 'manage_options',
					'read_post'          => 'manage_options',
					'delete_post'        => 'manage_options',
					'edit_posts'         => 'manage_options',
					'edit_others_posts'  => 'manage_options',
					'delete_posts'       => 'manage_options',
					'publish_posts'      => 'manage_options',
					'read_private_posts' => 'manage_options',
					'create_posts'       => 'manage_options',
				),
				'supports'            => array( 'title', 'editor' ),
			)
		);
	}
);

add_filter(
	'render_block',
	function ( $content, $block ) {
		if ( 'core/group' !== ( $block['blockName'] ?? '' ) ) {
			return $content;
		}

		$classes = preg_split( '/\s+/', $block['attrs']['className'] ?? '', -1, PREG_SPLIT_NO_EMPTY );
		if ( ! in_array( 'contact-form', $classes, true ) ) {
			return $content;
		}

		// 두 번 넣지 않는다. 필터가 중첩으로 돌 여지를 남기지 않는다.
		if ( false !== strpos( $content, 'contact-form__form' ) ) {
			return $content;
		}

		$state  = artpsy_contact_state();
		$values = $state['values'] ?? array();
		$errors = $state['errors'] ?? array();

		$notice = '';
		// 성공은 리다이렉트 뒤에 온다. 에러가 있는 요청에는 이 표식이 없다.
		if ( empty( $errors ) && isset( $_GET['artpsy_sent'] ) ) {
			$notice = '<p class="contact-form__sent" role="status">보내졌습니다. 확인하고 회신드리겠습니다.</p>';
		}

		// 안쪽을 **갈아끼운다.** 덧붙이면 캔버스용 설명이 프런트에도 남는다.
		//
		// 그리고 이 형태라야 캔버스가 빈 상자가 아니다. 빈 그룹은 코어가
		// "Group blocks together. Select a layout:" 이라는 초대장을 내는데
		// templateLock: all 이 그것을 조용히 거절한다 — 이 파일 위쪽 core/buttons 주석이
		// 적어 둔 **"열린 것처럼 보이는 잠금"** 과 같은 모양이다.
		return preg_replace_callback(
			'#^(.*?<div[^>]*>).*(</div>\s*)$#s',
			static function ( $matched ) use ( $notice, $values, $errors ) {
				return $matched[1] . $notice . artpsy_contact_form_html( $values, $errors ) . $matched[2];
			},
			$content,
			1
		);
	},
	10,
	2
);

/**
 * 메인 팝업. **편집자가 켜고 끄고 내용을 바꾸는 것**이라 마크업이 아니라 옵션에 산다
 * (요구사항 §백오피스 "사이트 관리(FAQ + 메인 팝업)").
 *
 * CPT 를 안 만든다 — 한 벌뿐이고 목록이 필요 없다. 옵션을 하나의 배열로 묶지도 않는다:
 * 스칼라 다섯이면 `wp option update` 로 켜고 끌 수 있어서 판정이 CLI 로 선다.
 *
 * **기본은 꺼짐이다.** 갓 클론한 설치에서 팝업이 뜨면 포트폴리오를 여는 사람이 공지부터
 * 닫는다 — /privacy/ 와 FAQ 에서 쓴 판단과 같다.
 */
const ARTPSY_POPUP_OPTIONS = array(
	'artpsy_popup_enabled'    => '',
	'artpsy_popup_title'      => '',
	'artpsy_popup_body'       => '',
	'artpsy_popup_link_url'   => '',
	'artpsy_popup_link_label' => '',
);

add_action(
	'admin_init',
	function () {
		foreach ( ARTPSY_POPUP_OPTIONS as $name => $default ) {
			$sanitize = 'artpsy_popup_body' === $name ? 'wp_kses_post' : ( 'artpsy_popup_link_url' === $name ? 'esc_url_raw' : 'sanitize_text_field' );
			register_setting(
				'artpsy_popup',
				$name,
				array(
					'type'              => 'string',
					'sanitize_callback' => $sanitize,
					'default'           => $default,
				)
			);
		}
	}
);

add_action(
	'admin_menu',
	function () {
		add_options_page(
			'메인 팝업',
			'메인 팝업',
			'manage_options',
			'artpsy-popup',
			'artpsy_popup_settings_page'
		);
	}
);

function artpsy_popup_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$fields = array(
		'artpsy_popup_title'      => array( '제목', 'text' ),
		'artpsy_popup_body'       => array( '본문', 'textarea' ),
		'artpsy_popup_link_url'   => array( '링크 주소 (비우면 링크가 안 나온다)', 'url' ),
		'artpsy_popup_link_label' => array( '링크 라벨', 'text' ),
	);
	?>
	<div class="wrap">
		<h1>메인 팝업</h1>
		<p>메인 화면에만 뜬다. 다른 페이지에는 켜도 안 나온다.</p>
		<form method="post" action="options.php">
			<?php settings_fields( 'artpsy_popup' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="artpsy_popup_enabled">켜기</label></th>
					<td>
						<input type="checkbox" id="artpsy_popup_enabled" name="artpsy_popup_enabled" value="1"
							<?php checked( '1', get_option( 'artpsy_popup_enabled' ) ); ?> />
						<span class="description">끄면 마크업 자체가 안 나간다.</span>
					</td>
				</tr>
				<?php foreach ( $fields as $name => list( $label, $type ) ) : ?>
				<tr>
					<th scope="row"><label for="<?php echo esc_attr( $name ); ?>"><?php echo esc_html( $label ); ?></label></th>
					<td>
						<?php if ( 'textarea' === $type ) : ?>
							<textarea id="<?php echo esc_attr( $name ); ?>" name="<?php echo esc_attr( $name ); ?>"
								rows="5" class="large-text"><?php echo esc_textarea( get_option( $name ) ); ?></textarea>
						<?php else : ?>
							<input type="<?php echo esc_attr( $type ); ?>" id="<?php echo esc_attr( $name ); ?>"
								name="<?php echo esc_attr( $name ); ?>" class="regular-text"
								value="<?php echo esc_attr( get_option( $name ) ); ?>" />
						<?php endif; ?>
					</td>
				</tr>
				<?php endforeach; ?>
			</table>
			<?php submit_button(); ?>
		</form>
	</div>
	<?php
}

/**
 * 프런트. **메인에만** 나간다 — "메인 팝업" 이고, 다섯 페이지마다 뜨는 팝업은 아무도
 * 원하지 않는다.
 *
 * <dialog> 인 것이 이 PR 의 안전 설계다.
 *
 *   JS 가 죽어서 못 열리면   아무 일도 안 일어난다. 공지 하나를 못 본다
 *   열린 뒤 JS 가 죽으면     <form method="dialog"> 가 **브라우저 기능으로** 닫는다
 *
 * 닫기를 스크립트 핸들러에 걸지 않는다. 뜬 채로 안 닫히는 것은 백지보다 나쁘다.
 *
 * 모달(showModal)이 아니라 비모달(show)이다 — 모달은 Esc 를 공짜로 주는 대신 **페이지
 * 전체를 막는다.** 닫기가 어떤 이유로든 안 먹으면 사이트가 잠긴다. 위험의 순서가
 * "안 뜨는 것 < 안 닫히는 것" 이라, 애초에 막지 않는 쪽을 골랐다. Esc 가 없는 대신
 * 열 때 닫기 버튼으로 포커스를 옮긴다(JS 가 살아 있는 시점이다).
 *
 * 본문을 **출력에서도** wp_kses_post 로 거른다. 저장 콜백은 설정 화면을 지날 때만 돌고
 * `wp option update` 는 그것을 안 탄다 — 저장에서만 걸면 CLI 로 넣은 <script> 가 그대로 나간다.
 */
add_action(
	'wp_footer',
	function () {
		if ( ! is_front_page() ) {
			return;
		}

		if ( '1' !== (string) get_option( 'artpsy_popup_enabled' ) ) {
			return;
		}

		$title = sanitize_text_field( (string) get_option( 'artpsy_popup_title' ) );
		$body  = wp_kses_post( (string) get_option( 'artpsy_popup_body' ) );
		$url   = esc_url( (string) get_option( 'artpsy_popup_link_url' ) );
		$label = sanitize_text_field( (string) get_option( 'artpsy_popup_link_label' ) );

		if ( '' === $title && '' === $body ) {
			return;
		}

		echo '<dialog class="popup" id="artpsy-popup" aria-labelledby="artpsy-popup-title">';
		echo '<h2 class="popup__title" id="artpsy-popup-title">' . esc_html( $title ) . '</h2>';
		echo '<div class="popup__body">' . $body . '</div>';

		if ( '' !== $url && '' !== $label ) {
			echo '<p class="popup__link"><a class="link" href="' . $url . '">' . esc_html( $label ) . '</a></p>';
		}

		// 진짜 폼이다. method="dialog" 는 브라우저가 처리하므로 JS 없이 닫힌다.
		echo '<form method="dialog" class="popup__close">';
		echo '<button type="submit" class="link">닫기</button>';
		echo '</form>';
		echo '</dialog>';
	}
);

