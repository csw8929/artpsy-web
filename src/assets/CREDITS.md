# 에셋 출처와 라이선스

Phase 1 성능 실측용 에셋이다. 전부 재배포 가능한 라이선스다.

ARTPSY-3에서 **무최적화 상태로 주입해 최악 조건을 재고**, ARTPSY-11에서 **최적화해 델타를 얻는다.**
이 문서는 최적화 라운드 이후 상태다. 절마다 원본과 배포본을 함께 적어 둔 것은 그 델타가
이 프로젝트의 실측 근거이기 때문이다.


## 폰트 — `fonts/`

| 파일 | 바이트 | 역할 | 라이선스 | 출처 |
|---|---:|---|---|---|
| `NanumMyeongjo-Regular.subset.woff2` | 191,292 | display — **배포본** | SIL OFL 1.1 (`NanumMyeongjo-OFL.txt`) | 아래 원본에서 파생 |
| `Pretendard-Regular.subset.woff2` | 168,084 | body — **배포본** | SIL OFL 1.1 (`Pretendard-OFL.txt`) | 아래 원본에서 파생 |
| `NanumMyeongjo-Regular.ttf` | 3,058,408 | 원본 (근거·재생성용) | SIL OFL 1.1 | https://github.com/google/fonts/tree/main/ofl/nanummyeongjo |
| `Pretendard-Regular.otf` | 1,574,352 | 원본 (근거·재생성용) | SIL OFL 1.1 | https://github.com/orioncactus/pretendard (v1.3.9) |

배포되는 것은 서브셋 2개 **합계 359,376 바이트**다. 무최적화 라운드의 4,632,760에서 7.8%로 줄었다.
압축으로는 이 자리에 올 수 없다 — 전체 문자셋 파일도 이미 압축돼 있고, 아무도 쓰지 않는 글리프를
지워주는 인코더는 없다. 원본은 지우지 않는다: 서브셋은 파생물이고 재생성의 근거가 원본이다.
어느 것도 참조되지 않으므로 빌드 산출물에는 들어가지 않는다.

**서브셋 범위**: KS X 1001 상용 한글 2,350자 + 기본 라틴 + 숫자 + 문장부호(CJK 포함) = 2,792자.
한글 2,350자는 EUC-KR `0xB0A1`–`0xC8FE`를 디코딩해 얻었다 — 목록을 손으로 들고 있지 않아도 된다.

**재생성** (도구는 스크래치패드 venv에 둔다. 프로젝트 의존성이 아니다):

```bash
python3 -m venv venv && venv/bin/pip install 'fonttools[woff]'
venv/bin/pyftsubset <원본> --text-file=<charset.txt> --output-file=<출력>.subset.woff2 \
  --flavor=woff2 --layout-features='kern,liga,calt,ccmp,locl' \
  --no-hinting --desubroutinize --drop-tables+=DSIG
```

`unicode-range` 분할은 넣지 않았다. Phase 1은 텍스트가 고정이라 안전하지만 CMS는 아니다 —
2,350자 밖의 글자는 두부가 아니라 **글자 단위로 폴백 서체**가 되므로, 분할은 Phase 2 진입 전 항목이다.

## 히어로 이미지 — `img/hero-codes-*.webp`

- 원제: "Codes" Abstract Watercolor Painting by Bruce Black (2020)
- 작가: Bruce Black
- 라이선스: CC BY-SA 4.0 — https://creativecommons.org/licenses/by-sa/4.0
- 출처: https://commons.wikimedia.org/wiki/File:%22Codes%22_Abstract_Watercolor_Painting_by_Bruce_Black_(2020).jpg
- 페이지 표시: `“Codes” (2020), Bruce Black · CC BY-SA 4.0 · 원본을 크롭하고 WebP 로 재인코딩했습니다.`

| 파일 | 바이트 | 크기 | 조건 |
|---|---:|---|---|
| `hero-codes-2560.webp` | 489,722 | 2560×1735 | 기본 (가로) |
| `hero-codes-1080x1440.webp` | 230,660 | 1080×1440 | `(orientation: portrait), (max-width: 768px)` |
| `hero-codes.jpg` | 3,312,328 | 4710×3192 | 원본 (근거·재생성용, 배포 안 함) |

둘 다 WebP q78. 폭 기반 `srcset`이 아니라 **`<picture>` 아트디렉션**이다 — 모바일에서 히어로
박스는 세로 2.6:1인데 원본은 가로 1.48:1이라 `object-fit: cover`가 높이에 맞춰 확대한다.
폭으로 고르면 3.5배 확대되어 뭉개진다.

세로본은 3:4 **중앙 크롭**이다. 눈으로 확인하고 중앙을 택했다 — 노란 삼각형은 프레임 밖으로
나가지만 잘리는 피사체가 없고 원형 모티프가 온전히 들어온다. 0.35 지점은 삼각형을 반으로 자른다.

> CC BY-SA는 **표시 의무**가 있다. `#28`(`99c19ae`)에서 푸터에 실렸다 — 이 파일은 이제
> 그 표시가 어디서 왔는지의 기록이다.

## 저널 썸네일 — `img/journal/`

Wikimedia Commons 원본을 **4:3으로 크롭한 뒤 WebP q72**로 재인코딩했다. 무최적화 라운드에서는
1200px JPEG를 그대로 실었는데 카드에는 최대 ~400px로 표시되므로, 보이지도 않는 픽셀을 전송하고
있었다. 크롭이 큰 몫이다 — `journal-03`은 1200×1531이라 세로 40%가 버려지던 자리였다.

**폭 2종(600w / 800w)의 `srcset`이다.** 처음에는 만들지 않았는데, 그 근거였던 *"썸네일은
`loading=\"lazy\"`라 초기 비용이 아니다"* 가 실측으로 반증됐다 — 느린 연결에서 Chrome이 lazy
임계 거리를 넓혀 데스크톱에서 16장이 `load` 이전에 당겨졌고, 그것만으로 840,266바이트였다.
데스크톱 4열은 열 폭이 298px이라 800w가 과대다.

1200w는 만들지 않았다. 모바일 DPR3(1053px 필요)에 정확히 맞추려면 필요하지만 800w가 이미 육안
검증을 통과했고, 통과한 품질을 올리자고 모바일 전체 전송량을 1MB 늘리는 것은 과설계다.
Phase 2에서 WP 코어가 자동 생성하므로 여기서 만든 것은 어차피 버려진다.

사이트 저널 카드에 실제로 쓰는 것은 아래 둘뿐이다(`CREDITS-FIX`). 나머지 22장은 표에만
남는다 — 페이지에 없으므로 표시 의무가 없고, 표는 그대로 자산 기록이다.

### `journal-01.webp`

- 원제: "Abstrakte Komposition"
- 작가: Hans Kruzwicki(그림), Dietmar Kruzwicki(사진)
- 라이선스: GFDL 1.2+ 또는 CC BY 3.0 Unported (이중 라이선스) — **CC BY 3.0을 표시에 쓴다**
  — https://creativecommons.org/licenses/by/3.0
- 출처: https://commons.wikimedia.org/wiki/File:%22Abstrakte_Komposition%22_Hans_Kruzwicki.jpg
- 변경: 크롭 + WebP 재인코딩
- 페이지 표시: `“Abstrakte Komposition”, Hans Kruzwicki(그림) · Dietmar Kruzwicki(사진) · CC BY 3.0 · 크롭·WebP 재인코딩`

> 이전 값이 표(아래)에서 `…`로 잘려 사진가(Dietmar Kruzwicki) 크레딧이 통째로 빠져
> 있었다 — CC BY는 지정된 방식의 표시를 요구하므로 실제 미충족이었다(`CREDITS-FIX`).
> 표에 안 들어가는 값은 표 밖에 둔다.

### `journal-02.webp`

- 원제: "Afterglow" (2005)
- 작가: Ray L. Burggraf
- 라이선스: GFDL 1.2+ 또는 CC BY-SA 3.0 Unported (이중 라이선스) — **CC BY-SA 3.0을 표시에 쓴다**
  — https://creativecommons.org/licenses/by-sa/3.0
- 출처: https://commons.wikimedia.org/wiki/File:%22Afterglow%22_by_Ray_L._Burggraf,_2005.jpg
- 변경: 크롭 + WebP 재인코딩
- 페이지 표시: `“Afterglow” (2005), Ray L. Burggraf · CC BY-SA 3.0 · 크롭·WebP 재인코딩`

| 파일(800w) | 800w 바이트 | 600w 바이트 | 이전(JPEG) | 라이선스 | 출처 |
|---|---:|---:|---:|---|---|
| `journal-01.webp` | 47,696 | 29,886 | 315,374 | CC BY 3.0 | [Hans Kruzwicki](https://commons.wikimedia.org/wiki/File:%22Abstrakte_Komposition%22_Hans_Kruzwicki.jpg) |
| `journal-02.webp` | 14,754 | 10,374 | 157,266 | CC BY-SA 3.0 | [Ray Burggraf](https://commons.wikimedia.org/wiki/File:%22Afterglow%22_by_Ray_L._Burggraf,_2005.jpg) |
| `journal-03.webp` | 134,744 | 82,436 | 754,012 | CC BY-SA 4.0 | [Bruce Black](https://commons.wikimedia.org/wiki/File:%22Balance%22.jpg) |
| `journal-04.webp` | 72,146 | 35,408 | 372,276 | CC BY-SA 4.0 | [Arte &amp; pintura](https://commons.wikimedia.org/wiki/File:%22Cardenal%22.jpg) |
| `journal-05.webp` | 94,760 | 57,298 | 381,907 | CC BY-SA 4.0 | [Bruce Black](https://commons.wikimedia.org/wiki/File:%22Codes%22_Abstract_Watercolor_Painting_by_Bruce_Black_(2020).jpg) |
| `journal-06.webp` | 18,726 | 12,732 | 153,491 | CC BY-SA 3.0 | [Global Microscope](https://commons.wikimedia.org/wiki/File:%22Dragon_Breath%22_by_Ray_L._Burggraf.jpg) |
| `journal-07.webp` | 94,704 | 44,632 | 608,079 | CC BY 4.0 | [Matti Hyvärinen](https://commons.wikimedia.org/wiki/File:%22Great_Brita%22,_1991.jpg) |
| `journal-08.webp` | 10,642 | 4,798 | 206,690 | CC BY 3.0 | [Danojocon](https://commons.wikimedia.org/wiki/File:%22Island_Dreaming%22_by_Dano_J_Ocon_2019.jpg) |
| `journal-09.webp` | 33,876 | 21,886 | 206,531 | CC0 | [Middle river exports](https://commons.wikimedia.org/wiki/File:%22Relay%22_abstract_artwork_by_E._Marc_Treib_along_wall_at_Penn-North_station,_Baltimore_Metro_SubwayLink.jpg) |
| `journal-10.webp` | 13,468 | 9,206 | 152,109 | CC BY-SA 3.0 | [Ray Burggraf](https://commons.wikimedia.org/wiki/File:%22Sailboat_Disguise%22_by_Ray_L._Burggraf.jpg) |
| `journal-11.webp` | 77,274 | 50,896 | 587,762 | CC BY-SA 4.0 | [I.D.Clement](https://commons.wikimedia.org/wiki/File:%22Shit_at_and_Hit%22.jpg) |
| `journal-12.webp` | 56,544 | 32,956 | 296,640 | CC BY-SA 4.0 | [V4le-.pip](https://commons.wikimedia.org/wiki/File:%22bloody_hands%22.jpg) |
| `journal-13.webp` | 25,360 | 8,862 | 440,606 | CC BY-SA 4.0 | [Art.npf](https://commons.wikimedia.org/wiki/File:%27Sand%27,_Natalia_P._Fernandes.JPG) |
| `journal-14.webp` | 12,166 | 6,538 | 165,357 | CC BY-SA 4.0 | [Art.npf](https://commons.wikimedia.org/wiki/File:%27Storm%27_Natalia_P._Fernandes.JPG) |
| `journal-15.webp` | 87,318 | 52,074 | 408,010 | CC BY-SA 3.0 | [Globetrotter19](https://commons.wikimedia.org/wiki/File:%27Waving%27_glass_composition_by_Janos_Jegenyes,_2016_Szekszard.jpg) |
| `journal-16.webp` | 41,798 | 27,572 | 147,676 | CC BY-SA 4.0 | [Philippe64](https://commons.wikimedia.org/wiki/File:(c)_Philippe_Ringlet_-_Toile_H-B_250x488_cm_(d%C3%A9tail).jpg) |
| `journal-17.webp` | 12,692 | 11,440 | 739,105 | CC BY-SA 4.0 | [Irenevideira](https://commons.wikimedia.org/wiki/File:(obra_sem_titulo).jpg) |
| `journal-18.webp` | 16,206 | 11,514 | 140,908 | CC BY 2.0 | [Rodrigo Paredes](https://commons.wikimedia.org/wiki/File:-056_-_Light_Colors_(25142125302).jpg) |
| `journal-19.webp` | 54,590 | 23,844 | 351,209 | CC BY-SA 4.0 | [Carlos Hernández Marmolejo](https://commons.wikimedia.org/wiki/File:03-mayo-portada._Fanzine_01.jpg) |
| `journal-20.webp` | 18,550 | 10,096 | 213,361 | CC BY-SA 4.0 | [Carlos Hernández Marmolejo](https://commons.wikimedia.org/wiki/File:03-mayo-portada._Fanzine_02.jpg) |
| `journal-21.webp` | 48,304 | 24,314 | 368,968 | CC BY-SA 4.0 | [Carlos Hernández Marmolejo](https://commons.wikimedia.org/wiki/File:03-mayo-portada._Fanzine_03.jpg) |
| `journal-22.webp` | 33,338 | 17,364 | 301,925 | CC BY-SA 4.0 | [Carlos Hernández Marmolejo](https://commons.wikimedia.org/wiki/File:03-mayo-portada._Fanzine_04.jpg) |
| `journal-23.webp` | 25,562 | 14,728 | 225,114 | CC BY-SA 4.0 | [Carlos Hernández Marmolejo](https://commons.wikimedia.org/wiki/File:03-mayo-portada._Fanzine_05.jpg) |
| `journal-24.webp` | 25,296 | 12,342 | 237,533 | CC BY-SA 4.0 | [Carlos Hernández Marmolejo](https://commons.wikimedia.org/wiki/File:03-mayo-portada._Fanzine_06.jpg) |

합계 — 800w **1,070,514** / 600w **613,196**, 48장 도합 **1,683,710 바이트**.
이전(1200px JPEG 24장) 7,931,909에서 800w만 보면 13.5%다.
800w 평균 44,604 / 최대 134,744 · 600w 평균 25,549 / 최대 82,436.

전송되는 것은 뷰포트당 한 벌뿐이다 — 데스크톱은 600w, 모바일·태블릿은 800w를 고른다.

원본 JPEG(`journal-*.jpg`)는 지우지 않는다. 참조되지 않으므로 빌드 산출물에는 들어가지 않는다.
