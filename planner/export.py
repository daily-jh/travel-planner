"""여행마다 엑셀 일정표(_site/trips/<폴더>/itinerary.xlsx)를 만든다.

build.py 다음에 실행:  pip install openpyxl && python planner/export.py
openpyxl이 없으면 아무것도 하지 않고 끝난다 (사이트 배포는 막지 않는다).
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build as B  # noqa: E402
import extras  # noqa: E402

try:
    from openpyxl import Workbook
    from openpyxl.comments import Comment
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import get_column_letter
    from openpyxl.worksheet.datavalidation import DataValidation
except ImportError:
    print("openpyxl 없음: 엑셀 파일을 건너뛰어요")
    sys.exit(0)

FONT = "Arial"
INPUT = Font(name=FONT, color="0000FF")          # 직접 고치는 칸
HEAD_FILL = PatternFill("solid", fgColor="24346B")
EDIT_FILL = PatternFill("solid", fgColor="FFF8D6")
THIN = Side(style="thin", color="DCDFE8")


def theme_hex(t):
    th = extras.THEMES.get(t.get("theme", "hakata"), extras.THEMES["hakata"])["light"]
    return th["pri"].lstrip("#").upper(), th["pri-soft"].lstrip("#").upper()


def table(ws, head, rows, widths, start=1, fill="24346B"):
    for c, h in enumerate(head, 1):
        x = ws.cell(row=start, column=c, value=h)
        x.font = Font(name=FONT, bold=True, color="FFFFFF")
        x.fill = PatternFill("solid", fgColor=fill)
        x.alignment = Alignment(vertical="center")
    for r, row in enumerate(rows, start + 1):
        for c, v in enumerate(row, 1):
            x = ws.cell(row=r, column=c, value=v)
            x.font = Font(name=FONT)
            x.alignment = Alignment(wrap_text=True, vertical="top")
            x.border = Border(bottom=THIN)
    for c, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(c)].width = w
    ws.freeze_panes = ws.cell(row=start + 1, column=1)
    return start + len(rows)


def title(ws, text, sub, pri):
    ws["A1"] = text
    ws["A1"].font = Font(name=FONT, bold=True, size=16, color=pri)
    ws["A2"] = sub
    ws["A2"].font = Font(name=FONT, color="6E6E73")


def workbook(slug, t):
    B.use_map(t)
    pri, soft = theme_hex(t)
    plain = B.plain
    wb = Workbook()
    short = t.get("short", t["title"])
    start, end = B.d_of(t["start"]), B.d_of(t["end"])
    nights = (end - start).days
    cur = t.get("currency") or {}
    if B.domestic(t) or not cur:  # 국내 여행: 원화 그대로 (환율 칸은 100 = 1:1)
        cur = {"symbol": "₩", "fallback_krw_per_100": 100}
    sym = cur.get("symbol", "")

    # 1. 요약
    ws = wb.active
    ws.title = "요약"
    title(ws, f"{short} 여행 · {start:%Y.%m.%d}~{end:%m.%d} ({nights}박 {nights + 1}일)", f"여행 페이지: {extras.site_url(slug)}", pri)
    rows = [[k, plain(v)] for k, v in t.get("facts", [])] + [["", ""]]
    rows += [["숙소 · " + k, plain(v)] for k, v in t.get("stay", [])]
    rows += [["이동 · " + k, plain(v)] for k, v in t.get("transport", [])]
    res = t.get("reservations") or {}
    rows += [[f"예약 {'필수' if k == 'required' else '권장'} · {a}", plain(b)] for k in ("required", "recommended") for a, b in res.get(k, [])]
    rows += [["", ""], ["날짜별 테마", ""]] + [[f"{i}일차 {B.md(d['date'])}", f"{d['theme']} · {plain(d.get('summary', ''))}"] for i, d in enumerate(t["days"], 1)]
    table(ws, ["항목", "내용"], rows, [26, 90], start=4, fill=pri)
    ws["A3"] = "시트: 일정 · 장소 · 후보 · 예상 비용 · 정산 · 준비물 · 출발 전 확인. 파란 글씨·노란 칸은 직접 고치는 칸이에요."
    ws["A3"].font = Font(name=FONT, italic=True, color="6E6E73")

    # 2. 일정
    ws = wb.create_sheet("일정")
    n = table(ws, extras.SCHEDULE_HEAD + ["다녀옴", "메모(직접)"], [r + ["", ""] for r in extras.schedule_rows(t)],
              [11, 7, 5, 12, 7, 26, 40, 24, 30, 8, 24], fill=pri)
    dv = DataValidation(type="list", formula1='"✓,"', allow_blank=True)
    ws.add_data_validation(dv)
    dv.add(f"J2:J{n}")
    for r in range(2, n + 1):
        for c in (10, 11):
            ws.cell(row=r, column=c).fill = EDIT_FILL
            ws.cell(row=r, column=c).font = INPUT
    ws.auto_filter.ref = f"A1:K{n}"

    # 3. 장소
    ws = wb.create_sheet("장소")
    rows = []
    for i, d in enumerate(t["days"], 1):
        for p in d.get("places", []):
            rows.append([f"{i}일차 {B.md(d['date'])}", p["name"], p.get("local", ""), plain(p.get("address", "")), plain(p.get("hours", "")),
                         plain(p.get("cost", "")), plain(p.get("why", "")), B.gmap(p.get("query") or p["name"])])
    n = table(ws, ["날짜", "장소", "현지 이름", "주소", "영업·휴무", "예상 비용", "추천 이유", B.MAP["name"]], rows, [14, 26, 24, 26, 34, 18, 40, 20], fill=pri)
    for r in range(2, n + 1):
        c = ws.cell(row=r, column=8)
        c.hyperlink, c.value = c.value, "지도 열기"
        c.font = Font(name=FONT, color="0563C1", underline="single")
    ws.auto_filter.ref = f"A1:H{n}"

    # 4. 후보
    ws = wb.create_sheet("후보")
    rows = [[c["group"], c["name"], B.STATUS[c["status"]], c.get("rating", ""), c.get("category", ""), c.get("memo", ""), plain(c.get("reason", ""))] for c in t.get("candidates", [])]
    n = table(ws, ["분류", "장소", "상태", "평점(리뷰)", "종류", "지도 메모", "이유"], rows, [26, 30, 7, 14, 18, 14, 44], fill=pri)
    ws.auto_filter.ref = f"A1:G{n}"

    # 5. 예상 비용: 환율 칸을 고치면 원화가 다시 계산된다
    b = t.get("budget")
    if b:
        ws = wb.create_sheet("예상 비용")
        title(ws, b["title"], plain(b.get("note", "")), pri)
        ws["A3"], ws["B3"] = (f"원화 환율 (₩ / {sym}100)" if sym != "₩" else "원화 그대로 (100)"), cur.get("fallback_krw_per_100", 0)
        ws["B3"].font, ws["B3"].fill = INPUT, EDIT_FILL
        ws["C3"] = "가정: trip.json 기본 환율. 바뀌면 이 칸만 고쳐요."
        ws["C3"].font = Font(name=FONT, italic=True, color="6E6E73")
        rows = [[r[0], plain(r[1]), r[2], r[3]] for r in b["rows"]]
        last = table(ws, ["날짜", "구성", f"최소 ({sym})", f"최대 ({sym})", "최소 (₩)", "최대 (₩)"], rows, [12, 56, 12, 12, 14, 14], start=5, fill=pri)
        for r in range(6, last + 1):
            ws[f"E{r}"] = f"=ROUND(C{r}*$B$3/100,-2)"
            ws[f"F{r}"] = f"=ROUND(D{r}*$B$3/100,-2)"
            for col in "CDEF":
                ws[f"{col}{r}"].number_format = '#,##0'
        tot = last + 1
        ws[f"A{tot}"], ws[f"B{tot}"] = "합계", "1인 기준"
        for col in "CDEF":
            ws[f"{col}{tot}"] = f"=SUM({col}6:{col}{last})"
            ws[f"{col}{tot}"].number_format = '#,##0'
            ws[f"{col}{tot}"].font = Font(name=FONT, bold=True)
        ws[f"A{tot}"].font = Font(name=FONT, bold=True)

    # 6. 정산: 함께 쓴 돈을 적으면 1인당·정산 금액이 계산된다
    names = [x["name"] for x in t.get("travelers", [])] or ["나"]
    ws = wb.create_sheet("정산")
    title(ws, "함께 쓴 돈 정산", "노란 칸에 쓴 돈을 적으면 오른쪽 요약이 자동으로 계산돼요. 2행은 예시라 지우고 써도 돼요.", pri)
    head = ["날짜", "내용", "분류", "낸 사람", f"금액 ({sym})", "면세", "원화 (₩)"]
    for c, h in enumerate(head, 1):
        x = ws.cell(row=4, column=c, value=h)
        x.font, x.fill = Font(name=FONT, bold=True, color="FFFFFF"), PatternFill("solid", fgColor=pri)
    ex = [B.md(t["start"]), "라멘 (예시)", "식비", names[0], 1960, ""]
    for c, v in enumerate(ex, 1):
        ws.cell(row=5, column=c, value=v).font = INPUT
    rows_end = 104
    for r in range(5, rows_end + 1):
        for c in range(1, 7):
            ws.cell(row=r, column=c).fill = EDIT_FILL
            if r > 5:
                ws.cell(row=r, column=c).font = INPUT
        ws[f"E{r}"].number_format = '#,##0'
        ws[f"G{r}"] = f'=IF(E{r}="","",ROUND(E{r}*$K$3/100,0))'
        ws[f"G{r}"].number_format = '#,##0'
    cats = ["식비", "교통", "쇼핑", "카페·간식", "입장료", "기타"]
    dv = DataValidation(type="list", formula1='"' + ",".join(cats) + '"', allow_blank=True)
    dv2 = DataValidation(type="list", formula1='"' + ",".join(names) + '"', allow_blank=True)
    dv3 = DataValidation(type="list", formula1='"면세,"', allow_blank=True)
    for v, rng in ((dv, f"C5:C{rows_end}"), (dv2, f"D5:D{rows_end}"), (dv3, f"F5:F{rows_end}")):
        ws.add_data_validation(v)
        v.add(rng)
    ws["J3"], ws["K3"] = f"환율 (₩/{sym}100)", cur.get("fallback_krw_per_100", 0)
    ws["K3"].font, ws["K3"].fill = INPUT, EDIT_FILL
    ws["K3"].comment = Comment("가정: trip.json의 기본 환율. 실제 환전 환율로 바꿔요.", "여행 플래너")
    R = f"$E$5:$E${rows_end}"
    summary = [("총 지출", f"=SUM({R})"), ("1인당", f"=IFERROR(K5/{len(names)},0)")]
    for n_ in names:
        summary.append((f"{n_}가 낸 돈", f'=SUMIF($D$5:$D${rows_end},"{n_}",{R})'))
    if not B.domestic(t):
        summary.append(("면세 구매 합계", f'=SUMIF($F$5:$F${rows_end},"면세",{R})'))
    for k, (lab, f) in enumerate(summary, 5):
        ws[f"J{k}"], ws[f"K{k}"] = lab, f
        ws[f"K{k}"].number_format = '#,##0'
        ws[f"J{k}"].font = Font(name=FONT, bold=True)
    k = 5 + len(summary)
    if len(names) == 2:
        a, b_ = names
        ws[f"J{k}"] = "정산"
        ws[f"K{k}"] = f'=IF(ABS(K7-K6)<1,"딱 반반",IF(K7>K6,"{b_} → {a} "&TEXT(K7-K6,"#,##0"),"{a} → {b_} "&TEXT(K6-K7,"#,##0")))'
        ws[f"J{k}"].font = Font(name=FONT, bold=True)
        k += 1
    ws[f"J{k + 1}"] = "분류별"
    ws[f"J{k + 1}"].font = Font(name=FONT, bold=True)
    for m, c in enumerate(cats, k + 2):
        ws[f"J{m}"], ws[f"K{m}"] = c, f'=SUMIF($C$5:$C${rows_end},"{c}",{R})'
        ws[f"K{m}"].number_format = '#,##0'
    for col, w in zip("ABCDEFGHIJK", [10, 30, 11, 10, 12, 7, 12, 3, 3, 18, 16]):
        ws.column_dimensions[col].width = w
    ws.freeze_panes = "A5"

    # 7. 준비물, 8. 출발 전 확인
    if t.get("packing"):
        ws = wb.create_sheet("준비물")
        rows = [[c["cat"], it, wh, ""] for c in t["packing"] for it, wh in c["items"]]
        n = table(ws, ["분류", "물건", "기내/위탁", "챙김"], rows, [14, 40, 10, 8], fill=pri)
        for r in range(2, n + 1):
            ws[f"D{r}"].fill, ws[f"D{r}"].font = EDIT_FILL, INPUT
        ws[f"F1"], ws[f"G1"] = "챙긴 개수", f'=COUNTIF(D2:D{n},"?*")&" / {len(rows)}"'
        dv = DataValidation(type="list", formula1='"✓,"', allow_blank=True)
        ws.add_data_validation(dv)
        if n >= 2:
            dv.add(f"D2:D{n}")
    bf = t.get("before")
    if bf:
        ws = wb.create_sheet("출발 전 확인")
        rows = [[k, plain(x), ""] for k, items in bf["lists"] for x in items]
        n = table(ws, ["분류", "할 일", "완료"], rows, [16, 70, 8], fill=pri)
        for r in range(2, n + 1):
            ws[f"C{r}"].fill, ws[f"C{r}"].font = EDIT_FILL, INPUT
        dv = DataValidation(type="list", formula1='"✓,"', allow_blank=True)
        ws.add_data_validation(dv)
        if n >= 2:  # 빈 목록이면 범위를 만들 수 없다
            dv.add(f"C2:C{n}")
    wb.properties.title = f"{short} 여행 일정표"
    wb.properties.creator = "여행 플래너"
    return wb


def main():
    tdir = os.path.join(B.ROOT, "trips")
    for slug in sorted(os.listdir(tdir)):
        p = os.path.join(tdir, slug, "trip.json")
        od = os.path.join(B.OUT, "trips", slug)
        if not os.path.isfile(p) or not os.path.isdir(od):
            continue
        t = json.load(open(p, encoding="utf-8"))
        out = os.path.join(od, "itinerary.xlsx")
        workbook(slug, t).save(out)
        print(f"{slug}: 엑셀 {os.path.getsize(out) // 1024}KB")


if __name__ == "__main__":
    main()
