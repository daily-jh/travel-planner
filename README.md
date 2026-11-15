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

## 내려받기·연동 (준비 탭 맨 아래)

- **엑셀 일정표** `itinerary.xlsx`: 요약·일정·장소·후보·예상 비용·정산·준비물·출발 전 확인 시트. 정산 시트에 쓴 돈을 적으면 1인당·정산 금액이 계산돼요. `planner/export.py`가 만들어요(openpyxl).
- **PDF 여행 책자** `booklet.pdf`: A5 크기, 날짜별 일정과 구글 지도 경로 QR, 회화, 택시 카드. `booklet.html`을 `planner/tools/render-pdf.js`가 PDF로 저장해요. 책자 화면에서 바로 인쇄해도 돼요.
- **구글 캘린더 구독**: `calendar.ics`를 구글 캘린더에 구독으로 넣어요.
- **구글 시트**: 새 시트 A1에 `=IMPORTDATA("…/schedule.csv")`를 넣으면 일정이 들어오고 사이트가 바뀌면 따라 바뀌어요.
- **내 지출 CSV**: 함께 쓴 돈 기록을 CSV로 내려받아요.

엑셀·PDF는 GitHub Actions에서 만들어요. 실패해도 사이트 배포는 계속돼요.

## 여행 리포트·앨범 카드·쇼핑 리스트

- **여행 리포트**: 이 휴대폰의 함께 쓴 돈, 픽, 여행 기록으로 날짜별 지출(예상 범위와 비교), 분류별·낸 사람별 지출, 픽 나눔, 다녀온 곳을 차트로 보여 줘요.
- **앨범 카드**: 여행 기록에 넣은 사진으로 피드(4:5)·스토리(9:16)·포토북 표지(정사각) 카드를 그려 저장·공유해요. 사진은 휴대폰 밖으로 나가지 않아요.
- **쇼핑 리스트**: `trips/<폴더>/shopping.json`이 있으면 `trips/<폴더>/shopping/` 페이지가 생겨요. 상품마다 `cat, ko, ja, brand, size, price_yen, price_note, where, why, look, url, shape, colors`. 그림은 `shape`(box·bag·bottle·can·tube·jar·pack·stick·cup·onigiri·sheet·tin)와 `colors` 3개로 단순하게 그려요.

## 디자인 시스템

테마 색은 `planner/themes.json` 한 곳에만 있고, 규칙은 `planner/DESIGN.md`, 모습은 사이트의 `/design/` 페이지에서 봐요.
