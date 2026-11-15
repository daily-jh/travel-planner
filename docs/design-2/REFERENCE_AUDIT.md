# 레퍼런스 조사 (디자인 고도화 2탄)

조사 일시: 2026-11-15, 헤드리스 Chromium(Playwright)으로 직접 접속. 화면 캡처는 작업 환경에만 있고 저장소에는 넣지 않았어요(타사 이미지라서).
표기: **[확인]** 직접 열어 본 사실 · **[추론]** 그 사실에서 끌어낸 판단.

| 사이트 | 접속 | 관찰한 것 | 우리 사이트에 쓴 원리 |
|---|---|---|---|
| brandlogo.co | 200 | [확인] 업종(Tech·Retail·Agencies)·서체(Condensed·Serif…)·형태(Circle 등) 태그로 거르는 로고 모음 | 1탄 로고(`planner/brand/mark.svg`)를 바꾸지 않음. 작은 크기 식별성만 재확인 |
| icon.museum | 200 | [확인] "Curated App Icon Gallery", iOS 255개, 색·검색 필터. 이미지 CDN은 이 환경에서 막힘 | 아이콘 변경 없음 (1탄 앱 아이콘 유지) |
| admiretheweb.com | 200 | [확인] 카테고리(Responsive 1546, Product 452…)와 색상 필터, 최신 사례 카드 목록 | [추론] 첫 화면은 핵심 행동 하나, 나머지는 단계적 공개 → 기존 4탭 구조 유지가 맞음 |
| ogfolio.com | 200 | [확인] OG 이미지 갤러리 + OG Image Analyzer(크기·용량·메타 점검) | 우리 OG 메타 점검: og:title/description/image(1200×630)/url, twitter:card 모두 있음 → 변경 없음 |
| umanmade.com | 200 | [확인] Micro interaction·Motion 분류, "Tabs with a little d", "Side Navbar Hover", "Dropdown" 등. **상세 보기는 네이티브 `<dialog>`이고 주소에 `#post=…`를 붙여 기록을 한 칸 쌓음 → 뒤로 가기·Esc 모두 닫힘, 열리면 dialog에 포커스, body 스크롤 잠금, `data-phase`로 열림·닫힘 단계 표시** | 팝업 시트에 같은 약속 적용: 뒤로 가기로 닫기, 닫힘 단계(`data-phase="closing"`) 움직임. 탭 표시가 미끄러지는 'fluid tab' 원리 |
| wellmade.fyi | 502 | 응답 실패 (1탄 때도 연결 끊김) | **미확인** — 근거로 쓰지 않음 |

## 검토한 라이브러리·스킬

| 후보 | 판단 |
|---|---|
| Motion, animate-ui, keyframery, motion-primitives, shadcn/ui, Radix | 모두 React 전제. 이 사이트는 파이썬 생성기 + 바닐라 JS라 **도입하지 않음** (지침서 A2의 "React가 아니면 억지로 이식하지 말 것"에 따름) |
| CSS View Transitions | iOS Safari 18부터라 여행 일행 기기 범위를 장담 못 함 → CSS 키프레임 + `transform/opacity`로 대체 |
| axe-core 4.10.2 (MPL-2.0) | 검수에만 작업 환경에서 사용, 저장소·사이트에는 넣지 않음 |
| 새 Claude 스킬·MCP | 설치하지 않음 (승인 필요 항목) |
