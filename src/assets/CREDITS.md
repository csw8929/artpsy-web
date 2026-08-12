# 에셋 출처와 라이선스

Phase 1 성능 실측(ARTPSY-3)을 위해 주입한 에셋이다. 전부 재배포 가능한 라이선스이며,
**최적화하지 않은 상태**로 둔 것이 의도다 — 다음 라운드에서 같은 조건으로 재측정해 델타를 얻는다.


## 폰트 — `fonts/`

| 파일 | 바이트 | 서체 | 라이선스 | 출처 |
|---|---:|---|---|---|
| `NanumMyeongjo-Regular.ttf` | 3,058,408 | 나눔명조 Regular | SIL OFL 1.1 (`NanumMyeongjo-OFL.txt`) | https://github.com/google/fonts/tree/main/ofl/nanummyeongjo |
| `Pretendard-Regular.otf` | 1,574,352 | Pretendard Regular | SIL OFL 1.1 (`Pretendard-OFL.txt`) | https://github.com/orioncactus/pretendard (v1.3.9) |

합계 **4,632,760 바이트**. upstream 원본을 그대로 쓴다 — woff2 변환·서브셋·`unicode-range`
분할·`preload`·`size-adjust` 전부 넣지 않았다. 나눔명조는 upstream에 woff2 배포본이 없어
직접 변환해야 하는데, 그 변환 자체가 이번 라운드의 관측 대상이라 한쪽만 압축하면 델타가 오염된다.


## 히어로 이미지 — `img/hero-codes.jpg`

- 원제: "Codes" Abstract Watercolor Painting by Bruce Black (2020)
- 작가: Bruce Black
- 라이선스: CC BY-SA 4.0 — https://creativecommons.org/licenses/by-sa/4.0
- 출처: https://commons.wikimedia.org/wiki/File:%22Codes%22_Abstract_Watercolor_Painting_by_Bruce_Black_(2020).jpg
- 원본 그대로: 4710 × 3192, 3,312,328 바이트, JPEG. 리사이즈·WebP/AVIF 변환·`srcset` 없음.

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

