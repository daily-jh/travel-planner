"""여행 플래너 사이트 생성기.

trips/<폴더>/trip.json 을 모두 읽어서 _site/ 아래에 정적 페이지를 만든다.
  _site/index.html                  여행 목록
  _site/trips/<폴더>/index.html     여행 상세
  _site/trips/<폴더>/calendar.ics   애플·구글 캘린더용 일정
표준 라이브러리만 쓴다:  python planner/build.py
"""
import datetime as dt
import html
import json
import os
import re
import shutil
import sys
from urllib.parse import quote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "_site")
SITE_NAME = "여행 플래너"
SITE = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "site.json"), encoding="utf-8"))
FEEDBACK = bool(SITE.get("feedback"))  # 번호는 공개 사이트에 두지 않는다: 문자 창에서 받는 사람을 직접 고른다


def fb(subject, label="의견 보내기"):
    """누르면 장소 이름과 링크가 미리 적힌 문자 창이 열린다. 받는 사람은 보내는 사람이 연락처에서 고른다."""
    if not FEEDBACK:
        return ""
    return f'<button class="fb" type="button" data-subject="{e(subject)}">{e(label)}</button>'
WEEK = "월화수목금토일"
MODE_KO = {"transit": "대중교통", "driving": "차량", "walking": "도보"}
TYPE_CLS = {"아침": "meal", "점심": "meal", "저녁": "meal", "밤": "cafe", "카페": "cafe",
            "이동": "move", "숙소": "stay", "활동": "act", "쇼핑": "act"}
STATUS = {"sel": "선정", "alt": "대안", "off": "미배치", "exc": "배제"}
THEMES = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "themes.json"), encoding="utf-8"))


def fonts(themes):
    fams = sorted({THEMES.get(t, THEMES["hakata"])["font"] for t in themes})
    q = "&".join("family=" + f.replace(" ", "+") for f in fams)
    return ('<link rel="preconnect" href="https://fonts.googleapis.com">'
            '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
            f'<link href="https://fonts.googleapis.com/css2?{q}&family=Gaegu:wght@400;700&family=IBM+Plex+Mono:wght@500;600'
            '&family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">')


def e(s):
    return html.escape(str(s), quote=True)


def rich(s):
    """{확인 필요} → 배지, **굵게** → <b>. 나머지는 이스케이프."""
    s = e(s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    return s.replace("{확인 필요}", '<span class="chk">확인 필요</span>')


def gmap(q):
    return "https://www.google.com/maps/search/?api=1&query=" + quote(q)


def embed(q):
    return "https://maps.google.com/maps?q=" + quote(q) + "&z=15&hl=ko&output=embed"


def dirurl(mode, stops):
    qs = [s["query"] for s in stops]
    u = ("https://www.google.com/maps/dir/?api=1&origin=" + quote(qs[0])
         + "&destination=" + quote(qs[-1]))
    if len(qs) > 2:
        u += "&waypoints=" + quote("|".join(qs[1:-1]))
    return u + "&travelmode=" + mode


def d_of(s):
    return dt.date.fromisoformat(s)


def md(s):
    d = d_of(s)
    return f"{d.month}/{d.day}({WEEK[d.weekday()]})"


def ai_reco(c):
    """AI 추천: 구글 평점 4.6 이상이면서 리뷰 1,000개 이상이거나, 지도 메모에 '필수'가 있는 곳."""
    m = re.match(r"([\d.]+)\(([\d,]+)\)", c.get("rating") or "")
    r, n = (float(m.group(1)), int(m.group(2).replace(",", ""))) if m else (0, 0)
    why = []
    if r >= 4.6 and n >= 1000:
        why.append(f"평점 {r} · 리뷰 {n:,}개")
    if "필수" in (c.get("memo") or ""):
        why.append("지도 메모 '필수'")
    return " · ".join(why)


def pick_bar(key, ai):
    """픽 배지 자리(스크립트가 채움) + AI 추천 배지 + 픽 편집 버튼."""
    return (f'<span class="pickbar" data-pick="{e(key)}">'
            + (f'<span class="ai" title="{e(ai)}">AI 추천</span>' if ai else "")
            + '<span class="who"></span><span class="pk-edit"></span></span>')


def sheet(did, title, sub, inner):
    """팝업(아래에서 올라오는 시트). data-open 버튼으로 연다."""
    return (f'<dialog class="sheet" id="{did}" aria-labelledby="{did}-t"><div class="sheet-h"><div><b id="{did}-t">{title}</b>'
            + (f'<small>{sub}</small>' if sub else "") + '</div><button class="x" type="button" data-close aria-label="닫기">✕</button></div>'
            f'<div class="sheet-b">{inner}</div></dialog>')


BASE = SITE.get("base_url", "").rstrip("/") + "/"
MARK = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "brand", "mark.svg"), encoding="utf-8").read().strip()


def brand(up):
    """로고: 경로 점선 + 핀 심볼과 워드마크. 홈으로 가는 링크."""
    m = re.sub(r'role="img" aria-label="[^"]*"', 'aria-hidden="true"', MARK)
    return f'<a class="brand" href="{up or "./"}" aria-label="{SITE_NAME} 홈">{m}<span>{SITE_NAME}</span></a>'


def head_meta(title, depth, og):
    up = "../" * depth
    og = og or {}
    url = BASE + og.get("path", "")
    img = BASE + og["image"] if og.get("image") else ""
    desc = og.get("desc", "")
    m = [f'<link rel="icon" href="{up}assets/favicon.svg" type="image/svg+xml">',
         f'<link rel="apple-touch-icon" href="{up}assets/apple-touch-icon.png">',
         f'<link rel="manifest" href="{up}assets/manifest.webmanifest">',
         '<meta name="theme-color" content="#24346b">',
         '<meta name="apple-mobile-web-app-title" content="여행 플래너">',
         f'<meta name="description" content="{e(desc)}">',
         '<meta property="og:type" content="website">', f'<meta property="og:site_name" content="{SITE_NAME}">',
         f'<meta property="og:title" content="{e(og.get("title", title))}">', f'<meta property="og:description" content="{e(desc)}">',
         f'<meta property="og:url" content="{e(url)}">', '<meta property="og:locale" content="ko_KR">',
         '<meta name="twitter:card" content="summary_large_image">']
    if img:
        m += [f'<meta property="og:image" content="{e(img)}">', '<meta property="og:image:width" content="1200">',
              '<meta property="og:image:height" content="630">', f'<meta name="twitter:image" content="{e(img)}">']
    return "\n".join(m) + "\n"


def page(title, body, depth, theme="hakata", font_themes=None, og=None):
    up = "../" * depth
    return (f'<!doctype html>\n<html lang="ko">\n<meta charset="utf-8">\n'
            f'<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            + head_meta(title, depth, og)
            + ('<meta name="feedback" content="on">' if FEEDBACK else "") + f'<title>{e(title)}</title>\n{fonts(font_themes or [theme])}\n<link rel="stylesheet" href="{up}assets/style.css">\n'
            f'<body class="theme-{e(theme)}">\n{body}\n<div class="toast" role="status" aria-live="polite" hidden></div><a class="totop" href="#" aria-label="맨 위로">↑</a>\n<script src="{up}assets/app.js"></script>\n</body>\n</html>\n')


# ---------------------------------------------------------------- 여행 상세
def render_trip(slug, t):
    P = []
    w = P.append
    start, end = d_of(t["start"]), d_of(t["end"])
    nights = (end - start).days
    AI = {}
    for c in t.get("candidates", []):
        a = ai_reco(c)
        if a:
            AI[c["name"]] = a

    def ai_for(name):
        if name in AI:
            return AI[name]
        for k, v in AI.items():
            if k in name or name in k:
                return v
        return ""
    links = []
    for l in t.get("links", []):
        url = l.get("url") or gmap(l["query"])
        links.append(f'<a class="btn{" primary" if l.get("primary") else ""}" href="{e(url)}" target="_blank" rel="noopener">{e(l["label"])}</a>')
    links.append('<a class="btn" href="calendar.ics">캘린더에 추가</a>')
    links.append(f'<button class="btn share" type="button" data-title="{e(t.get("short", t["title"]))} 여행 일정">일행에게 공유</button>')
    title_html = re.sub(r"\*(.+?)\*", r"<em>\1</em>", e(t["title"]))
    w(f'''<header class="hero"><div class="wrap">
<div class="topbar">{brand("../../")}<a class="back" href="../../">여행 목록</a><button type="button" class="help" data-open="welcome" aria-label="사용법">?</button></div>
<div class="eyebrow">{e(t.get("eyebrow", ""))} · {start:%Y.%m.%d} — {end:%m.%d} · {nights}박 {nights + 1}일</div>
<h1>{title_html}</h1>
<p>{rich(t.get("intro", ""))}</p>
<div class="facts">{"".join(f'<span>{e(k)} <b>{rich(v)}</b></span>' for k, v in t.get("facts", []))}</div>
<div class="cta">{"".join(links)}</div>
</div><canvas class="petals" aria-hidden="true"></canvas><div class="kenjo" aria-hidden="true"></div></header>''')
    chips = [("simple", "간단 일정"), ("overview", "한눈에")]
    chips += [("detail", "날짜별 일정")]
    day_dates = {f"day{i}": d["date"] for i, d in enumerate(t["days"], 1)}
    chips += [("cands", "후보"), ("budget", "비용"), ("before", "출발 전")]
    w('<nav class="chips"><div class="wrap">' + "".join(f'<a href="#{a}"{f' data-date="{day_dates[a]}"' if a in day_dates else ""}>{e(b)}</a>' for a, b in chips) + '</div></nav><main class="wrap">')

    # 1. 간단 일정표
    w('<section id="simple"><h2><span class="num">1</span>간단 일정표</h2>'
      '<p class="lead">하루 6칸(아침·오전·점심·오후·저녁·밤)으로 먼저 보는 일정이에요. 시각은 대략치예요.</p><div class="days">')
    for i, d in enumerate(t["days"], 1):
        w(f'<div class="day c-{e(d["color"])}"><div class="dh"><b>{i}일차 · {md(d["date"])}</b><small>{e(d["theme"])}</small></div><table class="simple"><tbody>')
        for r in d["simple"]:
            cls = "meal" if r["slot"] in ("아침", "점심", "저녁") else ""
            w(f'<tr class="{cls}"><td class="k">{e(r["slot"])}</td><td class="t">{e(r["time"])}</td><td>{rich(r["text"])}</td></tr>')
        w('</tbody></table></div>')
    w('</div></section>')

    # 2. 한눈에 보기
    trav = t.get("travelers", [])
    if trav:
        cfg = {"trip": slug, "travelers": trav, "supabase": {"url": SITE.get("supabase_url", ""), "key": SITE.get("supabase_anon_key", "")}}
        w(f'<script type="application/json" id="trip-cfg">{json.dumps(cfg, ensure_ascii=False)}</script>')
        w('<section id="picks"><div class="card pickpanel"><div class="pp-h"><h3>우리의 픽</h3><span class="pp-store"></span></div>'
          '<p class="lead" style="margin:0 0 10px">가고 싶은 곳에 하트를 눌러 두면 누가 고른 곳인지 장소마다 보여요. '
          '<span class="ai">AI 추천</span>은 구글 평점·리뷰 수와 지도 메모를 보고 Claude가 고른 곳이에요.</p>'
          '<div class="pp-who" role="group" aria-label="나는 누구">' + "".join(f'<button type="button" class="tone-{e(x.get("tone", "pri"))}" data-me="{e(x["name"])}">{e(x["name"])}</button>' for x in trav) + '</div>'
          '<div class="pp-actions"><button type="button" class="btn primary" data-pk="start">픽 고르기</button>'
          '<button type="button" class="btn" data-pk="save" hidden>저장</button><button type="button" class="btn" data-pk="cancel" hidden>취소</button>'
          '<button type="button" class="btn" data-open="picks-all">모아보기</button></div>'
          '<div class="pp-sum"></div></div></section>')
        w(sheet("picks-all", "우리의 픽 모아보기", "둘 다 고른 곳부터 보여요", '<div class="pk-list"></div>'))
    w('<section id="overview"><h2><span class="num">2</span>한눈에 보기</h2><p class="lead">숙소, 이동, 날짜별 강도·복귀 계획이에요.</p><div class="stack">')
    kv = lambda rows: "".join(f"<dt>{e(k)}</dt><dd>{rich(v)}</dd>" for k, v in rows)
    plain1 = lambda x: re.sub(r"\*\*|\{확인 필요\}", "", x)
    ov_chips, ov_dlgs = [], []
    stay_map = f'<div class="row"><a class="btn primary" href="{gmap(t["stay_query"])}" target="_blank" rel="noopener">숙소 구글 지도</a></div>' if t.get("stay_query") else ""
    for did, label, rows, extra in (("ov-stay", "숙소", t.get("stay", []), stay_map), ("ov-move", "이동", t.get("transport", []), "")):
        if rows:
            ov_chips.append(f'<button type="button" class="gchip ov" data-open="{did}"><span class="k">{label}</span><span class="nm">{e(plain1(rows[0][1]))}</span><small>{e(plain1(rows[1][0] + " · " + rows[1][1])) if len(rows) > 1 else ""}</small></button>')
            ov_dlgs.append(sheet(did, label, f"{len(rows)}항목", f'<dl class="kv">{kv(rows)}</dl>{extra}'))
    res = t.get("reservations") or {}
    for key, label in (("required", "예약 필수"), ("recommended", "예약 권장")):
        if res.get(key):
            did = "ov-" + key
            names = ", ".join(plain1(a) for a, _ in res[key][:3]) + (" 외" if len(res[key]) > 3 else "")
            ov_chips.append(f'<button type="button" class="gchip ov{" hot" if key == "required" else ""}" data-open="{did}"><span class="k">{label} · {len(res[key])}</span><span class="nm">{e(names)}</span><small>누르면 언제·어디서 예약하는지</small></button>')
            ov_dlgs.append(sheet(did, label, f"{len(res[key])}곳", '<table class="plain"><tbody>' + "".join(f'<tr><td class="n">{e(a)}</td><td>{rich(b)}</td></tr>' for a, b in res[key]) + "</tbody></table>"))
    w('<div class="ovchips">' + "".join(ov_chips) + "</div>" + "".join(ov_dlgs))
    if t.get("pace"):
        p = t["pace"]
        w('<div class="card"><h3>날짜별 강도·복귀 계획</h3><div class="scrollx"><table class="plain"><thead><tr>'
          + "".join(f"<th>{e(c)}</th>" for c in p["columns"]) + "</tr></thead><tbody>")
        for r in p["rows"]:
            w("<tr>" + "".join(f'<td{" class=n" if j in (0, len(r) - 1) else ""}>{rich(c)}</td>' for j, c in enumerate(r)) + "</tr>")
        w("</tbody></table></div></div>")
    if t.get("closures"):
        rows = []
        for a, b, c, st in t["closures"]:
            mark = '<td class="ok">통과</td>' if st == "ok" else '<td><span class="chk">확인 필요</span></td>'
            rows.append(f'<tr><td>{e(a)}</td><td>{e(b)}</td><td class="n">{e(c)}</td>{mark}</tr>')
        nchk = sum(1 for x in t["closures"] if x[3] != "ok")
        w(f'<button type="button" class="gchip wide" data-open="closures"><span class="nm">방문 요일 휴무 점검</span><small>{len(t["closures"])}곳 · 확인 필요 {nchk}</small></button>')
        w(sheet("closures", "방문 요일 휴무 점검", "", '<div class="scrollx"><table class="plain"><thead><tr><th>장소</th><th>휴무</th><th>방문</th><th></th></tr></thead><tbody>' + "".join(rows) + '</tbody></table></div>'))
    w("</div></section>")

    # 3. 날짜별 상세
    w('<section id="detail"><h2><span class="num">3</span>날짜별 상세 일정</h2><p class="lead">≈ 표시는 대략적인 이동 시간이에요. 날짜를 고르고, 시간표 줄이나 장소를 누르면 자세한 내용이 팝업으로 열려요.</p>')
    w('<div class="daytabs" role="tablist" aria-label="날짜 고르기">' + "".join(
        f'<button type="button" role="tab" class="c-{e(d["color"])}" data-pane="day{i}" data-date="{d["date"]}"><b>{i}일차</b><small>{md(d["date"])}</small></button>'
        for i, d in enumerate(t["days"], 1)) + '</div>')
    for i, d in enumerate(t["days"], 1):
        r = d["route"]
        stops = r["stops"]
        w(f'<div id="day{i}" role="tabpanel" class="daypane c-{e(d["color"])}" data-date="{d["date"]}" style="scroll-margin-top:60px"><div class="dayhead"><div class="t">{i}일차 · {md(d["date"])} {e(d["theme"])}</div><div class="s">{rich(d.get("summary", ""))}</div></div><div class="stack">')
        if stops:
            day_fb = fb(t.get("short", "") + f" {i}일차 {md(d['date'])} 동선", "이 날 의견 보내기")
            w('<div class="card route"><h3>하루 동선</h3><ol>')
            for n, s in enumerate(stops, 1):
                w(f'<li><a href="{gmap(s["query"])}" target="_blank" rel="noopener" data-q="{e(s["query"])}" data-label="{e(s["label"])}"{" class=on" if n == 1 else ""}><i>{n}</i>{e(s["label"])}</a></li>')
            w(f'</ol><div class="row"><a class="btn primary" href="{dirurl(r["mode"], stops)}" target="_blank" rel="noopener">구글 지도에서 경로 보기 ({MODE_KO.get(r["mode"], r["mode"])})</a>'
              '' + day_fb + '<span class="hint">번호를 누르면 아래 지도가 그 장소로 바뀌어요. 경로 버튼은 구글 지도에서 전체 동선을 열어요.</span></div>'
              f'<div class="mapbox"><iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="{i}일차 지도" src="{embed(stops[0]["query"])}"></iframe>'
              f'<div class="mapcap">지도: <b>{e(stops[0]["label"])}</b></div></div></div>')
        w('<div class="card" style="padding:6px 12px"><table class="blocks"><thead><tr><th>시간</th><th>구분</th><th>장소</th><th>내용</th><th>이동·소요</th><th>비고</th></tr></thead><tbody>')
        pl_ids = {p["name"]: f"pl-{i}-{n}" for n, p in enumerate(d.get("places", []), 1)}
        blk_dlgs = []
        for j, b in enumerate(d["blocks"], 1):
            bid = f"blk-{i}-{j}"
            pname = plain(b["place"])
            pid = next((v for k, v in pl_ids.items() if k in pname or (pname and pname.split()[0] in k)), "")
            w(f'<tr class="tap" data-open="{bid}" tabindex="0"><td class="time">{e(b["time"])}</td><td class="cat"><span class="tag {TYPE_CLS.get(b["type"], "act")}">{e(b["type"])}</span></td>'
              f'<td class="place">{rich(b["place"])}</td><td>{rich(b["what"])}</td><td class="move">{rich(b["move"])}</td><td class="note">{rich(b["note"])}</td></tr>')
            rows = [("할 일", b["what"]), ("이동·소요", b["move"]), ("메모", b["note"])]
            inner = '<dl class="kv">' + "".join(f"<dt>{k}</dt><dd>{rich(v)}</dd>" for k, v in rows if plain(v) not in ("", "-")) + "</dl>"
            btns = []
            if pid:
                btns.append(f'<button type="button" class="btn primary" data-open="{pid}">장소 상세 보기</button>')
            if pname and pname not in ("미정", "-"):
                btns.append(f'<a class="btn" href="{gmap(pname)}" target="_blank" rel="noopener">구글 지도</a>')
            inner += '<div class="row">' + "".join(btns) + "</div>"
            blk_dlgs.append(sheet(bid, rich(b["place"]), f'{i}일차 · {e(b["time"])} · {e(b["type"])}', inner))
        w('</tbody></table></div>' + "".join(blk_dlgs))
        if d.get("alternatives"):
            w('<div class="alts">' + "".join(f'<div class="alt"><b>{e(a["when"])}</b> · {rich(a["text"])}</div>' for a in d["alternatives"]) + '</div>')
        if d.get("places"):
            w('<div><div class="sub">장소 ' + str(len(d["places"])) + '곳 · 누르면 상세</div><div class="pchips">')
            dlgs = []
            for n, p in enumerate(d["places"], 1):
                place_fb = fb(t.get("short", "") + f" {md(d['date'])} " + p["name"])
                did = f"pl-{i}-{n}"
                w(f'<div class="pitem"><button type="button" class="pchip" data-open="{did}"><span class="nm">{e(p["name"])}</span><span class="cost">{rich(p.get("cost", ""))}</span></button>{pick_bar(p["name"], ai_for(p["name"]))}</div>')
                inner = (f'<dl class="kv"><dt>주소</dt><dd>{rich(p.get("address", ""))}</dd><dt>영업·휴무</dt><dd>{rich(p.get("hours", ""))}</dd><dt>추천 이유</dt><dd>{rich(p.get("why", ""))}</dd>'
                         + (f'<dt>팁</dt><dd>{rich(p["tip"])}</dd>' if p.get("tip") else "")
                         + f'<dt>예상 비용</dt><dd>{rich(p.get("cost", ""))}</dd></dl><div class="row"><a class="btn primary" href="{gmap(p.get("query") or p["name"])}" target="_blank" rel="noopener">구글 지도에서 보기</a>{place_fb}</div>')
                dlgs.append(sheet(did, e(p["name"]), e(p.get("local", "")), inner))
            w('</div></div>' + "".join(dlgs))
        w('</div></div>')
    w('</section>')

    # 4. 후보 정리
    cands = t.get("candidates", [])
    if cands:
        cnt = {k: sum(1 for c in cands if c["status"] == k) for k in STATUS}
        w(f'<section id="cands"><h2><span class="num">4</span>후보 정리</h2><p class="lead">조사한 장소 {len(cands)}곳을 모두 올렸어요. '
          + " · ".join(f"{STATUS[k]} {cnt[k]}" for k in STATUS) + '. 미배치 장소는 영업시간·휴무를 아직 확인하지 않았어요.</p>'
          '<div class="legend">' + "".join(f'<span class="st {k}">{v}</span>' for k, v in STATUS.items()) + '</div>')
        groups = []
        for c in cands:
            if not groups or groups[-1][0] != c["group"]:
                groups.append((c["group"], []))
            groups[-1][1].append(c)
        order = {"sel": 0, "alt": 1, "off": 2, "exc": 3}
        chips, dlgs = [], []
        for k, (g, items) in enumerate(groups, 1):
            nsel = sum(1 for c in items if c["status"] == "sel")
            rows = []
            for c in sorted(items, key=lambda c: order[c["status"]]):
                meta = " · ".join(x for x in [c.get("rating") and "★ " + c["rating"], c.get("category"), c.get("memo")] if x)
                nm = f'<a href="{gmap(c["query"])}" target="_blank" rel="noopener">{e(c["name"])}</a>' if c.get("query") else e(c["name"])
                rows.append(f'<div class="cand"><span class="nm">{nm}</span><span class="st {c["status"]}">{STATUS[c["status"]]}</span>{pick_bar(c["name"], AI.get(c["name"], ""))}'
                            + (f'<span class="meta">{e(meta)}</span>' if meta else "") + f'<span class="why">{rich(c.get("reason", ""))}</span></div>')
            chips.append(f'<button type="button" class="gchip" data-open="cg-{k}"><span class="nm">{e(g)}</span><small>{len(items)}곳 · 선정 {nsel}</small></button>')
            dlgs.append(sheet(f"cg-{k}", e(g), f"{len(items)}곳 중 선정 {nsel}", "".join(rows)))
        w('<div class="gchips">' + "".join(chips) + '</div>' + "".join(dlgs))
        w('</section>')

    # 5. 비용
    b = t.get("budget")
    if b:
        u = b.get("unit", "")
        M = max(r[3] for r in b["rows"])
        M = int(-(-M // 4000) * 4000) if M > 4000 else M
        w(f'<section id="budget"><h2><span class="num">5</span>{e(b["title"])}</h2><p class="lead">{rich(b.get("note", ""))}</p>'
          f'<div class="card" style="margin-bottom:14px"><h3>일차별 범위</h3><div class="bars">')
        for lab, _, a, z, _ in b["rows"]:
            l, wd = a / M * 100, (z - a) / M * 100
            pos = f"left:{l + wd:.1f}%" if l + wd < 60 else f"right:{100 - l + 1:.1f}%;padding-left:0;padding-right:6px"
            w(f'<div class="bar"><span class="lbl">{e(lab)}</span><span class="track"><span class="rng" style="left:{l:.1f}%;width:{max(wd, 1):.1f}%"></span>'
              f'<span class="val" style="{pos}">{u}{a:,}~{z:,}</span></span></div>')
        ticks = [0, M / 3, M * 2 / 3, M]
        w('</div><div class="axis" aria-hidden="true"><span></span><span class="ticks">'
          + "".join(f'<span style="left:{k / M * 100:.1f}%">{int(k):,}</span>' for k in ticks) + '</span></div></div>')
        w('<div class="card" style="padding:6px 12px"><div class="scrollx"><table class="plain" style="min-width:540px"><thead><tr><th>일차</th><th>구성</th><th>금액</th><th>원화 감</th></tr></thead><tbody>')
        for lab, what, a, z, krw in b["rows"]:
            w(f'<tr><td class="n">{e(lab)}</td><td>{rich(what)}</td><td class="n">{u}{a:,}~{z:,}</td><td class="n">{e(krw)}</td></tr>')
        if b.get("total"):
            lab, what, a, z, krw = b["total"]
            w(f'<tr><td class="n"><b>{e(lab)}</b></td><td><b>{e(what)}</b></td><td class="n"><b>{u}{a:,}~{z:,}</b></td><td class="n"><b>{e(krw)}</b></td></tr>')
        w(f'</tbody></table></div><p class="lead" style="margin:10px 0 4px">{rich(b.get("footnote", ""))}</p></div></section>')

    # 6. 출발 전 확인
    bf = t.get("before")
    if bf:
        w(f'<section id="before"><h2><span class="num">6</span>출발 전 확인</h2><p class="lead">{rich(bf.get("note", ""))}</p><div class="grid2">')
        for title, items in bf["lists"]:
            w(f'<div class="card"><h3>{e(title)}</h3><ul class="todo">'
              + "".join(f'<li><span class="box"></span><span>{rich(x)}</span></li>' for x in items) + '</ul></div>')
        w('</div></section>')
    w('</main>')
    if FEEDBACK:
        w(f'<section id="feedback"><div class="card fbcard"><h3>의견 보내기</h3><p class="lead" style="margin:0 0 10px">바꾸고 싶은 곳, 가고 싶은 곳이 있으면 {e(SITE.get("feedback_name", ""))}에게 문자로 알려 주세요. 버튼을 누르면 내용이 적힌 문자 창이 열리고, 받는 사람은 연락처에서 고르면 돼요.</p>'
          f'<div class="row">{fb(t.get("short", "") + " 여행 전체", "문자로 의견 보내기")}</div></div></section>')
    w(f'<footer><div class="wrap">출처: {rich(t.get("source", ""))} <span class="chk">확인 필요</span> 표시는 아직 확정되지 않은 정보예요.</div></footer>')
    names = " · ".join(x["name"] for x in t.get("travelers", []))
    steps = [("날짜 탭", "위의 1일차~마지막 날 탭을 누르면 그날 동선, 지도, 시간표만 보여요."),
             ("누르면 팝업", "시간표 한 줄, 장소, 숙소·예약 칩을 누르면 자세한 내용이 아래에서 올라와요. 바깥을 누르거나 ✕로 닫아요."),
             ("우리의 픽", "가고 싶은 곳에 하트를 눌러 저장하면 누가 고른 곳인지" + (f"({names})" if names else "") + " 장소마다 보여요. 나중에 '픽 수정'으로 바꿀 수 있어요."),
             ("캘린더·공유", "'캘린더에 추가'는 아이폰 캘린더에 일정을 넣고, '일행에게 공유'는 이 페이지 링크를 보내요.")]
    w(sheet("welcome", "이렇게 보면 돼요", e(t.get("short", "")) + " 여행 페이지 사용법",
            '<ol class="steps">' + "".join(f'<li><b>{e(a)}</b><span>{e(b)}</span></li>' for a, b in steps) + '</ol>'
            '<div class="row"><button type="button" class="btn primary" data-close autofocus>시작하기</button></div>').replace('<dialog class="sheet"', f'<dialog class="sheet welcome" data-auto="tp-welcome-{e(slug)}"', 1))
    days_txt = " / ".join(d["theme"] for d in t["days"])
    og = {"title": t.get("short", t["title"]) + " 여행 · " + t["start"].replace("-", ".") + "~",
          "desc": f'{nights}박 {nights + 1}일 일정과 지도: {days_txt}', "image": f"trips/{slug}/og.png", "path": f"trips/{slug}/"}
    return page(t.get("short", t["title"]) + " 여행", "\n".join(P), 2, t.get("theme", "hakata"), og=og)


# ---------------------------------------------------------------- 캘린더
def ics_escape(x):
    return x.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def ics_fold(line):
    out, cur = [], b""
    for ch in line:
        c = ch.encode("utf-8")
        if len(cur) + len(c) > (75 if not out else 74):
            out.append(cur)
            cur = b""
        cur += c
    out.append(cur)
    return "\r\n ".join(x.decode("utf-8") for x in out)


def plain(s):
    return re.sub(r"\*\*|\{확인 필요\}", lambda m: "" if m.group(0) == "**" else "확인 필요", s or "").strip()


def render_ics(slug, t):
    tz = t.get("timezone", "Asia/Seoul")
    ev = []

    def add(day, st, en, summary, loc, desc, url):
        s = dt.datetime.combine(day, st)
        z = dt.datetime.combine(day, en)
        if z <= s:
            z = s + dt.timedelta(minutes=30)
        L = ["BEGIN:VEVENT", f"UID:{s:%Y%m%dT%H%M}-{len(ev)}-{slug}@travel-planner",
             f"DTSTAMP:{dt.datetime.now(dt.timezone.utc):%Y%m%dT%H%M%SZ}",
             f"DTSTART;TZID={tz}:{s:%Y%m%dT%H%M%S}", f"DTEND;TZID={tz}:{z:%Y%m%dT%H%M%S}",
             "SUMMARY:" + ics_escape(summary)]
        if loc:
            L.append("LOCATION:" + ics_escape(loc))
        if desc:
            L.append("DESCRIPTION:" + ics_escape(desc))
        if url:
            L.append("URL:" + url)
        ev.extend(L + ["END:VEVENT"])

    tm = lambda x: dt.time(*map(int, x.split(":")))
    for x in t.get("calendar_extra", []):
        add(d_of(x["date"]), tm(x["start"]), tm(x["end"]), x["title"], x.get("location"), x.get("description"), gmap(x["location"]) if x.get("location") else None)
    skip = t.get("calendar_skip", {})
    for d in t["days"]:
        day = d_of(d["date"])
        stops = d["route"]["stops"]
        for b in d["blocks"]:
            m = re.findall(r"(\d{1,2}:\d{2})", b["time"])
            if not m:
                continue
            place = plain(b["place"])
            if b["type"] in skip.get(d["date"], []) and not any(s["label"].split()[0] in place for s in stops[:1]):
                continue
            st = tm(m[0])
            en = tm(m[1]) if len(m) > 1 else (dt.datetime.combine(day, st) + dt.timedelta(minutes=60 if "이후" in b["time"] else 30)).time()
            q = next((s["query"] for s in stops if s["label"].split()[0] in place or place.split()[0] in s["label"]), None)
            desc = " / ".join(x for x in [plain(b["what"]),
                                          "이동: " + plain(b["move"]) if plain(b["move"]) not in ("", "-") else "",
                                          "메모: " + plain(b["note"]) if plain(b["note"]) else ""] if x)
            loc = q or (place if place != "미정" else "")
            add(day, st, en, f"[{b['type']}] {place}", loc, desc, gmap(q or place) if loc else None)
    cal = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//travel-planner//KO", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
           "X-WR-CALNAME:" + ics_escape(t.get("short", t["title"]) + " 여행"), "X-WR-TIMEZONE:" + tz]
    off = {"Asia/Tokyo": ("+0900", "JST"), "Asia/Seoul": ("+0900", "KST")}.get(tz)
    if off:
        cal += ["BEGIN:VTIMEZONE", f"TZID:{tz}", "BEGIN:STANDARD", "DTSTART:19700101T000000",
                f"TZOFFSETFROM:{off[0]}", f"TZOFFSETTO:{off[0]}", f"TZNAME:{off[1]}", "END:STANDARD", "END:VTIMEZONE"]
    cal += ev + ["END:VCALENDAR"]
    return "\r\n".join(ics_fold(x) for x in cal) + "\r\n", ev.count("BEGIN:VEVENT")


# ---------------------------------------------------------------- 여행 목록
def render_home(trips):
    cards = []
    for slug, t in sorted(trips, key=lambda x: x[1]["start"], reverse=True):
        s, z = d_of(t["start"]), d_of(t["end"])
        n = (z - s).days
        color = t["days"][0]["color"] if t.get("days") else "hakata"
        cards.append(f'<a class="trip theme-{e(t.get("theme", "hakata"))} c-{e(color)}" href="trips/{e(slug)}/"><span class="dday" data-start="{t["start"]}" data-end="{t["end"]}">{s:%Y.%m}</span>'
                     f'<span class="ttl">{e(t["title"].replace("*", ""))}</span><span class="when">{s:%Y.%m.%d} — {z:%m.%d} · {n}박 {n + 1}일 · {e(t.get("country", ""))}</span>'
                     f'<span class="intro">{e(t.get("intro", ""))}</span></a>')
    body = f'''<header class="hero"><div class="wrap">
<div class="topbar">{brand("")}</div>
<div class="eyebrow">TRAVEL PLANNER</div>
<h1>우리 여행을 <em>한곳에</em></h1>
<p>우리 여행의 동선, 지도, 예약, 비용을 한곳에서 봐요. 여행을 누르면 날짜별 일정과 지도가 열려요.</p>
<div class="cta"><button class="btn share" type="button" data-title="{SITE_NAME}">일행에게 공유</button></div>
</div><div class="kenjo" aria-hidden="true"></div></header>
<main class="wrap">
<section><h2>여행 {len(trips)}개</h2><p class="lead">가까운 여행부터 보여요.</p><div class="trips">{"".join(cards)}</div></section>
<section class="howto"><h2>새 여행 추가하기</h2><div class="card"><ol>
<li><code>trips/2027-03-fukuoka/trip.json</code>을 복사해서 <code>trips/연도-월-도시/trip.json</code>을 만들어요.</li>
<li>날짜, 동선(<code>route.stops</code>의 이름과 구글 지도 검색어), 시간표를 채워요. 일정 메모를 Claude에게 주면 이 형식으로 바꿔 줘요.</li>
<li>GitHub에 올리면 1~2분 뒤 이 목록과 캘린더 파일이 자동으로 바뀌어요.</li>
</ol></div></section>
</main>
<footer><div class="wrap">각 여행의 '캘린더에 추가'를 아이폰에서 누르면 애플 캘린더에 일정이 들어가요.</div></footer>'''
    og = {"title": SITE_NAME, "desc": "우리 여행의 동선, 지도, 예약, 비용을 한곳에서 봐요.", "image": "assets/og-home.png", "path": ""}
    return page(SITE_NAME, body, 0, "hakata", [t.get("theme", "hakata") for _, t in trips] + ["hakata"], og=og)


def main():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(os.path.join(OUT, "assets"))
    here = os.path.dirname(os.path.abspath(__file__))
    for f in ("style.css", "app.js"):
        shutil.copy(os.path.join(here, f), os.path.join(OUT, "assets", f))
    for f in ("favicon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "og-home.png"):
        shutil.copy(os.path.join(here, "brand", f), os.path.join(OUT, "assets", f))
    manifest = {"name": SITE_NAME, "short_name": SITE_NAME, "lang": "ko", "start_url": "../", "scope": "../", "display": "standalone",
                "background_color": "#f5f6f9", "theme_color": "#24346b",
                "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
                          {"src": "favicon.svg", "sizes": "any", "type": "image/svg+xml"}]}
    open(os.path.join(OUT, "assets", "manifest.webmanifest"), "w", encoding="utf-8").write(json.dumps(manifest, ensure_ascii=False))
    trips = []
    tdir = os.path.join(ROOT, "trips")
    for slug in sorted(os.listdir(tdir)):
        p = os.path.join(tdir, slug, "trip.json")
        if not os.path.isfile(p):
            continue
        t = json.load(open(p, encoding="utf-8"))
        trips.append((slug, t))
        od = os.path.join(OUT, "trips", slug)
        os.makedirs(od)
        open(os.path.join(od, "index.html"), "w", encoding="utf-8").write(render_trip(slug, t))
        if os.path.isfile(os.path.join(tdir, slug, "og.png")):
            shutil.copy(os.path.join(tdir, slug, "og.png"), os.path.join(od, "og.png"))
        ics, n = render_ics(slug, t)
        open(os.path.join(od, "calendar.ics"), "w", encoding="utf-8", newline="").write(ics)
        print(f"{slug}: {len(t['days'])}일, 캘린더 {n}건")
    open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(render_home(trips))
    open(os.path.join(OUT, ".nojekyll"), "w").close()


if __name__ == "__main__":
    sys.exit(main())
