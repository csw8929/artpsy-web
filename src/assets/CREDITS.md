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

> CC BY-SA는 **표시 의무**가 있다. 이 파일이 기록을 대신하고 있으나, 실제 배포 시에는
> 페이지에 보이는 크레딧이 필요하다.

## 저널 썸네일 — `img/journal/`

Wikimedia Commons의 1200px 썸네일. 카드에는 최대 ~400px로 표시되므로 과대 이미지 상태이며,
이것이 CMS가 원본을 그대로 내보내는 실제 상황에 해당한다.

| 파일 | 바이트 | 크기 | 라이선스 | 출처 |
|---|---:|---|---|---|
| `journal-01.jpg` | 315,374 | 1200×956 | CC BY 3.0 | [Hans Kruzwicki (painting) User: Dietm…](https://commons.wikimedia.org/wiki/File:%22Abstrakte_Komposition%22_Hans_Kruzwicki.jpg) |
| `journal-02.jpg` | 157,266 | 1200×900 | CC BY-SA 3.0 | [Ray Burggraf](https://commons.wikimedia.org/wiki/File:%22Afterglow%22_by_Ray_L._Burggraf,_2005.jpg) |
| `journal-03.jpg` | 754,012 | 1200×1531 | CC BY-SA 4.0 | [Bruce Black](https://commons.wikimedia.org/wiki/File:%22Balance%22.jpg) |
| `journal-04.jpg` | 372,276 | 1200×896 | CC BY-SA 4.0 | [Arte &amp; pintura](https://commons.wikimedia.org/wiki/File:%22Cardenal%22.jpg) |
| `journal-05.jpg` | 381,907 | 1200×813 | CC BY-SA 4.0 | [Bruce Black](https://commons.wikimedia.org/wiki/File:%22Codes%22_Abstract_Watercolor_Painting_by_Bruce_Black_(2020).jpg) |
| `journal-06.jpg` | 153,491 | 1200×900 | CC BY-SA 3.0 | [Global Microscope / Global Microscope…](https://commons.wikimedia.org/wiki/File:%22Dragon_Breath%22_by_Ray_L._Burggraf.jpg) |
| `journal-07.jpg` | 608,079 | 1200×1200 | CC BY 4.0 | [Matti Hyvärinen](https://commons.wikimedia.org/wiki/File:%22Great_Brita%22,_1991.jpg) |
| `journal-08.jpg` | 206,690 | 1200×924 | CC BY 3.0 | [Danojocon](https://commons.wikimedia.org/wiki/File:%22Island_Dreaming%22_by_Dano_J_Ocon_2019.jpg) |
| `journal-09.jpg` | 206,531 | 1200×900 | CC0 | [Middle river exports](https://commons.wikimedia.org/wiki/File:%22Relay%22_abstract_artwork_by_E._Marc_Treib_along_wall_at_Penn-North_station,_Baltimore_Metro_SubwayLink.jpg) |
| `journal-10.jpg` | 152,109 | 1200×1675 | CC BY-SA 3.0 | [Ray Burggraf](https://commons.wikimedia.org/wiki/File:%22Sailboat_Disguise%22_by_Ray_L._Burggraf.jpg) |
| `journal-11.jpg` | 587,762 | 1200×1581 | CC BY-SA 4.0 | [I.D.Clement](https://commons.wikimedia.org/wiki/File:%22Shit_at_and_Hit%22.jpg) |
| `journal-12.jpg` | 296,640 | 1200×935 | CC BY-SA 4.0 | [V4le-.pip](https://commons.wikimedia.org/wiki/File:%22bloody_hands%22.jpg) |
| `journal-13.jpg` | 440,606 | 1200×1600 | CC BY-SA 4.0 | [Art.npf](https://commons.wikimedia.org/wiki/File:%27Sand%27,_Natalia_P._Fernandes.JPG) |
| `journal-14.jpg` | 165,357 | 1200×841 | CC BY-SA 4.0 | [Art.npf](https://commons.wikimedia.org/wiki/File:%27Storm%27_Natalia_P._Fernandes.JPG) |
| `journal-15.jpg` | 408,010 | 1200×900 | CC BY-SA 3.0 | [Globetrotter19](https://commons.wikimedia.org/wiki/File:%27Waving%27_glass_composition_by_Janos_Jegenyes,_2016_Szekszard.jpg) |
| `journal-16.jpg` | 147,676 | 1200×561 | CC BY-SA 4.0 | [Philippe64](https://commons.wikimedia.org/wiki/File:(c)_Philippe_Ringlet_-_Toile_H-B_250x488_cm_(d%C3%A9tail).jpg) |
| `journal-17.jpg` | 739,105 | 1200×899 | CC BY-SA 4.0 | [Irenevideira](https://commons.wikimedia.org/wiki/File:(obra_sem_titulo).jpg) |
| `journal-18.jpg` | 140,908 | 1200×1200 | CC BY 2.0 | [Rodrigo Paredes from Ciudad Autónoma …](https://commons.wikimedia.org/wiki/File:-056_-_Light_Colors_(25142125302).jpg) |
| `journal-19.jpg` | 351,209 | 1200×896 | CC BY-SA 4.0 | [Carlos Hernández Marmolejo](https://commons.wikimedia.org/wiki/File:03-mayo-portada._Fanzine_01.jpg) |
| `journal-20.jpg` | 213,361 | 1200×935 | CC BY-SA 4.0 | [Carlos Hernández Marmolejo](https://commons.wikimedia.org/wiki/File:03-mayo-portada._Fanzine_02.jpg) |
| `journal-21.jpg` | 368,968 | 1200×941 | CC BY-SA 4.0 | [Carlos Hernández Marmolejo](https://commons.wikimedia.org/wiki/File:03-mayo-portada._Fanzine_03.jpg) |
| `journal-22.jpg` | 301,925 | 1200×945 | CC BY-SA 4.0 | [Carlos Hernández Marmolejo](https://commons.wikimedia.org/wiki/File:03-mayo-portada._Fanzine_04.jpg) |
| `journal-23.jpg` | 225,114 | 1200×942 | CC BY-SA 4.0 | [Carlos Hernández Marmolejo](https://commons.wikimedia.org/wiki/File:03-mayo-portada._Fanzine_05.jpg) |
| `journal-24.jpg` | 237,533 | 1200×941 | CC BY-SA 4.0 | [Carlos Hernández Marmolejo](https://commons.wikimedia.org/wiki/File:03-mayo-portada._Fanzine_06.jpg) |

합계 **7,931,909 바이트** (24장).

