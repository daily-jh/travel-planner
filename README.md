# 여행 플래너

여행 동선, 지도, 예약, 비용을 일행과 함께 보는 사이트예요.
주소: https://daily-jh.github.io/travel-planner/

## 구조

- `trips/<연도-월-도시>/trip.json`: 여행 하나의 데이터 (날짜별 동선, 시간표, 장소 카드, 후보, 비용, 출발 전 확인)
- `planner/build.py`: `trip.json`을 읽어 `_site/`에 페이지와 캘린더 파일(`calendar.ics`)을 만드는 생성기 (파이썬 표준 라이브러리만 사용)
- `planner/style.css`, `planner/app.js`: 공통 디자인과 지도 전환 스크립트
- `.github/workflows/pages.yml`: `main`에 올리면 자동으로 빌드해서 GitHub Pages에 배포

## 새 여행 추가

1. `trips/2027-03-fukuoka/trip.json`을 복사해 `trips/<연도-월-도시>/trip.json`을 만들어요.
2. 날짜, `route.stops`(이름 + 구글 지도 검색어), `blocks`(시간표)를 채워요. 확정되지 않은 정보는 `{확인 필요}`라고 쓰면 배지로 표시돼요.
3. `"theme"`에 여행지 분위기에 맞는 테마를 적어요: `hakata`(남색·매화), `ocean`(바다·섬), `forest`(숲·온천), `snow`(겨울·설경), `citrus`(열대·휴양), `temple`(고도·사찰).
4. `"travelers"`에 함께 가는 사람 이름을 적으면 장소마다 픽(♥)을 고를 수 있어요. 전화번호는 어디에도 적지 않아요.
5. `main`에 올리면 1~2분 뒤 사이트에 반영돼요.

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
