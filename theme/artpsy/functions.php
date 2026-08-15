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
