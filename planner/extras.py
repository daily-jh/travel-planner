"""여행 페이지에 붙는 추가 화면과 파일.

build.py가 부른다. 표준 라이브러리만 쓴다 (QR 코드는 segno가 있으면 그리고, 없으면 건너뛴다).
  - 테마 토큰 CSS (themes.json → .theme-<이름>)
  - 준비 탭의 '내려받기·연동' 칸, 여행 도구 타일·팝업 (리포트, 앨범 카드, 쇼핑, 내려받기)
  - trips/<폴더>/schedule.csv   구글 시트 IMPORTDATA·엑셀용 일정
  - trips/<폴더>/booklet.html   인쇄·PDF용 여행 책자 (planner/tools/render-pdf.js 가 booklet.pdf 로 저장)
  - trips/<폴더>/shopping/      쇼핑 리스트 (trips/<폴더>/shopping.json 이 있을 때)
"""
import csv
import io
import json
import os
import re
import shutil
from urllib.parse import quote

import build as B

HERE = os.path.dirname(os.path.abspath(__file__))
THEMES = json.load(open(os.path.join(HERE, "themes.json"), encoding="utf-8"))  # {이름: {label, mood, light, dark}}


# ---------------------------------------------------------------- 디자인 토큰
def theme_css():
    """themes.json 하나로 여행 테마 6종의 밝은·어두운 색을 만든다."""
    out = ["/* 생성됨: planner/themes.json → build.py. 직접 고치지 말 것 */"]
    for name, t in THEMES.items():
        lv = ";".join(f"--{k}:{v}" for k, v in t["light"].items())
        dv = ";".join(f"--{k}:{v}" for k, v in t["dark"].items())
        out.append(f".theme-{name}{{{lv}}}")
        out.append(f'@media (prefers-color-scheme: dark){{:root:not([data-theme="light"]) .theme-{name}{{{dv}}}}}')
        out.append(f':root[data-theme="dark"] .theme-{name}{{{dv}}}')
    return "\n".join(out) + "\n"


def site_url(slug, f=""):
    return B.BASE + f"trips/{slug}/" + f


# ---------------------------------------------------------------- 여행 도구 타일·팝업
def tiles(t):
    """(클래스, 팝업 id 또는 'href:주소', 아이콘, 이름, 부제)."""
    x = [("t-rep", "tool-rep", "▥", "여행 리포트", '<small>지출·픽·기록 차트</small>'),
         ("t-alb", "tool-alb", "▣", "앨범 카드", '<small>사진으로 SNS 카드</small>'),
         ("t-cut", "tool-cut", "▤", "네컷 사진", '<small>스티커 사진 프레임</small>')]
    if t.get("_shopping"):
        x.append(("t-shop", "href:shopping/", "¥", "쇼핑 리스트", f'<small>{len(t["_shopping"]["items"])}개 · 가격·생김새</small>'))
    return x


def sheets(slug, t):
    rep = B.sheet("tool-rep", "여행 리포트", "이 휴대폰에 쌓인 지출·픽·기록으로 그려요",
                  '<div class="rep" aria-live="polite"></div>')
    alb = B.sheet("tool-alb", "앨범 카드", "여행 기록 사진으로 카드를 만들어 저장해요", '''<div class="alb">
<div class="seg alb-fmt" role="group" aria-label="크기"><button type="button" data-fmt="post" aria-pressed="true">피드 4:5</button><button type="button" data-fmt="story" aria-pressed="false">스토리 9:16</button><button type="button" data-fmt="cover" aria-pressed="false">포토북 표지</button></div>
<label class="alb-day"><span>어느 날</span><select aria-label="날짜"></select></label>
<div class="alb-stage"><canvas width="1080" height="1350" aria-label="앨범 카드 미리보기"></canvas></div>
<p class="alb-note lead"></p>
<div class="row"><button type="button" class="btn primary" data-alb="save">이미지 저장</button><button type="button" class="btn" data-alb="share">공유</button><button type="button" class="btn" data-alb="shuffle">사진 섞기</button></div>
</div>''')
    return rep + alb + cut_sheet()


def cut_sheet():
    """네컷 사진: 사진관 스티커 사진처럼 네 칸 프레임. 여행지 그림·흰색·검정 프레임 (그림은 app.js 가 canvas 로)."""
    return B.sheet("tool-cut", "네컷 사진", "사진 네 장을 스티커 사진 프레임에 담아요", '''<div class="cut">
<div class="seg cut-frame" role="group" aria-label="프레임"><button type="button" data-frame="trip" aria-pressed="true">여행지</button><button type="button" data-frame="white" aria-pressed="false">흰색</button><button type="button" data-frame="black" aria-pressed="false">검정</button></div>
<div class="cut-opts"><div class="seg cut-lay" role="group" aria-label="모양"><button type="button" data-lay="strip" aria-pressed="true">세로 네컷</button><button type="button" data-lay="grid" aria-pressed="false">2×2</button></div>
<button type="button" class="cut-stk" data-stk aria-pressed="true">낙서 스티커</button></div>
<label class="alb-day"><span>사진</span><select aria-label="어느 날 사진"></select></label>
<div class="cut-stage"><canvas width="900" height="2700" aria-label="네컷 사진 미리보기. 칸을 누르면 그 칸 사진을 바꿔요"></canvas></div>
<p class="alb-note lead cut-note"></p>
<input type="file" accept="image/*" multiple hidden class="cut-in">
<div class="row"><button type="button" class="btn primary" data-cut="save">이미지 저장</button><button type="button" class="btn" data-cut="share">공유</button><button type="button" class="btn" data-cut="pick">앨범에서 고르기</button><button type="button" class="btn" data-cut="shuffle">사진 섞기</button></div>
</div>''')


def export_section(slug, t):
    """준비 탭: 엑셀·PDF 내려받기, 애플·구글 캘린더 구독, 구글 시트로 가져오기."""
    short = t.get("short", t["title"])
    ics = site_url(slug, "calendar.ics")
    webcal = "webcal://" + ics.split("://", 1)[-1].lstrip("/")
    gcal = "https://calendar.google.com/calendar/render?cid=" + quote(webcal, safe="")
    csv_url = site_url(slug, "schedule.csv")
    formula = f'=IMPORTDATA("{csv_url}")'
    card = lambda ic, cls, title, sub, attrs: (f'<{attrs[0]} class="dl" {attrs[1]}><span class="dl-ic {cls}" aria-hidden="true">{ic}</span>'
                                               f'<span class="dl-t"><b>{title}</b><small>{sub}</small></span><span class="dl-go" aria-hidden="true">{attrs[2]}</span></{attrs[0]}>')
    a = lambda href, extra="": ("a", f'href="{B.e(href)}" {extra}', "↓" if "download" in extra else "↗")
    btn = lambda data: ("button", f'type="button" {data}', "⧉")
    items = [
        card("X", "xls", "엑셀 일정표", "일정·장소·후보·비용·정산·준비물 시트", a("itinerary.xlsx", f'download="{B.e(short)}-여행-일정표.xlsx"')),
        card("PDF", "pdf", "PDF 여행 책자", "날짜별 일정, 경로 QR, 택시 카드, 회화 · A5 인쇄용", a("booklet.pdf", f'download="{B.e(short)}-여행-책자.pdf"')),
        card("⎙", "prn", "책자 화면으로 보기", "브라우저에서 바로 인쇄하거나 PDF로 저장", a("booklet.html", 'target="_blank" rel="noopener"')),
        card("31", "cal", "구글 캘린더에 구독", "일정이 바뀌면 구글 캘린더도 따라 바뀌어요", a(gcal, 'target="_blank" rel="noopener"')),
        card("", "ical", "애플 캘린더에 구독", "아이폰 캘린더에 여행 일정을 넣어요", a(webcal)),
        card("▦", "gs", "구글 시트로 가져오기", "수식을 복사해 새 시트 A1 칸에 붙여 넣어요", btn(f'data-copy="{B.e(formula)}" data-then="https://sheets.new"')),
        card("₩", "csv", "내 지출 내보내기", "함께 쓴 돈 기록을 엑셀·시트용 CSV로", btn('data-act="ex-csv"')),
    ]
    return (f'<section id="export"><h2>내려받기·연동</h2><p class="lead">파일은 사이트가 바뀔 때마다 새로 만들어져요. '
            f'구글 시트는 <b>파일 → 가져오기</b>로 엑셀 파일을 올려도 되고, 아래 수식을 쓰면 사이트 일정을 자동으로 따라와요.</p>'
            f'<div class="dls">{"".join(items)}</div>'
            f'<details class="gs-how card"><summary>구글 시트 수식이 뭔가요?</summary><p class="lead" style="margin:8px 0 0"><code>{B.e(formula)}</code> 를 새 시트의 A1 칸에 붙여 넣으면 '
            f'날짜·시간·장소가 표로 들어와요. 시트를 일행과 공유하면 함께 메모를 달 수 있고, 사이트 일정이 바뀌면 한 시간 안에 시트도 바뀌어요.</p></details></section>')


# ---------------------------------------------------------------- 파일
def schedule_rows(t):
    for i, d in enumerate(t["days"], 1):
        day = B.d_of(d["date"])
        for b in d["blocks"]:
            yield [d["date"], f"{i}일차", B.WEEK[day.weekday()], b["time"], b["type"], B.plain(b["place"]),
                   B.plain(b["what"]), B.plain(b["move"]), B.plain(b["note"])]


SCHEDULE_HEAD = ["날짜", "일차", "요일", "시간", "구분", "장소", "내용", "이동·소요", "메모"]


def schedule_csv(t):
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\r\n")
    w.writerow(SCHEDULE_HEAD)
    for r in schedule_rows(t):
        w.writerow(r)
    return "﻿" + buf.getvalue()  # BOM: 엑셀에서 한글이 깨지지 않게


def qr_svg(data):
    try:
        import segno
    except ImportError:
        return ""
    return segno.make(data, error="l").svg_inline(scale=3, border=0, dark="#1d1d1f", omitsize=True)


def booklet(slug, t):
    """A5 인쇄용 책자. 화면 스크립트 없이 HTML·CSS만 쓴다."""
    e, rich, plain = B.e, B.rich, B.plain
    th = THEMES.get(t.get("theme", "hakata"), THEMES["hakata"])["light"]
    start, end = B.d_of(t["start"]), B.d_of(t["end"])
    nights = (end - start).days
    names = " · ".join(x["name"] for x in t.get("travelers", []))
    title = re.sub(r"\*(.+?)\*", r"<em>\1</em>", e(t["title"]))
    P = [f'''<section class="cover"><div class="cv-top">{e(t.get("eyebrow", ""))}</div>
<h1>{title}</h1><p class="cv-when">{start:%Y.%m.%d} — {end:%m.%d} · {nights}박 {nights + 1}일</p>
<p class="cv-who">{e(names)}</p><p class="cv-intro">{rich(t.get("intro", ""))}</p>
<div class="cv-days">''' + "".join(f'<div><b>{i}</b><span>{B.md(d["date"])}</span><em>{e(d["theme"])}</em></div>' for i, d in enumerate(t["days"], 1)) +
         f'''</div><div class="cv-qr">{qr_svg(site_url(slug))}<small>여행 페이지<br>{e(site_url(slug).split("://")[-1])}</small></div></section>''']
    # 한눈에 보기
    kv = lambda rows: "".join(f"<dt>{e(k)}</dt><dd>{rich(v)}</dd>" for k, v in rows)
    res = t.get("reservations") or {}
    P.append('<section class="pg"><h2>한눈에 보기</h2><div class="two"><div><h3>숙소</h3><dl>' + kv(t.get("stay", [])) + '</dl></div>'
             '<div><h3>이동</h3><dl>' + kv(t.get("transport", [])) + '</dl></div></div>')
    if res:
        P.append('<h3>예약</h3><table class="tb"><tbody>' + "".join(
            f'<tr><td class="w">{e(a)}</td><td>{rich(b)}</td><td class="tag">{lab}</td></tr>'
            for key, lab in (("required", "필수"), ("recommended", "권장")) for a, b in res.get(key, [])) + '</tbody></table>')
    if t.get("pace"):
        P.append('<h3>날짜별 강도·복귀</h3><table class="tb"><tbody>' + "".join(
            f'<tr><td class="w">{rich(r[0])}</td><td>{rich(r[1])}</td><td>{rich(" · ".join(r[2:-1]))}</td><td class="w">{rich(r[-1])}</td></tr>' for r in t["pace"]["rows"]) + '</tbody></table>')
    P.append('</section>')
    # 날짜별
    for i, d in enumerate(t["days"], 1):
        stops = d["route"]["stops"]
        route_url = B.dirurl(d["route"]["mode"], stops) if stops else ""
        P.append(f'<section class="pg day"><div class="dh"><span class="dn">{i}일차</span><h2>{B.md(d["date"])} {e(d["theme"])}</h2><p>{rich(d.get("summary", ""))}</p></div>')
        if stops:
            q = qr_svg(route_url)
            P.append('<div class="route"><ol>' + "".join(f'<li>{e(s["label"])}</li>' for s in stops) + '</ol>'
                     + (f'<div class="qr">{q}<small>구글 지도 경로</small></div>' if q else "") + '</div>')
        P.append('<table class="tb tt"><thead><tr><th>시간</th><th>장소</th><th>내용</th><th>이동</th></tr></thead><tbody>' + "".join(
            f'<tr><td class="w">{e(b["time"])}<small>{e(b["type"])}</small></td><td class="pl">{rich(b["place"])}</td><td>{rich(b["what"])}'
            + (f'<small>{rich(b["note"])}</small>' if plain(b["note"]) else "") + f'</td><td>{rich(b["move"])}</td></tr>' for b in d["blocks"]) + '</tbody></table>')
        if d.get("places"):
            P.append('<h3>장소 메모</h3><ul class="places">' + "".join(
                f'<li><b>{e(p["name"])}</b> <span lang="ja">{e(p.get("local", ""))}</span><small>{rich(p.get("hours", ""))} · {rich(p.get("cost", ""))}</small></li>' for p in d["places"]) + '</ul>')
        pb = d.get("plan_b")
        if pb:
            P.append(f'<h3>플랜 B · {e(pb["title"])}</h3><p class="note">{rich(pb.get("when", ""))}</p><ul class="places">'
                     + "".join(f'<li><b>{e(r["slot"])} {e(r["time"])}</b> {rich(r["text"])}</li>' for r in pb["simple"])
                     + "".join(f'<li><b>{e(x["name"])}</b> <span lang="ja">{e(x.get("local", ""))}</span><small>{rich(x.get("hours", ""))}</small></li>' for x in pb.get("places", [])) + '</ul>')
        if d.get("alternatives"):
            P.append(f'<h3>{"상황별 대안" if pb else "플랜 B"}</h3><ul class="places">' + "".join(f'<li><b>{e(a["when"])}</b><small>{rich(a["text"])}</small></li>' for a in d["alternatives"]) + '</ul>')
        P.append('</section>')
    # 비용
    b = t.get("budget")
    if b:
        u = b.get("unit", "")
        P.append(f'<section class="pg"><h2>{e(b["title"])}</h2><p class="note">{rich(b.get("note", ""))}</p><table class="tb"><tbody>' + "".join(
            f'<tr{" class=tot" if b.get("total") and r is b["total"] else ""}><td class="w">{e(r[0])}</td><td>{rich(r[1])}</td><td class="w num">{u}{r[2]:,}~{r[3]:,}</td><td class="w num">{e(r[4])}</td></tr>'
            for r in b["rows"] + ([b["total"]] if b.get("total") else [])) + '</tbody></table>')
    bf = t.get("before")
    if b or bf:
        if bf:
            P.append(('<h2 style="margin-top:8mm">' if b else '<section class="pg"><h2>') + '출발 전 확인</h2><div class="two">' + "".join(
                f'<div><h3>{e(title)}</h3><ul class="ck">' + "".join(f'<li>{rich(x)}</li>' for x in items) + '</ul></div>' for title, items in bf["lists"]) + '</div>')
        P.append('</section>')
    # 짐
    if t.get("packing"):
        P.append('<section class="pg"><h2>캐리어 짐</h2><div class="cols">' + "".join(
            f'<div><h3>{e(c["cat"])}</h3><ul class="ck">' + "".join(f'<li>{e(it)} <small>{e(wh)}</small></li>' for it, wh in c["items"]) + '</ul></div>' for c in t["packing"]) + '</div></section>')
    # 회화·택시·비상
    ph = t.get("phrases") or []
    if ph and isinstance(ph[0], list):
        ph = [{"cat": "기본", "items": ph}]
    if ph:
        P.append('<section class="pg"><h2>현지 한마디</h2><div class="cols">' + "".join(
            f'<div><h3>{e(c["cat"])}</h3><ul class="phr">' + "".join(f'<li><span>{e(ko)}</span><b lang="ja">{e(j)}</b><small>{e(r)}</small></li>' for ko, j, r in c["items"][:8]) + '</ul></div>' for c in ph) + '</div></section>')
    if t.get("stay_ja") or t.get("emergency"):
        P.append('<section class="pg taxi">')
        if t.get("stay_ja"):
            P.append(f'<h2>택시 카드</h2><p class="note">기사님께 이 면을 보여 주세요.</p><div class="big" lang="ja">{e(t["stay_ja"])}<br>までお願いします</div>'
                     f'<p class="note">{e(t["stay"][0][1].split(" (")[0])}까지 가 주세요</p>')
        if t.get("emergency"):
            P.append('<h2>비상 연락</h2><dl>' + "".join(f'<dt>{e(a)}</dt><dd>{e(b)}</dd>' for a, b in t["emergency"]) + '</dl>')
        P.append('</section>')
    css = BOOKLET_CSS.replace("__PRI__", th["pri"]).replace("__ACC__", th["acc"]).replace("__SOFT__", th["pri-soft"])
    return (f'<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
            f'<title>{e(t.get("short", ""))} 여행 책자</title><meta name="robots" content="noindex">'
            '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
            '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=Noto+Sans+JP:wght@400;700&display=block">'
            f'<style>{css}</style><body><div class="screen-bar"><a href="./">← 여행 페이지</a><button onclick="print()">인쇄 · PDF로 저장</button></div>{"".join(P)}</body></html>')


BOOKLET_CSS = """
@page{size:148mm 210mm;margin:13mm 11mm 14mm}
@page{@bottom-center{content:counter(page);font:500 8pt "Noto Sans KR",sans-serif;color:#8a8f9c}}
@page:first{@bottom-center{content:none}}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font:400 8.6pt/1.5 "Noto Sans KR","Noto Sans JP",-apple-system,"Apple SD Gothic Neo",sans-serif;color:#1d1d1f;background:#fff;word-break:keep-all;overflow-wrap:anywhere}
[lang=ja]{font-family:"Noto Sans JP","Noto Sans KR",sans-serif}
h1,h2,h3{margin:0;letter-spacing:-.02em}
h2{font:700 14pt/1.25 inherit;font-family:inherit;margin:0 0 3mm;color:__PRI__}
h3{font-size:9pt;font-weight:700;margin:4mm 0 1.5mm;color:#1d1d1f;break-after:avoid}
.two>div{break-inside:avoid}
small{color:#6e6e73}
.pg{break-before:page}
.cover{height:183mm;display:flex;flex-direction:column;color:#fff;background:linear-gradient(160deg,__PRI__,color-mix(in srgb,__PRI__ 70%,#000));border-radius:5mm;padding:11mm 10mm;position:relative;overflow:hidden}
.cover:after{content:"";position:absolute;right:-30mm;top:-30mm;width:90mm;height:90mm;border-radius:50%;background:radial-gradient(color-mix(in srgb,__ACC__ 55%,transparent),transparent 70%)}
.cv-top{font-size:8pt;letter-spacing:.12em;opacity:.75}
.cover h1{font-size:30pt;line-height:1.08;font-weight:900;margin:auto 0 3mm;letter-spacing:-.04em;position:relative;z-index:1}
.cover h1 em{font-style:normal;color:color-mix(in srgb,__ACC__ 45%,#fff)}
.cv-when{font-size:11pt;font-weight:700;margin:0}.cv-who{margin:1mm 0 0;opacity:.8}
.cv-intro{opacity:.85;margin:4mm 0 5mm;max-width:105mm}
.cv-days{display:grid;grid-template-columns:repeat(5,1fr);gap:1.5mm}
.cv-days div{background:rgba(255,255,255,.12);border-radius:2.5mm;padding:2mm;display:flex;flex-direction:column;gap:.3mm}
.cv-days b{font-size:12pt}.cv-days span{font-size:7pt;opacity:.8}.cv-days em{font-style:normal;font-size:7pt;font-weight:500}
.cv-qr{display:flex;align-items:center;gap:3mm;margin-top:5mm}
.cv-qr svg{width:17mm;height:17mm;background:#fff;padding:1.5mm;border-radius:2mm}
.cv-qr small{color:rgba(255,255,255,.75);font-size:7pt}
.two{display:grid;grid-template-columns:1fr 1fr;gap:5mm}.cols{columns:2;column-gap:6mm}.cols>div{break-inside:avoid}
dl{display:grid;grid-template-columns:auto 1fr;gap:1mm 3mm;margin:0}dt{color:#6e6e73;white-space:nowrap}dd{margin:0}
.tb{width:100%;border-collapse:collapse;margin:0 0 2mm}
.tb td,.tb th{padding:1.6mm 1.5mm;border-bottom:.25mm solid #e3e4e8;vertical-align:top;text-align:left}
.tb th{font-size:7.5pt;color:#6e6e73;font-weight:500}
.tb .w{white-space:nowrap}.tb .num{text-align:right;font-variant-numeric:tabular-nums}
.tb small{display:block;font-size:7.4pt}
.tb .tag{color:__ACC__;font-weight:700;white-space:nowrap}
.tb tr.tot td{font-weight:700;border-top:.4mm solid __PRI__}
.tt tr{break-inside:avoid}.tt .pl{font-weight:700;min-width:22mm}
.dh{border-bottom:.5mm solid __PRI__;padding-bottom:2.5mm;margin-bottom:3mm}
.dh .dn{display:inline-block;background:__PRI__;color:#fff;border-radius:99px;padding:.5mm 2.5mm;font-size:7.5pt;font-weight:700}
.dh h2{margin:1.5mm 0 1mm;color:#1d1d1f}.dh p{margin:0;color:#6e6e73}
.route{display:flex;gap:4mm;align-items:flex-start;background:__SOFT__;border-radius:3mm;padding:3mm;margin-bottom:3mm}
.route ol{margin:0;padding-left:4.5mm;flex:1;columns:2;column-gap:5mm}.route li{margin:0 0 .6mm}
.qr{display:flex;flex-direction:column;align-items:center;gap:1mm}.qr svg{width:24mm;height:24mm;background:#fff;padding:1.2mm;border-radius:1.5mm}
.qr small{font-size:6.5pt}
.places{list-style:none;margin:0;padding:0}.places li{padding:1.2mm 0;border-bottom:.25mm solid #eee;break-inside:avoid}
.places li small{display:block}
.ck{list-style:none;margin:0;padding:0}.ck li{padding:.8mm 0 .8mm 5mm;position:relative;break-inside:avoid}
.ck li:before{content:"";position:absolute;left:0;top:1.6mm;width:2.6mm;height:2.6mm;border:.3mm solid #8a8f9c;border-radius:.7mm}
.phr{list-style:none;margin:0;padding:0}.phr li{padding:1mm 0;border-bottom:.25mm solid #eee;display:flex;flex-direction:column;break-inside:avoid}
.phr span{font-size:7.5pt;color:#6e6e73}.phr b{font-size:10pt}
.note{color:#6e6e73;margin:0 0 3mm}
.taxi .big{font:700 22pt/1.35 "Noto Sans JP",sans-serif;border:.5mm solid __PRI__;border-radius:4mm;padding:8mm 5mm;text-align:center;margin:2mm 0 2mm}
.taxi h2+.note{margin-bottom:0}.taxi dl{font-size:9.5pt;margin-top:2mm}
.screen-bar{display:none}
@media screen{
 body{background:#f2f2f7;padding:16px 16px 60px}
 .cover,.pg{max-width:560px;margin:0 auto 16px;background:#fff;border-radius:18px;padding:22px}
 .cover{background:linear-gradient(160deg,__PRI__,color-mix(in srgb,__PRI__ 70%,#000));height:auto;min-height:620px}
 .screen-bar{display:flex;justify-content:space-between;align-items:center;max-width:560px;margin:0 auto 14px}
 .screen-bar a{color:__PRI__;text-decoration:none;font-weight:600}
 .screen-bar button{font:600 15px inherit;font-family:inherit;border:0;border-radius:999px;padding:10px 18px;background:__PRI__;color:#fff;cursor:pointer}
 .two{grid-template-columns:1fr}
 @media (max-width:520px){.cols{columns:1}.route ol{columns:1}.tt td:nth-child(4),.tt th:nth-child(4){display:none}.cv-days{grid-template-columns:repeat(3,1fr)}}
}
"""


# ---------------------------------------------------------------- 쇼핑 리스트
SHAPES = {
    # 간단한 상품 모양. 로고·사진은 쓰지 않고 색과 실루엣만 그린다
    "box": '<rect x="14" y="16" width="52" height="48" rx="5" fill="{c1}"/><rect x="14" y="44" width="52" height="20" rx="0" fill="{c2}"/><rect x="14" y="16" width="52" height="48" rx="5" fill="none" stroke="rgba(0,0,0,.12)"/><rect x="22" y="24" width="24" height="5" rx="2.5" fill="{c3}"/>',
    "bag": '<path d="M18 18h44l-3 6 3 6-3 6 3 6-3 6 3 6-3 6 3 6H18l3-6-3-6 3-6-3-6 3-6-3-6 3-6z" fill="{c1}"/><rect x="18" y="50" width="44" height="12" fill="{c2}"/><circle cx="40" cy="36" r="9" fill="{c3}"/>',
    "bottle": '<rect x="33" y="8" width="14" height="10" rx="2" fill="{c3}"/><path d="M30 18h20v6c6 3 8 7 8 12v30a6 6 0 0 1-6 6H28a6 6 0 0 1-6-6V36c0-5 2-9 8-12z" fill="{c1}"/><rect x="22" y="40" width="36" height="18" fill="{c2}"/>',
    "can": '<rect x="24" y="12" width="32" height="58" rx="6" fill="{c1}"/><rect x="24" y="30" width="32" height="20" fill="{c2}"/><ellipse cx="40" cy="13" rx="14" ry="3" fill="{c3}"/>',
    "tube": '<path d="M28 10h24l-2 52H30z" fill="{c1}"/><rect x="31" y="62" width="18" height="10" rx="2" fill="{c3}"/><rect x="29" y="22" width="22" height="16" fill="{c2}"/>',
    "jar": '<rect x="22" y="14" width="36" height="10" rx="3" fill="{c3}"/><rect x="18" y="24" width="44" height="44" rx="9" fill="{c1}"/><rect x="18" y="38" width="44" height="16" fill="{c2}"/>',
    "pack": '<rect x="10" y="22" width="60" height="38" rx="6" fill="{c1}"/><rect x="10" y="22" width="22" height="38" rx="6" fill="{c2}"/><rect x="38" y="32" width="24" height="6" rx="3" fill="{c3}"/><rect x="38" y="42" width="16" height="5" rx="2.5" fill="{c3}" opacity=".6"/>',
    "stick": '<rect x="34" y="8" width="12" height="64" rx="5" fill="{c1}"/><rect x="34" y="8" width="12" height="16" rx="5" fill="{c3}"/><rect x="34" y="40" width="12" height="14" fill="{c2}"/>',
    "cup": '<path d="M20 22h40l-5 46a4 4 0 0 1-4 4H29a4 4 0 0 1-4-4z" fill="{c1}"/><rect x="17" y="14" width="46" height="9" rx="4" fill="{c3}"/><path d="M23 40h34l-1.6 14H24.6z" fill="{c2}"/>',
    "onigiri": '<path d="M40 12c8 0 30 38 30 48 0 6-4 10-10 10H20c-6 0-10-4-10-10 0-10 22-48 30-48z" fill="{c1}"/><rect x="28" y="44" width="24" height="26" rx="2" fill="{c2}"/><path d="M40 12 52 34H28z" fill="{c3}" opacity=".35"/>',
    "sheet": '<rect x="12" y="14" width="56" height="52" rx="4" fill="{c1}"/><rect x="18" y="20" width="44" height="40" rx="3" fill="{c2}"/><circle cx="40" cy="40" r="10" fill="{c3}"/>',
    "tin": '<rect x="12" y="28" width="56" height="36" rx="8" fill="{c1}"/><rect x="10" y="22" width="60" height="12" rx="6" fill="{c3}"/><rect x="12" y="44" width="56" height="10" fill="{c2}"/>',
}


def shape_svg(item):
    s = item.get("shape", "box")
    c = (item.get("colors") or ["#d9d9de", "#b8b8c0", "#ffffff"]) + ["#ffffff"] * 3
    body = SHAPES.get(s, SHAPES["box"]).format(c1=B.e(c[0]), c2=B.e(c[1]), c3=B.e(c[2]))
    return f'<svg viewBox="0 0 80 80" aria-hidden="true">{body}</svg>'


SHOP_IMG = "shopping-img"   # trips/<폴더>/shopping-img/ 의 사진을 _site/trips/<폴더>/shopping/img/ 로 복사


def shop_photo(slug, it):
    """shopping.json 항목의 photo가 있고 파일도 있으면 photo dict, 아니면 None"""
    ph = it.get("photo")
    if not ph or not ph.get("file"):
        return None
    return ph if os.path.isfile(os.path.join(B.ROOT, "trips", slug, SHOP_IMG, ph["file"])) else None


def shop_art(slug, it):
    e = B.e
    bg = e((it.get("colors") or ["#eee"])[0])
    ph = shop_photo(slug, it)
    if not ph:
        return f'<div class="shop-art" style="--bg:{bg}">{shape_svg(it)}</div>'
    w, h = ph.get("w", 320), ph.get("h", 320)
    return (f'<button type="button" class="shop-art has-photo" style="--bg:{bg}" data-zoom="img/{e(ph["file"])}" aria-label="{e(it["ko"])} 사진 크게 보기">'
            f'<img src="img/{e(ph["file"])}" alt="{e(it["ko"])} 사진" width="{w}" height="{h}" loading="lazy" decoding="async"></button>')


def shop_credit(slug, it):
    ph = shop_photo(slug, it)
    if not ph:
        return ""
    e = B.e
    who = " · ".join(x for x in (ph.get("credit"), ph.get("license")) if x)
    src = f'<a href="{e(ph["source"])}" target="_blank" rel="noopener">{e(who or "출처")}</a>' if ph.get("source") else e(who)
    note = f' <span>({e(ph["note"])})</span>' if ph.get("note") else ""
    return f'<p class="shop-credit">사진 {src}{note}</p>'


def shop_buy_url(it):
    """파는 곳 링크: shopping.json buy가 있으면 그것, 없으면 아마존재팬에서 일본어 상품명 검색"""
    if it.get("buy"):
        return it["buy"]
    q = it.get("ja") or it["ko"]
    b = it.get("brand", "")
    if b and not re.search(r"[가-힣]", b) and b.split("(")[0] not in q:
        q = f'{b.split("(")[0].strip()} {q}'
    return "https://www.amazon.co.jp/s?k=" + quote(q)


def shop_images(slug, data):
    """배포할 사진 파일 이름 목록"""
    return [p["file"] for p in (shop_photo(slug, it) for it in data["items"]) if p]


# 면세 계산용 가게 (where 글자로 먼저 고르고, 여행자가 바꿀 수 있다). 위에서부터 먼저 맞는 것
TF_STORES = [
    {"id": "donki", "label": "돈키호테", "kw": "돈키호테", "tf": True},
    {"id": "drug", "label": "드러그스토어", "kw": "드러그|마츠키요|선드럭|코코카라", "tf": True},
    {"id": "muji", "label": "무인양품", "kw": "무인양품", "tf": True},
    {"id": "dept", "label": "백화점·역 기념품 매장", "kw": "백화점|하카타역|기념품|아뮤|이와타야|후쿠야|가야노야", "tf": True},
    {"id": "conv", "label": "편의점·슈퍼", "kw": "편의점|슈퍼|세븐|로손|패밀리|로피아|서니|하로데이|이온", "tf": False,
     "note": "편의점·슈퍼는 대부분 면세가 안 돼요. 큰 슈퍼는 되는 곳도 있으니 계산대에 'TAX FREE' 표시를 확인해요"},
    {"id": "airport", "label": "공항 출국장 면세점", "kw": "공항", "tf": False, "note": "출국장 면세점은 처음부터 세금이 빠진 값이라 따로 모을 필요가 없어요"},
    {"id": "etc", "label": "기타 가게", "kw": "", "tf": True},
]
FOOD_CATS = {"후쿠오카 한정 기념품", "마트 식품·조미료", "편의점 먹거리", "과자·디저트"}  # 소비세 8%


def shopping_page(slug, t, data):
    e = B.e
    cur = t.get("currency") or {}
    rate = cur.get("fallback_krw_per_100", 0) / 100
    items = data["items"]
    cats = []
    for it in items:
        if it["cat"] not in cats:
            cats.append(it["cat"])
    chips = '<button type="button" data-f="all" aria-pressed="true">전체</button>' + "".join(
        f'<button type="button" data-f="{e(c)}" aria-pressed="false">{e(c)}</button>' for c in cats) + '<button type="button" data-f="mine" aria-pressed="false">담은 것</button>'
    cards = []
    store_opts = "".join(f'<option value="{s["id"]}">{e(s["label"])}</option>' for s in TF_STORES)
    for n, it in enumerate(items):
        won = f'₩{round(it["price_yen"] * rate / 100) * 100:,}' if rate and it.get("price_yen") else ""
        price = f'¥{it["price_yen"]:,}' if it.get("price_yen") else "참고가"
        food = "1" if it["cat"] in FOOD_CATS else "0"
        cards.append(f'''<article class="shop" data-cat="{e(it["cat"])}" data-id="{e(it.get("id") or f"s{n}")}" data-yen="{it.get("price_yen") or 0}" data-where="{e(it.get("where", ""))}" data-food="{food}">
{shop_art(slug, it)}
<div class="shop-b"><small class="shop-cat">{e(it["cat"])}{(" · " + e(it["brand"])) if it.get("brand") else ""}</small><h3>{e(it["ko"])}</h3>
<p class="shop-ja" lang="ja">{e(it.get("ja", ""))}</p>{f'<p class="shop-local"><span>현지인 픽</span> {e(it["local"])}</p>' if it.get("local") else ""}
<div class="shop-price"><b>{price}</b><span>{won}</span><em>{e(it.get("size", ""))}</em></div>
<p class="shop-src">{e(it.get("price_note") or "")}</p>
<p class="shop-why">{e(it.get("why", ""))}</p>
<p class="shop-look"><span>생김새</span> {e(it.get("look", ""))}</p>
<p class="shop-where"><span>어디서</span> {e(it.get("where", ""))}</p>{shop_credit(slug, it)}
<label class="shop-at" hidden><span>살 곳</span><select aria-label="살 곳">{store_opts}</select></label>
<div class="shop-act"><button type="button" class="shop-add" aria-pressed="false">담기</button><a class="shop-buy" href="{e(shop_buy_url(it))}" target="_blank" rel="noopener">아마존재팬에서 보기 ↗</a>{f'<a href="{e(it["url"])}" target="_blank" rel="noopener">상품 정보 ↗</a>' if it.get("url") else ""}<button type="button" class="shop-show" data-big="{e(it.get("ja", ""))}" data-bigko="{e(it["ko"])}">점원에게 보여 주기</button></div>
</div></article>''')
    notes = "".join(f'<li>{B.rich(x)}</li>' for x in data.get("notes", []))
    srcs = data.get("checked", "")
    body = f'''<header class="hero shop-hero"><div class="wrap">
<div class="topbar">{B.brand("../../../")}<a class="back" href="../">{e(t.get("short", ""))} 여행</a></div>
<div class="eyebrow">SHOPPING LIST · {e(t.get("short", ""))}·일본</div>
<h1>꼭 사 올 <em>쇼핑 리스트</em></h1>
<p>편의점, 마트, 드러그스토어, 기념품 {len(items)}가지를 가격과 사진으로 정리했어요. 일본 현지인이 실제로 자주 사는 것은 “현지인 픽”으로 표시했어요. 사진을 누르면 크게 보여요. 담기를 누르면 이 휴대폰에 저장되고 합계가 계산돼요.</p>
</div><div class="kenjo" aria-hidden="true"></div></header>
<main class="wrap">
<section class="shop-sum card" aria-live="polite"><div><small>담은 것</small><b class="ss-n">0개</b></div><div><small>합계</small><b class="ss-y">¥0</b><span class="ss-w"></span></div><div class="ss-tf"><small>면세 (2026-11 바뀜)</small><span>세금 포함으로 내고 출국할 때 돌려받아요 · 같은 가게 하루 ¥5,000 이상(세금 제외, 일반 상품은 세금 포함 ¥5,500·식품은 ¥5,400쯤)</span></div></section>
<section class="card tfx-card"><h3>가게별 면세 계산</h3><p class="lead" style="margin:0 0 10px;font-size:13px">담은 물건을 살 곳별로 모았어요. 물건 카드의 ‘살 곳’을 바꾸면 다시 계산해요. 같은 가게에서 <b>같은 날</b> 산 것만 합쳐져요. 여권을 꼭 챙겨요.</p><div class="tfx" aria-live="polite"></div></section>
<div class="shop-f seg" role="group" aria-label="분류">{chips}</div>
<section class="shops">{"".join(cards)}</section>
<section class="card shop-notes"><h3>사기 전에</h3><ul>{notes}</ul><p class="lead" style="font-size:13px;margin:8px 0 0">가격은 {e(srcs)} 기준 일반 판매가(세금 포함)예요. 가게·시기마다 달라요. 사진은 위키미디어 커먼즈의 자유 이용 사진이라 지금 파는 포장과 다를 수 있어요. 사진이 없는 제품은 포장 색과 모양을 단순하게 그렸으니, 아마존재팬에서 보기를 눌러 실제 포장을 확인해요.</p></section>
</main>
<dialog class="shop-zoom" aria-label="사진 크게 보기"><img alt=""><span>화면을 누르면 닫혀요</span></dialog>
<dialog class="bigshow" aria-label="크게 보여주기"><b lang="ja"></b><small></small><span>화면을 누르면 닫혀요</span></dialog>
<footer><div class="wrap">원화는 ¥100 ≈ ₩{cur.get("fallback_krw_per_100", "")}로 어림했어요.</div></footer>
<script type="application/json" id="shop-cfg">{json.dumps({"trip": slug, "rate": rate, "tf_min": 5000, "stores": TF_STORES}, ensure_ascii=False)}</script>'''
    og = {"title": f'{t.get("short", "")} 쇼핑 리스트', "desc": f"편의점·마트·드러그스토어 {len(items)}가지, 가격과 생김새", "image": f"trips/{slug}/og.png", "path": f"trips/{slug}/shopping/"}
    return B.page(f'{t.get("short", "")} 쇼핑 리스트', body, 3, t.get("theme", "hakata"), og=og).replace("<body class=\"", "<body class=\"shop-page ", 1)


def load_shopping(slug):
    p = os.path.join(B.ROOT, "trips", slug, "shopping.json")
    return json.load(open(p, encoding="utf-8")) if os.path.isfile(p) else None


def write_trip_files(od, slug, t):
    open(os.path.join(od, "schedule.csv"), "w", encoding="utf-8", newline="").write(schedule_csv(t))
    open(os.path.join(od, "booklet.html"), "w", encoding="utf-8").write(booklet(slug, t))
    extra = [f"trips/{slug}/booklet.html"]  # 오프라인에서도 책자 화면이 열리게 미리 저장
    if t.get("_shopping"):
        os.makedirs(os.path.join(od, "shopping"), exist_ok=True)
        open(os.path.join(od, "shopping", "index.html"), "w", encoding="utf-8").write(shopping_page(slug, t, t["_shopping"]))
        extra.append(f"trips/{slug}/shopping/")
        imgs = shop_images(slug, t["_shopping"])
        if imgs:
            os.makedirs(os.path.join(od, "shopping", "img"), exist_ok=True)
            for f in imgs:
                shutil.copy(os.path.join(B.ROOT, "trips", slug, SHOP_IMG, f), os.path.join(od, "shopping", "img", f))
            extra += [f"trips/{slug}/shopping/img/{f}" for f in imgs]
    return extra


# ---------------------------------------------------------------- 디자인 시스템 미리보기 (/design/)
def design_page():
    e = B.e
    sw = []
    for name, t in THEMES.items():
        chips = "".join(f'<span class="ds-sw" style="background:{v}"><small>{k}<br>{v}</small></span>' for k, v in t["light"].items() if k in ("pri", "pri-soft", "acc", "acc-soft"))
        dark = "".join(f'<span class="ds-sw" style="background:{v}"><small>{k}<br>{v}</small></span>' for k, v in t["dark"].items() if k in ("pri", "pri-soft", "acc", "acc-soft"))
        sw.append(f'<div class="card theme-{name} ds-theme"><div class="ds-cover"><small>{e(name)}</small><b>{e(t["label"])}</b><span>{e(t["mood"])}</span></div>'
                  f'<p class="ds-k">밝은 화면</p><div class="ds-row">{chips}</div><p class="ds-k">어두운 화면</p><div class="ds-row dk">{dark}</div></div>')
    scale = [("--fs-large", "34", "큰 제목"), ("--fs-t1", "28", "제목 1"), ("--fs-t2", "22", "제목 2 · 숫자 타일"), ("--fs-t3", "20", "제목 3 · 가격"),
             ("--fs-body", "17", "본문 · 카드 제목"), ("--fs-sub", "15", "보조 본문 · 설명"), ("--fs-foot", "13", "각주 · 메타"), ("--fs-cap", "12", "캡션 · 라벨")]
    type_rows = "".join(f'<li><span style="font-size:var({k});font-weight:{700 if int(px) >= 20 else 500}">여행 플래너 {px}</span><code>{k} · {px}px</code><small>{u}</small></li>' for k, px, u in scale)
    body = f'''<header class="hero"><div class="wrap"><div class="topbar">{B.brand("../")}</div>
<div class="eyebrow">DESIGN SYSTEM</div><h1>여행 플래너 <em>디자인 시스템</em></h1>
<p>테마 6종의 색, 글자 크기, 간격, 컴포넌트를 한곳에 모았어요. 새 여행을 추가할 때 이 화면과 planner/DESIGN.md를 기준으로 맞춰요.</p></div><div class="kenjo" aria-hidden="true"></div></header>
<main class="wrap">
<section><h2>여행 테마</h2><p class="lead">색은 planner/themes.json 한 파일에서만 바꿔요. 어두운 화면 색도 따로 정해 두었어요.</p><div class="ds-themes">{"".join(sw)}</div></section>
<section><h2>글자 크기</h2><div class="card"><ul class="ds-type">{type_rows}</ul></div></section>
<section><h2>간격·모서리·움직임</h2><div class="card ds-tokens">
<div><h3>간격</h3>{"".join(f'<p><i style="width:var(--sp-{n})"></i><code>--sp-{n}</code></p>' for n in range(1, 7))}</div>
<div><h3>모서리</h3>{"".join(f'<p><b style="border-radius:var({k})"></b><code>{k}</code></p>' for k in ("--r-xs", "--r-sm", "--r-ctl", "--r-md", "--r-card", "--r-pill"))}</div>
<div><h3>움직임</h3><p><code>--dur-1 .18s</code> 누름</p><p><code>--dur-2 .32s</code> 시트·전환</p><p><code>--dur-3 .5s</code> 카드 등장</p><p><code>--ease</code> iOS 스프링 곡선</p></div></div></section>
<section><h2>컴포넌트</h2><div class="card ds-comp">
<h3>버튼</h3><div class="row"><button class="btn primary" type="button">주 버튼</button><button class="btn" type="button">보조 버튼</button></div>
<h3>세그먼트</h3><div class="seg" role="group"><button type="button" aria-pressed="true">전체</button><button type="button" aria-pressed="false">기내</button><button type="button" aria-pressed="false">위탁</button></div>
<h3>여행 도구 타일</h3><div class="tools"><span class="tool t-rep"><span class="ti">▥</span><b>여행 리포트</b><small>지출·픽·기록 차트</small></span><span class="tool t-alb"><span class="ti">▣</span><b>앨범 카드</b><small>사진으로 SNS 카드</small></span><span class="tool t-cut"><span class="ti">▤</span><b>네컷 사진</b><small>스티커 사진 프레임</small></span><span class="tool t-shop"><span class="ti">¥</span><b>쇼핑 리스트</b><small>가격·생김새</small></span></div>
<h3>내려받기 줄</h3><div class="dls"><span class="dl"><span class="dl-ic xls">X</span><span class="dl-t"><b>엑셀 일정표</b><small>일정·정산 시트</small></span><span class="dl-go">↓</span></span></div>
<h3>배지</h3><p><span class="chk">확인 필요</span> <span class="ai">AI 추천</span></p>
<h3>차트 색 (dataviz 기본 팔레트)</h3><div class="ds-row">{"".join(f'<span class="ds-sw" style="background:var(--viz-{n})"><small>--viz-{n}</small></span>' for n in range(1, 7))}</div>
</div></section></main>
<footer><div class="wrap">규칙: 애플풍으로 깔끔하게, 바코드 줄무늬·손글씨 같은 장식은 쓰지 않아요. 휴대폰에서 가로로 밀리지 않게 해요.</div></footer>'''
    css = '''<style>.ds-themes{display:grid;gap:12px;grid-template-columns:minmax(0,1fr)}@media(min-width:760px){.ds-themes{grid-template-columns:repeat(3,minmax(0,1fr))}}
.ds-cover{border-radius:14px;padding:16px;color:#fff;background:linear-gradient(160deg,var(--pri),color-mix(in srgb,var(--pri) 60%,#000));display:grid;gap:2px;margin-bottom:10px}.ds-cover small{opacity:.7;font-size:12px}.ds-cover b{font-size:20px}.ds-cover span{font-size:13px;opacity:.85}
.ds-k{margin:8px 0 4px;font-size:12px;color:var(--label2)}.ds-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px}.ds-row.dk{background:#000;padding:6px;border-radius:10px}
.ds-sw{height:56px;border-radius:10px;display:flex;align-items:flex-end;padding:5px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.06)}.ds-sw small{font-size:10px;line-height:1.2;background:rgba(255,255,255,.85);color:#1d1d1f;border-radius:4px;padding:1px 3px}
.ds-type{list-style:none;margin:0;padding:0}.ds-type li{display:grid;gap:2px;padding:10px 0;border-bottom:1px solid var(--sep)}.ds-type code,.ds-tokens code{font-size:12px;color:var(--label2)}.ds-type small{font-size:12px;color:var(--label2)}
.ds-tokens{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}.ds-tokens p{display:flex;align-items:center;gap:8px;margin:6px 0}.ds-tokens i{display:inline-block;height:12px;background:var(--pri);border-radius:3px}.ds-tokens b{display:inline-block;width:40px;height:28px;background:var(--pri-soft);border:1px solid var(--pri)}
.ds-comp h3{margin:18px 0 8px;font-size:15px}.ds-comp h3:first-child{margin-top:0}.ds-comp .tools{grid-template-columns:repeat(3,minmax(0,1fr))}</style>'''
    og = {"title": "여행 플래너 디자인 시스템", "desc": "테마 6종의 색, 글자 크기, 컴포넌트", "image": "assets/og-home.png", "path": "design/"}
    return B.page("디자인 시스템 · " + B.SITE_NAME, css + body, 1, "hakata", og=og)
