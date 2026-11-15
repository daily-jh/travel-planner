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
WEEK = "월화수목금토일"
MODE_KO = {"transit": "대중교통", "driving": "차량", "walking": "도보"}
TYPE_CLS = {"아침": "meal", "점심": "meal", "저녁": "meal", "밤": "cafe", "카페": "cafe",
            "이동": "move", "숙소": "stay", "활동": "act", "쇼핑": "act"}
STATUS = {"sel": "선정", "alt": "대안", "off": "미배치", "exc": "배제"}
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link href="https://fonts.googleapis.com/css2?family=Do+Hyeon&family=IBM+Plex+Mono:wght@500;600'
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


def page(title, body, depth):
    up = "../" * depth
    return (f'<!doctype html>\n<html lang="ko">\n<meta charset="utf-8">\n'
            f'<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            f'<title>{e(title)}</title>\n{FONTS}\n<link rel="stylesheet" href="{up}assets/style.css">\n'
            f'<body>\n{body}\n<a class="totop" href="#" aria-label="맨 위로">↑</a>\n<script src="{up}assets/app.js"></script>\n</body>\n</html>\n')


# ---------------------------------------------------------------- 여행 상세
def render_trip(slug, t):
    P = []
    w = P.append
    start, end = d_of(t["start"]), d_of(t["end"])
    nights = (end - start).days
    links = []
    for l in t.get("links", []):
        url = l.get("url") or gmap(l["query"])
        links.append(f'<a class="btn{" primary" if l.get("primary") else ""}" href="{e(url)}" target="_blank" rel="noopener">{e(l["label"])}</a>')
    links.append('<a class="btn" href="calendar.ics">캘린더에 추가</a>')
    title_html = re.sub(r"\*(.+?)\*", r"<em>\1</em>", e(t["title"]))
    w(f'''<header class="hero"><div class="wrap">
<a class="back" href="../../">← 여행 목록</a>
<div class="eyebrow">{e(t.get("eyebrow", ""))} · {start:%Y.%m.%d} — {end:%m.%d} · {nights}박 {nights + 1}일</div>
<h1>{title_html}</h1>
<p>{rich(t.get("intro", ""))}</p>
<div class="facts">{"".join(f'<span>{e(k)} <b>{rich(v)}</b></span>' for k, v in t.get("facts", []))}</div>
<div class="cta">{"".join(links)}</div>
</div><div class="kenjo" aria-hidden="true"></div></header>''')
    chips = [("simple", "간단 일정"), ("overview", "한눈에")]
    chips += [(f"day{i}", md(d["date"])) for i, d in enumerate(t["days"], 1)]
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
    w('<section id="overview"><h2><span class="num">2</span>한눈에 보기</h2><p class="lead">숙소, 이동, 날짜별 강도·복귀 계획이에요.</p><div class="stack"><div class="grid2">')
    kv = lambda rows: "".join(f"<dt>{e(k)}</dt><dd>{rich(v)}</dd>" for k, v in rows)
    stay_map = f'<a class="map" href="{gmap(t["stay_query"])}" target="_blank" rel="noopener">구글 지도</a>' if t.get("stay_query") else ""
    w(f'<div class="card"><h3>숙소</h3><dl class="kv">{kv(t.get("stay", []))}</dl>{stay_map}</div>')
    w(f'<div class="card"><h3>이동</h3><dl class="kv">{kv(t.get("transport", []))}</dl></div></div>')
    if t.get("pace"):
        p = t["pace"]
        w('<div class="card"><h3>날짜별 강도·복귀 계획</h3><div class="scrollx"><table class="plain"><thead><tr>'
          + "".join(f"<th>{e(c)}</th>" for c in p["columns"]) + "</tr></thead><tbody>")
        for r in p["rows"]:
            w("<tr>" + "".join(f'<td{" class=n" if j in (0, len(r) - 1) else ""}>{rich(c)}</td>' for j, c in enumerate(r)) + "</tr>")
        w("</tbody></table></div></div>")
    res = t.get("reservations")
    if res:
        w('<div class="grid2">')
        for key, label in (("required", "예약 필수"), ("recommended", "예약 권장")):
            if res.get(key):
                w(f'<div class="card"><h3>{label}</h3><table class="plain"><tbody>'
                  + "".join(f'<tr><td class="n">{e(a)}</td><td>{rich(b)}</td></tr>' for a, b in res[key])
                  + "</tbody></table></div>")
        w("</div>")
    if t.get("closures"):
        w('<div class="card"><h3>방문 요일 휴무 점검</h3><div class="scrollx"><table class="plain"><thead><tr><th>장소</th><th>휴무</th><th>방문</th><th></th></tr></thead><tbody>')
        for a, b, c, st in t["closures"]:
            mark = '<td class="ok">통과</td>' if st == "ok" else '<td><span class="chk">확인 필요</span></td>'
            w(f'<tr><td>{e(a)}</td><td>{e(b)}</td><td class="n">{e(c)}</td>{mark}</tr>')
        w("</tbody></table></div></div>")
    w("</div></section>")

    # 3. 날짜별 상세
    w('<section id="detail"><h2><span class="num">3</span>날짜별 상세 일정</h2><p class="lead">≈ 표시는 대략적인 이동 시간이에요. 장소 이름을 누르면 주소·영업시간·팁이 열려요.</p>')
    for i, d in enumerate(t["days"], 1):
        r = d["route"]
        stops = r["stops"]
        w(f'<div id="day{i}" class="c-{e(d["color"])}" data-date="{d["date"]}" style="scroll-margin-top:60px"><div class="dayhead"><div class="t">{i}일차 · {md(d["date"])} {e(d["theme"])}</div><div class="s">{rich(d.get("summary", ""))}</div></div><div class="stack">')
        if stops:
            w('<div class="card route"><h3>하루 동선</h3><ol>')
            for n, s in enumerate(stops, 1):
                w(f'<li><a href="{gmap(s["query"])}" target="_blank" rel="noopener" data-q="{e(s["query"])}" data-label="{e(s["label"])}"{" class=on" if n == 1 else ""}><i>{n}</i>{e(s["label"])}</a></li>')
            w(f'</ol><div class="row"><a class="btn primary" href="{dirurl(r["mode"], stops)}" target="_blank" rel="noopener">구글 지도에서 경로 보기 ({MODE_KO.get(r["mode"], r["mode"])})</a>'
              '<span class="hint">번호를 누르면 아래 지도가 그 장소로 바뀌어요. 경로 버튼은 구글 지도에서 전체 동선을 열어요.</span></div>'
              f'<div class="mapbox"><iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="{i}일차 지도" src="{embed(stops[0]["query"])}"></iframe>'
              f'<div class="mapcap">지도: <b>{e(stops[0]["label"])}</b></div></div></div>')
        w('<div class="card" style="padding:6px 12px"><table class="blocks"><thead><tr><th>시간</th><th>구분</th><th>장소</th><th>내용</th><th>이동·소요</th><th>비고</th></tr></thead><tbody>')
        for b in d["blocks"]:
            w(f'<tr><td class="time">{e(b["time"])}</td><td class="cat"><span class="tag {TYPE_CLS.get(b["type"], "act")}">{e(b["type"])}</span></td>'
              f'<td class="place">{rich(b["place"])}</td><td>{rich(b["what"])}</td><td class="move">{rich(b["move"])}</td><td class="note">{rich(b["note"])}</td></tr>')
        w('</tbody></table></div>')
        if d.get("alternatives"):
            w('<div class="alts">' + "".join(f'<div class="alt"><b>{e(a["when"])}</b> · {rich(a["text"])}</div>' for a in d["alternatives"]) + '</div>')
        if d.get("places"):
            w('<div><div class="sub">장소 카드</div><div class="places">')
            for p in d["places"]:
                w(f'<details class="place"><summary><span class="nm">{e(p["name"])}<small>{e(p.get("local", ""))}</small></span><span class="cost">{rich(p.get("cost", ""))}</span></summary><div class="body"><dl class="kv">'
                  f'<dt>주소</dt><dd>{rich(p.get("address", ""))}</dd><dt>영업·휴무</dt><dd>{rich(p.get("hours", ""))}</dd><dt>추천 이유</dt><dd>{rich(p.get("why", ""))}</dd>'
                  + (f'<dt>팁</dt><dd>{rich(p["tip"])}</dd>' if p.get("tip") else "")
                  + f'<dt>예상 비용</dt><dd>{rich(p.get("cost", ""))}</dd></dl><a class="map" href="{gmap(p.get("query") or p["name"])}" target="_blank" rel="noopener">구글 지도</a></div></details>')
            w('</div></div>')
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
        for g, items in groups:
            nsel = sum(1 for c in items if c["status"] == "sel")
            w(f'<details class="grp"><summary>{e(g)} <span style="color:var(--muted);font-weight:400;font-size:13px">· {len(items)}곳 중 선정 {nsel}</span></summary><div class="list">')
            for c in sorted(items, key=lambda c: order[c["status"]]):
                meta = " · ".join(x for x in [c.get("rating") and "★ " + c["rating"], c.get("category"), c.get("memo")] if x)
                nm = f'<a href="{gmap(c["query"])}" target="_blank" rel="noopener">{e(c["name"])}</a>' if c.get("query") else e(c["name"])
                w(f'<div class="cand"><span class="nm">{nm}</span><span class="st {c["status"]}">{STATUS[c["status"]]}</span>'
                  + (f'<span class="meta">{e(meta)}</span>' if meta else "") + f'<span class="why">{rich(c.get("reason", ""))}</span></div>')
            w('</div></details>')
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
    w(f'<footer><div class="wrap">출처: {rich(t.get("source", ""))} <span class="chk">확인 필요</span> 표시는 아직 확정되지 않은 정보예요.</div></footer>')
    return page(t.get("short", t["title"]) + " 여행", "\n".join(P), 2)


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
        cards.append(f'<a class="trip c-{e(color)}" href="trips/{e(slug)}/"><span class="dday" data-start="{t["start"]}" data-end="{t["end"]}">{s:%Y.%m}</span>'
                     f'<span class="ttl">{e(t["title"].replace("*", ""))}</span><span class="when">{s:%Y.%m.%d} — {z:%m.%d} · {n}박 {n + 1}일 · {e(t.get("country", ""))}</span>'
                     f'<span class="intro">{e(t.get("intro", ""))}</span></a>')
    body = f'''<header class="hero"><div class="wrap">
<div class="eyebrow">TRAVEL PLANNER</div>
<h1>{SITE_NAME}</h1>
<p>우리 여행의 동선, 지도, 예약, 비용을 한곳에서 봐요. 여행을 누르면 날짜별 일정과 지도가 열려요.</p>
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
    return page(SITE_NAME, body, 0)


def main():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(os.path.join(OUT, "assets"))
    here = os.path.dirname(os.path.abspath(__file__))
    for f in ("style.css", "app.js"):
        shutil.copy(os.path.join(here, f), os.path.join(OUT, "assets", f))
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
        ics, n = render_ics(slug, t)
        open(os.path.join(od, "calendar.ics"), "w", encoding="utf-8", newline="").write(ics)
        print(f"{slug}: {len(t['days'])}일, 캘린더 {n}건")
    open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(render_home(trips))
    open(os.path.join(OUT, ".nojekyll"), "w").close()


if __name__ == "__main__":
    sys.exit(main())
