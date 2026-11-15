# 여행 플래너

여행 동선, 지도, 예약, 비용을 일행과 함께 보는 사이트예요.
주소: https://daily-jh.github.io/travel-planner/

## 구조

- `trips/<연도-월-도시>/trip.json`: 여행 하나의 데이터 (날짜별 동선, 시간표, 장소 카드, 후보, 비용, 출발 전 확인)
- `planner/build.py`: `trip.json`을 읽어 `_site/`에 페이지와 캘린더 파일(`calendar.ics`)을 만드는 생성기 (파이썬 표준 라이브러리만 사용)
- `planner/style.css`, `planner/app.js`: 공통 디자인과 지도 전환 스크립트
- `.github/workflows/pages.yml`: `main`에 올리면 자동으로 빌드해서 GitHub Pages에 배포

## 새 여행 추가

Claude에게 여행 메모(날짜·인원·숙소·항공·가고 싶은 곳)를 주고 "새 여행 추가"라고 하면 아래 순서로 만들어요. 직접 할 때도 같아요.

1. 뼈대 만들기: `python planner/new_trip.py --slug 2027-10-osaka --title "오사카, *가을* 먹방" --short 오사카 --start 2027-10-02 --end 2027-10-05 --city 오사카 --theme temple`
   날짜별 칸, 6칸 간단 일정, 비용표 날짜 줄까지 만들어지고 채울 곳은 `{채우기}`로 표시돼요.
2. 채우기: 항목 설명은 [`planner/TRIP_FORMAT.md`](planner/TRIP_FORMAT.md). 확정되지 않은 정보는 `{확인 필요}`라고 쓰면 배지로 표시돼요.
3. 점검: `python planner/check_trip.py trips/<폴더>` — 날짜·6칸 구조·휴무 요일·남은 빈칸·개인정보(전화번호·예약번호·이메일)를 확인해요. 배포 때도 자동으로 돌고, 실패하면 배포되지 않아요.
4. 썸네일: `node planner/tools/render-assets.js <폴더>`로 `og.png`를 만들어요.
5. `main`에 올리면 1~2분 뒤 여행 목록과 캘린더 파일이 함께 반영돼요.

테마: `hakata`(남색·매화), `ocean`(바다·섬), `forest`(숲·온천), `snow`(겨울·설경), `citrus`(열대·휴양), `temple`(고도·사찰).
일본이 아닌 곳은 `lang`(회화 언어·택시 카드 문장)과 `timezone`을 바꿔요. 아는 도시는 `new_trip.py`가 자동으로 넣어요.

로컬에서 보기: `python planner/build.py` 후 `_site/index.html`을 열어요.

## 캘린더

각 여행 페이지의 '캘린더에 추가' 버튼이 `calendar.ics`를 열어요.
아이폰 캘린더 구독: 설정 → 캘린더 → 계정 → 계정 추가 → 기타 → 구독 캘린더 추가에
`https://daily-jh.github.io/travel-planner/trips/<폴더>/calendar.ics`를 넣으면 일정이 바뀔 때 자동으로 반영돼요.

## 우리의 픽 저장

`planner/site.json`의 `supabase_url`, `supabase_anon_key`가 비어 있으면 픽은 각자 휴대폰에만 저장돼요.
둘을 채우면 모두가 같은 픽을 보고 고칠 수 있어요. Supabase SQL 편집기에서 한 번 실행:

```sql
create table picks (
  trip text not null, place text not null, person text not null,
  created_at timestamptz default now(),
  primary key (trip, place, person)
);
alter table picks enable row level security;
create policy "read" on picks for select using (true);
create policy "add" on picks for insert with check (true);
create policy "remove" on picks for delete using (true);
```

## 여행 도구 (여행 페이지 안)

- **날씨**: `trip.json`의 `geo`(위도·경도)로 Open-Meteo에서 불러와요. 출발 16일 전부터는 예보, 그 전에는 작년 같은 날짜의 실제 날씨예요.
- **환율 계산**: `currency.code`로 실시간 환율(open.er-api.com)을 불러오고, 안 되면 `fallback_krw_per_100`을 써요.
- **현지 한마디**: `phrases`의 [한국어, 현지어, 발음]. 누르면 휴대폰이 현지어로 읽어 줘요.
- **함께 쓴 돈**: 누가 얼마 냈는지 적으면 정산 금액을 계산해요. 지금은 각 휴대폰에만 저장돼요.
- **준비물 체크**: '출발 전 확인' 항목을 누르면 체크가 저장돼요.
- **여행 중 모드**: 여행 날짜가 되면 맨 위에 '지금·다음 일정' 카드가 떠요. 미리 보려면 주소 뒤에 `?now=2027-02-27T13:30`.
- **오프라인**: 한 번 열어 본 페이지는 인터넷이 없어도 열려요.
- **일본어 회화**: `phrases`를 `[{"cat": "식당", "items": [[한국어, 일본어, 발음], ...]}]`처럼 분류별로 써요. ⤢를 누르면 점원에게 보여 줄 수 있게 크게 떠요.
- **캐리어 짐**: `packing`에 분류별 `[물건, "기내" 또는 "위탁"]`. 체크·직접 추가한 물건은 각 휴대폰에 저장돼요.
- **비상 연락**: `emergency`의 [이름, 번호]. 번호를 누르면 전화가 걸려요.

## 화면 구성 (여행 페이지)

아래 탭 4개로 나뉘어요. 홈(지금 일정 카드, 여행 도구, 한눈에 보는 일정), 일정(날짜별 동선·지도·시간표), 장소(우리의 픽, 장소 찾기, 후보), 준비(숙소·이동·예약, 비용, 출발 전 확인).
주소 뒤에 `#day3`, `#before`처럼 붙이면 그 화면으로 바로 열려요.

## 서버 없이 되는 기능

- **일행과 맞추기**: 내 픽·함께 쓴 돈·출발 전 체크를 링크의 `#sync=` 뒤에 담아 보내요. 받은 사람이 열어 합치기를 누르면 그 휴대폰 기록과 합쳐져요. 서버에는 아무것도 올라가지 않아요.
- **사진 일지**: 시간표 줄의 '사진 추가'로 넣은 사진은 긴 쪽 1280px로 줄여 휴대폰 안(IndexedDB)에만 저장해요. 링크로는 전달되지 않아요.
- **면세 목록**: 함께 쓴 돈에서 '면세로 샀어요'를 켜고 추가하면 면세 구매만 따로 모아 보여요.
- **플랜 B**: 날짜의 `alternatives`가 팝업으로 열려요. 출발 16일 전부터 비 올 확률이 50% 이상인 날은 날씨와 지금 카드에 '플랜 B'가 떠요. 미리 보기: `?now=2027-03-01T19:30&rain=70`.
- **오프라인**: 사이트를 한 번 열면 모든 여행 페이지를 미리 저장해요.
