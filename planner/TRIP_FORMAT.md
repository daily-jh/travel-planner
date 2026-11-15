# trip.json 형식

여행 하나 = `trips/<연도-월-도시>/trip.json` (+ `og.png` 링크 썸네일).
`planner/build.py`가 이 파일로 여행 페이지, `calendar.ics`, 첫 화면 여행 목록 카드를 만든다. 목록 등록은 따로 할 일이 없다.
가장 완성된 예시는 `trips/2027-03-fukuoka/trip.json`.

뼈대 만들기 → 채우기 → 점검:

```
python planner/new_trip.py --slug 2027-10-osaka --title "오사카, *가을* 먹방" --short 오사카 \
    --start 2027-10-02 --end 2027-10-05 --city 오사카 --theme temple --travelers 지훈,지윤
python planner/check_trip.py trips/2027-10-osaka
python planner/build.py && node planner/tools/render-assets.js 2027-10-osaka
```

## 글자 규칙 (모든 문자열)

- `**굵게**` → 굵은 글씨
- `{확인 필요}` → 노란 배지. 영업시간·요금·집합 시간처럼 아직 확정 못 한 정보에 붙인다. 추측으로 채우지 않는다
- `{채우기}` → `new_trip.py`가 남긴 빈칸. 남아 있으면 `check_trip.py`가 실패한다
- 제목의 `*별표*` → 강조색
- 전화번호·예약번호·이메일·여권번호는 어디에도 쓰지 않는다 (공개 저장소). 예약은 "핫페퍼 예약 (19:00)"처럼 경로와 시각만

## 위쪽 항목

| 키 | 형식 | 설명 |
|---|---|---|
| `title` / `short` / `eyebrow` | 문자열 | 표지 제목, 짧은 이름, 위 작은 글씨(`FUK · 博多`) |
| `theme` | `hakata` `ocean` `forest` `snow` `citrus` `temple` | 남색·매화 / 바다·섬 / 숲·온천 / 겨울·설경 / 열대·휴양 / 고도·사찰 |
| `travelers` | `[{"name","tone":"pri"|"acc"}]` | 픽(♥)을 고를 사람. 이름만 |
| `start` `end` | `YYYY-MM-DD` | 첫날·마지막 날 |
| `timezone` `country` | `Asia/Tokyo`, `일본` | 캘린더 시간대, 목록 카드 |
| `intro` | 문자열 | 한두 문장 소개 |
| `facts` | `[[이름, 값]]` | 표지 아래 칩 (숙소·항공·환율) |
| `links` | `[{"label", "url"|"query", "primary"}]` | 표지 버튼. `query`는 구글 지도 검색어 |
| `stay` `transport` | `[[이름, 값]]` | 준비 탭 숙소·이동 |
| `stay_query` / `stay_ja` | 문자열 | 숙소 구글 지도 검색어 / 택시 카드용 현지어 숙소명 |
| `pace` | `{"columns":[날짜,권역,강도,숙소 복귀], "rows":[[...]]}` | 날짜별 권역과 강도(상·중·하) |
| `reservations` | `{"required":[[언제, 무엇]], "recommended":[...]}` | 필수 예약 / 권장 예약 |
| `closures` | `[[장소, 휴무, "M/D 요일", "ok"|"check"]]` | 방문 요일 휴무 점검 |
| `candidates` | `[{"group","name","rating","category","memo","status","reason","query"}]` | 후보·배제 목록. `status`: `sel` 선정, `alt` 대안, `off` 미배치, `exc` 배제. `rating`은 `"4.2(2,873)"`처럼 쓰면 AI 추천이 계산된다 |
| `budget` | `{"title","unit","note","rows":[[날짜, 내역, 최소, 최대, 원화]],"total":[...],"footnote"}` | 1인 비용. 날짜 줄 수 = 일수 |
| `before` | `{"note","lists":[[제목, [항목]]]}` | 출발 전 확인 (예약 / 전화·사이트 확인 / 꼭 챙길 것) |
| `calendar_extra` | `[{"date","start","end","title","location","description","alarm"}]` | 시간표에 없는 캘린더 일정 (투어 집합 등) |
| `calendar_skip` | `{"YYYY-MM-DD": [구분]}` | 그날 캘린더에서 뺄 시간표 구분 (calendar_extra로 대신할 때) |
| `source` | 문자열 | 출처·기준일 (페이지 맨 아래) |
| `geo` | `{"lat","lon","city"}` | 날씨 |
| `currency` | `{"code","symbol","name","fallback_krw_per_100"}` | 환율 계산. 국내 여행이면 빼도 된다 |
| `lang` | `{"code":"ja-JP","name":"일본어","icon":"あ","taxi":"{stay}までお願いします"}` | 회화 이름·음성 언어·택시 카드 문장. 없으면 일본어 |
| `local_tz_note` | 문자열 | "한국과 시차 없음" 등 |
| `phrases` | `[{"cat", "items":[[한국어, 현지어, 발음]]}]` | 현지 회화 (분류 6개 안팎) |
| `packing` | `[{"cat", "items":[[물건, "기내"|"위탁"]]}]` | 캐리어 짐 |
| `emergency` | `[[이름, 번호]]` | 경찰·구급·영사콜센터 같은 공공 번호만 |
| `emergency_link` | URL | 총영사관 등 |
| `flights` | `[{"date","dep","from","to","no","airline","dep_tz"}]` | 지금 카드의 '공항 도착까지' 계산 |

## days[] (하루)

```json
{
 "date": "2027-02-27", "theme": "하카타·나카스", "color": "ume",
 "summary": "도착일 · 15시 체크인 · 22시 전후 숙소 복귀",
 "simple": [{"slot": "아침", "time": "~09:30", "text": "..."}, ... 6칸],
 "route": {"mode": "transit", "stops": [{"label": "구시다 신사", "query": "櫛田神社 福岡"}]},
 "blocks": [{"time": "13:00–14:00", "type": "점심", "place": "이치란 본사 총본점", "what": "라멘 ¥1,080", "move": "도보 5분", "note": "12~13시 피크, 15~20분 대기"}],
 "alternatives": [{"when": "비·강풍", "text": "..."}],
 "places": [{"name", "local", "query", "address", "hours", "why", "tip", "cost"}]
}
```

- `simple`: 꼭 `아침 · 오전 · 점심 · 오후 · 저녁 · 밤` 6칸, 이 순서
- `color`: `ume` `hakata` `lantern` `tide` `sea` `gold` `plum` `indigo`. 날마다 다르게
- `route.mode`: `transit` `walking` `driving`. `stops`는 방문 순서, 10곳 이하. `query`는 현지어 이름 + 도시가 가장 정확하다
- `blocks.type`: `아침` `점심` `저녁` `밤` `카페` `이동` `숙소` `활동` `쇼핑`
- `blocks.time`에 `HH:MM`이 있어야 캘린더에 들어간다 (`10:10–11:35`). `오전`처럼 쓰면 페이지에만 보인다
- `blocks`의 `note`·`what`에 `예약`, `현금`/`카드 불가`, `줄서기`/`대기`가 있으면 배지가 자동으로 붙는다
- 시각은 모두 여행지 현지 시각(`timezone`). 인천 출발처럼 한국 시각은 현지 시각으로 바꿔 넣고 원래 시각은 `what`에 적는다
- 항공편 번호(`TW0203`, `7C2203`)가 `what`에 있으면 캘린더 알림이 3시간 전, 예약 배지가 있으면 1시간 전
- `places.hours`에 `화요일 휴무`, `월·화 휴무`, `토·일만`처럼 쓰면 `check_trip.py`가 그 요일 방문을 잡아낸다
