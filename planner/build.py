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


def asset_ver(*paths):
    """파일 내용 해시 8자리. 주소 뒤 ?v= 로 붙여 휴대폰 브라우저가 옛 스타일을 쓰지 않게 한다."""
    import hashlib
    h = hashlib.sha1()
    for p in paths:
        with open(p, "rb") as f:
            h.update(f.read())
    return h.hexdigest()[:8]


_P = os.path.dirname(os.path.abspath(__file__))
ASSET_V = {"css": asset_ver(*(os.path.join(_P, f) for f in ("style.css", "themes.json", "extras.py"))),
           "js": asset_ver(*(os.path.join(_P, f) for f in ("app.js", "live.js")))}


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
LANG_DEFAULT = {"code": "ja-JP", "name": "일본어", "icon": "あ", "taxi": "{stay}までお願いします"}


def lang(t):
    """현지 언어: 회화 탭 이름, 음성 언어, 택시 카드 문장. 없으면 일본어 (후쿠오카 여행과 같게)."""
    return {**LANG_DEFAULT, **(t.get("lang") or {})}
THEMES = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "themes.json"), encoding="utf-8"))


def fonts(themes):
    """애플 기기는 시스템 글꼴(SF·Apple SD Gothic Neo), 그 밖의 기기는 비슷한 Pretendard."""
    return ('<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>'
            '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">')


def e(s):
    return html.escape(str(s), quote=True)


def rich(s):
    """{확인 필요} → 배지, **굵게** → <b>. 나머지는 이스케이프."""
    s = e(s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    return s.replace("{확인 필요}", '<span class="chk">확인 필요</span>')


# 지도: 해외는 구글 지도, 국내(한국)는 네이버 지도. 여행마다 render_trip·render_ics 가 MAP 을 바꾼다.
# 네이버 지도 웹 주소(map.naver.com/p/search/…)는 휴대폰에서 app.js 가 네이버 지도 앱(nmap://)으로 바꿔 연다.
MAP = {"kind": "google", "name": "구글 지도"}
KOREA = ("한국", "대한민국", "국내", "Korea", "South Korea", "KR")


def domestic(t):
    """국내 여행인지: domestic 값이 있으면 그것, 없으면 country 가 한국이면 국내."""
    if "domestic" in t:
        return bool(t["domestic"])
    return str(t.get("country", "")).strip() in KOREA


def map_kind(t):
    """trip.json map: "naver" 또는 "google". 없으면 국내는 네이버, 해외는 구글."""
    k = t.get("map") or ("naver" if domestic(t) else "google")
    return k if k in ("naver", "google") else "google"


def use_map(t):
    MAP["kind"] = map_kind(t)
    MAP["name"] = "네이버 지도" if MAP["kind"] == "naver" else "구글 지도"


def gmap(q):
    """장소 하나를 지도에서 여는 주소 (여행의 지도 종류를 따른다)."""
    if MAP["kind"] == "naver":
        return "https://map.naver.com/p/search/" + quote(q)
    return "https://www.google.com/maps/search/?api=1&query=" + quote(q)


NMAP_MODE = {"transit": "public", "driving": "car", "walking": "walk"}


def nmap_route(mode, stops):
    """네이버 지도 앱 길찾기 (좌표가 있는 경로만). 대중교통은 경유지를 못 넣어 출발→도착만, 차·도보는 경유지 5곳까지."""
    if not stops or not all(isinstance(s.get("lat"), (int, float)) and isinstance(s.get("lng"), (int, float)) for s in stops) or len(stops) < 2:
        return ""
    m = NMAP_MODE.get(mode, "public")
    pt = lambda k, s: f"{k}lat={s['lat']}&{k}lng={s['lng']}&{k}name={quote(s['label'])}"
    u = f"nmap://route/{m}?" + pt("s", stops[0]) + "&" + pt("d", stops[-1])
    if m != "public":
        for n, s in enumerate(stops[1:-1][:5], 1):
            u += "&" + pt(f"v{n}", s)
    return u


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


def flags(b):
    """시간표 한 줄에서 여행자가 미리 알아야 할 표시: 예약·현금·줄서기."""
    x = plain(b.get("note", "")) + " " + plain(b.get("what", ""))
    f = []
    if "예약" in x and "예약 불가" not in x and "면세" not in x:
        f.append(("rsv", "예약"))
    if "현금" in x or "카드 불가" in x:
        f.append(("cash", "현금"))
    if "줄서기" in x or "대기" in x:
        f.append(("line", "줄서기"))
    return f


def sheet(did, title, sub, inner):
    """팝업(아래에서 올라오는 시트). data-open 버튼으로 연다."""
    return (f'<dialog class="sheet" id="{did}" aria-labelledby="{did}-t"><div class="sheet-h"><div><b id="{did}-t">{title}</b>'
            + (f'<small>{sub}</small>' if sub else "") + '</div><button class="x" type="button" data-close aria-label="닫기">✕</button></div>'
            f'<div class="sheet-b">{inner}</div></dialog>')


def planb_html(d):
    """플랜 B 팝업: 하루 대안 일정(6칸·장소) + 상황별 짧은 대안."""
    out = ""
    pb = d.get("plan_b")
    if pb:
        out += f'<div class="pbday"><b class="pb-title">{e(pb["title"])}</b><p class="pb-when">{rich(pb.get("when", ""))}</p><table class="simple"><tbody>'
        for r in pb["simple"]:
            cls = "meal" if r["slot"] in ("아침", "점심", "저녁") else ""
            out += f'<tr class="{cls}"><td class="k">{e(r["slot"])}</td><td class="t">{e(r["time"])}</td><td>{rich(r["text"])}</td></tr>'
        out += '</tbody></table>'
        if pb.get("places"):
            out += '<div class="sub">대안 장소 · 이날 요일에 여는지 확인한 곳</div><ul class="pb-places">'
            for p in pb["places"]:
                out += (f'<li><div><b>{e(p["name"])}</b>' + (f' <small>{e(p.get("local", ""))}</small>' if p.get("local") else "")
                        + f'<p>{rich(p.get("why", ""))}</p><p class="hrs">{rich(p.get("hours", ""))}' + (f' · {rich(p["cost"])}' if p.get("cost") else "")
                        + f'</p></div><a class="btn" href="{gmap(p.get("query") or p["name"])}" target="_blank" rel="noopener">지도</a></li>')
            out += '</ul>'
        out += '</div>'
    if d.get("alternatives"):
        out += ('<div class="sub">상황별로 조금만 바꾸기</div>' if pb else "") + '<div class="alts">' + "".join(f'<div class="alt"><b>{e(a["when"])}</b><p>{rich(a["text"])}</p></div>' for a in d["alternatives"]) + '</div>'
    return out


BASE = SITE.get("base_url", "").rstrip("/") + "/"
MARK = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "brand", "icon.svg"), encoding="utf-8").read().strip()


def brand(up):
    """로고: 경로 점선 + 핀 심볼과 워드마크. 홈으로 가는 링크."""
    m = MARK.replace("<svg ", '<svg aria-hidden="true" ', 1)
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
            + ('<meta name="feedback" content="on">' if FEEDBACK else "") + f'<title>{e(title)}</title>\n{fonts(font_themes or [theme])}\n<link rel="stylesheet" href="{up}assets/style.css?v={ASSET_V['css']}">\n'
            f'<body class="theme-{e(theme)}">\n{body}\n<div class="toast" role="status" aria-live="polite" hidden></div><a class="totop" href="#" aria-label="맨 위로">↑</a>\n<script src="{up}assets/app.js?v={ASSET_V['js']}"></script>\n</body>\n</html>\n')


# ---------------------------------------------------------------- 여행 상세
def render_trip(slug, t):
    P = []
    w = P.append
    use_map(t)
    DOM = domestic(t)  # 국내 여행: 환율·면세·회화·택시 카드·현지 시각처럼 해외에서만 쓰는 도구를 숨긴다
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
<div class="countdown" data-start="{t["start"]}" data-end="{t["end"]}" aria-live="off"><span class="cd-l">출발까지</span><div class="cd-tiles"><span><b data-u="d">--</b><small>일</small></span><span><b data-u="h">--</b><small>시간</small></span><span><b data-u="m">--</b><small>분</small></span></div></div>
<div class="cta">{"".join(links)}</div>
</div><canvas class="petals" aria-hidden="true"></canvas><div class="kenjo" aria-hidden="true"></div></header>''')
    if t.get("stay_ja") and not domestic(t):
        w(live.quickbar(t, lang(t)["taxi"].replace("{stay}", t["stay_ja"]), t["stay"][0][1].split(" (")[0] + "까지 가 주세요"))
    else:
        w(live.quickbar(t, "", ""))
    w('<main class="wrap">')

    # 1. 간단 일정표
    w('<section id="simple"><h2>한눈에 보는 일정</h2>'
      '<p class="lead">날짜를 누르면 하루가 6칸으로 펼쳐져요. 시각은 대략치예요.</p><div class="days">')
    for i, d in enumerate(t["days"], 1):
        w(f'<details class="day c-{e(d["color"])}" data-date="{d["date"]}"{" open" if i == 1 else ""}><summary class="dh"><b>{i}일차 · {md(d["date"])}</b><small>{e(d["theme"])}</small></summary><table class="simple"><tbody>')
        for r in d["simple"]:
            cls = "meal" if r["slot"] in ("아침", "점심", "저녁") else ""
            w(f'<tr class="{cls}"><td class="k">{e(r["slot"])}</td><td class="t">{e(r["time"])}</td><td>{rich(r["text"])}</td></tr>')
        w(f'</tbody></table><button type="button" class="day-go" data-goto="day{i}">{i}일차 자세히 보기</button>'
          + (f'<button type="button" class="day-go pb" data-open="alt-{i}">플랜 B · {e(d["plan_b"]["title"])}</button>' if d.get("plan_b") else "") + '</details>')
    w('</div></section>')

    # 2. 한눈에 보기
    trav = t.get("travelers", [])
    if trav:
        cfg = {"trip": slug, "travelers": trav, "supabase": {"url": SITE.get("supabase_url", ""), "key": SITE.get("supabase_anon_key", "")},
               "geo": t.get("geo"), "currency": t.get("currency"), "start": t["start"], "end": t["end"],
               "days": [{"date": d["date"], "blocks": [{"time": b["time"], "type": b["type"], "place": plain(b["place"]), "what": plain(b["what"]), "note": plain(b["note"]), "fl": [k for k, _ in flags(b)], "area": b.get("area", ""), "alert": b.get("alert")} for b in d["blocks"]], "alt": bool(d.get("alternatives") or d.get("plan_b"))} for d in t["days"]],
               "budget": [[r[2], r[3]] for r in (t.get("budget") or {}).get("rows", [])[:len(t["days"])]],
               "flights": t.get("flights", []), "stay_ja": t.get("stay_ja", ""), "stay_query": t.get("stay_query", ""),
               "timezone": t.get("timezone", "Asia/Seoul" if DOM else "Asia/Tokyo"), "lang": lang(t)["code"],
               "map": MAP["kind"], "domestic": DOM}
        cfg.update(live.cfg_extra(t))
        w(f'<script type="application/json" id="trip-cfg">{json.dumps(cfg, ensure_ascii=False)}</script>')
        w('<section id="picks"><div class="card pickpanel"><div class="pp-h"><h3>우리의 픽</h3><span class="pp-store"></span></div>'
          '<p class="lead" style="margin:0 0 10px">가고 싶은 곳에 하트를 눌러 두면 누가 고른 곳인지 장소마다 보여요. '
          '<span class="ai">AI 추천</span>은 ' + ("네이버" if MAP["kind"] == "naver" else "구글") + ' 평점·리뷰 수와 지도 메모를 보고 Claude가 고른 곳이에요.</p>'
          '<div class="pp-who" role="group" aria-label="나는 누구">' + "".join(f'<button type="button" class="tone-{e(x.get("tone", "pri"))}" data-me="{e(x["name"])}">{e(x["name"])}</button>' for x in trav) + '</div>'
          '<div class="pp-actions"><button type="button" class="btn primary" data-pk="start">픽 고르기</button>'
          '<button type="button" class="btn" data-pk="save" hidden>저장</button><button type="button" class="btn" data-pk="cancel" hidden>취소</button>'
          '<button type="button" class="btn" data-open="picks-all">모아보기</button></div>'
          '<div class="pp-sum"></div></div></section>')
        w(sheet("picks-all", "우리의 픽 모아보기", "둘 다 고른 곳부터 보여요", '<div class="pk-list"></div>'))
    # 여행 도구 (트리플·완더로그·스티플에서 흔한 기능을 정적 사이트로)
    cur = {} if DOM else (t.get("currency") or {})
    sym = cur.get("symbol", "")
    city = (t.get("geo") or {}).get("city", "")
    ph = [] if DOM else (t.get("phrases") or [])
    if ph and isinstance(ph[0], list):
        ph = [{"cat": "기본", "items": ph}]
    pk = t.get("packing") or []
    npk = sum(len(c["items"]) for c in pk)
    fx_mini = f'{sym}100 ≈ ₩{cur.get("fallback_krw_per_100", "")}' if cur else ""
    tiles = [
        ("t-wx", "tool-wx", "☀︎", "날씨", f'<small class="wx-mini">{e(city)}</small>'),
        ("t-fx", "tool-fx", e(sym or "₩"), "환율 계산", f'<small class="fx-mini">{e(fx_mini)}</small>') if cur else None,
        ("t-ph", "tool-ph", lang(t)["icon"], lang(t)["name"] + " 회화", f'<small>{sum(len(c["items"]) for c in ph)}문장 · 소리로 듣기</small>') if ph else None,
        ("t-bag", "tool-bag", "⌸", "캐리어 짐", f'<small class="bag-mini">{npk}개 챙기기</small>') if pk else None,
        ("t-ex", "tool-ex", "÷", "함께 쓴 돈", '<small class="ex-mini">기록하고 나눠요</small>'),
        ("t-go", "", "➚", "다음 장소 길찾기", f'<small class="go-mini">{MAP["name"]}로 열기</small>'),
        ("t-pk", "", "✓", "출발 전 확인", '<small class="pk-mini">예약·확인 체크</small>'),
        ("t-sos", "tool-sos", "!", "비상 연락", '<small>경찰·구급' + ('·병원' if DOM else '·영사콜센터') + '</small>') if t.get("emergency") else None,
        ("t-taxi", "", "⛟", "택시 카드", '<small>기사님께 보여 주기</small>') if t.get("stay_ja") and not DOM else None,
        ("t-log", "tool-log", "✎", "여행 기록", '<small class="log-mini">다녀온 곳·사진·한 줄</small>'),
        ("t-sync", "tool-sync", "⇄", "일행과 맞추기", '<small>픽·지출을 링크로 보내기</small>') if len(trav) > 1 else None,
        ("t-tz", "tool-tz", "◷", "현지 시각", f'<small class="tz-mini">{e(t.get("local_tz_note", ""))}</small>') if not DOM else None,
    ]
    at = next((k for k, x in enumerate(tiles) if x and x[0] == "t-taxi"), len(tiles) - 1) + 1
    tiles[at:at] = live.tiles(t)
    tiles += extras.tiles(t)
    tl = []
    for x in tiles:
        if not x:
            continue
        cls, did, ic, name, sub = x
        if cls == "t-taxi":
            tl.append(f'<button type="button" class="tool {cls}" data-big="{e(lang(t)["taxi"].replace("{stay}", t["stay_ja"]))}" data-bigko="{e(t["stay"][0][1].split(" (")[0])}까지 가 주세요"><span class="ti">{ic}</span><b>{name}</b>{sub}</button>')
            continue
        if did.startswith("href:"):
            ext = ' target="_blank" rel="noopener"' if did.startswith("href:http") else ""
            tl.append(f'<a class="tool {cls}" href="{e(did[5:])}"{ext}><span class="ti">{ic}</span><b>{name}</b>{sub}</a>')
        elif cls == "t-pk":
            tl.append(f'<a class="tool {cls}" href="#before"><span class="ti">{ic}</span><b>{name}</b>{sub}</a>')
        elif cls == "t-go":
            tl.append(f'<a class="tool {cls}" href="{gmap(t.get("stay_query") or city)}" target="_blank" rel="noopener"><span class="ti">{ic}</span><b>{name}</b>{sub}</a>')
        else:
            tl.append(f'<button type="button" class="tool {cls}" data-open="{did}"><span class="ti">{ic}</span><b>{name}</b>{sub}</button>')
    w('<section id="tools" class="tools-sec"><div class="nowcard card" hidden></div><h2>여행 도구</h2><div class="tools">' + "".join(tl) + '</div></section>')
    w(sheet("tool-wx", "날씨", e(city) + " · 지금과 여행 날짜", '<div class="wx" aria-live="polite"><p class="lead">불러오는 중이에요…</p></div><p class="lead" style="margin:12px 0 0;font-size:13px">여행 날짜는 출발 16일 전부터 실제 예보, 그 전에는 작년 같은 날짜의 실제 날씨예요. 자료: Open-Meteo</p>'))
    if cur:
        w(sheet("tool-fx", "환율 계산", f'{e(cur.get("name", ""))} ↔ 원', f'<div class="fx" data-sym="{e(sym)}"><div class="fx-dir seg" role="group" aria-label="방향"><button type="button" data-dir="f" aria-pressed="true">{e(sym)} → ₩</button><button type="button" data-dir="k" aria-pressed="false">₩ → {e(sym)}</button></div>'
              f'<label class="fx-row"><span class="fx-from">{e(sym)}</span><input type="number" inputmode="decimal" class="fx-in" value="1000" aria-label="금액"></label>'
              f'<div class="fx-out"><span class="fx-to">₩</span> <b>-</b></div><div class="fx-quick"></div>'
              + (f'<p class="fx-tax">면세: 2026년 11월부터 가게에서는 세금 포함으로 내고, 출국할 때 공항에서 소비세 10%를 돌려받아요. 같은 가게 하루 세금 제외 {e(sym)}5,000 이상, 여권 필수예요.</p>' if t.get("country") == "일본" else "")
              + f'<p class="lead fx-rate" style="margin:12px 0 0;font-size:13px">기본값 {e(sym)}100 ≈ ₩{cur.get("fallback_krw_per_100", "")} · 실시간 환율을 불러오는 중이에요</p></div>'))
    if ph:
        tabs = '<div class="seg" role="tablist">' + "".join(f'<button type="button" role="tab" data-cat="{k}" aria-selected="{str(k == 0).lower()}">{e(c["cat"])}</button>' for k, c in enumerate(ph)) + '</div>'
        lists = "".join(f'<ul class="phr" data-cat="{k}"{"" if k == 0 else " hidden"}>' + "".join(
            f'<li><button type="button" data-say="{e(j)}"><span class="ko">{e(ko)}</span><b lang="ja">{e(j)}</b><small>{e(r)}</small></button><button type="button" class="big" data-big="{e(j)}" data-bigko="{e(ko)}" aria-label="크게 보여주기">⤢</button></li>'
            for ko, j, r in c["items"]) + '</ul>' for k, c in enumerate(ph))
        w(sheet("tool-ph", lang(t)["name"] + " 회화", "누르면 소리로 들려요 · ⤢ 누르면 크게 보여 줘요", tabs + lists))
    if pk:
        inner = ('<div class="bag-top"><div class="ring"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" class="bg"/><circle cx="18" cy="18" r="15.5" class="fg" pathLength="100"/></svg><b class="bag-pct">0%</b></div>'
                 '<div class="bag-filter seg" role="group"><button type="button" data-bf="all" aria-pressed="true">전체</button><button type="button" data-bf="기내" aria-pressed="false">기내</button><button type="button" data-bf="위탁" aria-pressed="false">위탁</button><button type="button" data-bf="left" aria-pressed="false">남은 것</button></div></div>'
                 + "".join(f'<div class="bag-cat"><h4>{e(c["cat"])}</h4><ul class="bag">' + "".join(
                     f'<li data-bag="{e(c["cat"])}-{n}" data-where="{e(wh)}" tabindex="0" role="checkbox" aria-checked="false"><span class="box"></span><span class="nm">{e(it)}</span><span class="wh {"cab" if wh == "기내" else "chk"}">{e(wh)}</span></li>'
                     for n, (it, wh) in enumerate(c["items"])) + '</ul></div>' for c in pk)
                 + '<form class="bag-add"><input name="it" placeholder="챙길 것 직접 추가" required><select name="wh" aria-label="기내 또는 위탁"><option>기내</option><option>위탁</option></select><button class="btn primary" type="submit">추가</button></form>'
                 '<div class="bag-mine"></div><button type="button" class="btn bag-reset">체크 모두 지우기</button>')
        w(sheet("tool-bag", "캐리어 짐 싸기", e(t.get("packing_note") or f"{start.month}월 {'초' if start.day <= 10 else '중순' if start.day <= 20 else '말'} {city} 날씨 기준") + " · 이 휴대폰에 저장돼요", inner))
    cats = ["식비", "교통", "쇼핑", "카페·간식", "입장료", "기타"]
    w(sheet("tool-ex", "함께 쓴 돈", "이 휴대폰에 저장돼요", '<form class="exf"><input name="what" placeholder="무엇에 썼나요 (예: 라멘)" required>'
            '<div class="exf-cat seg" role="group" aria-label="분류">' + "".join(f'<button type="button" data-cat="{c}" aria-pressed="{str(k == 0).lower()}">{c}</button>' for k, c in enumerate(cats)) + '</div>'
            f'<div class="exf-row"><label class="fx-row sm"><span>{e(sym or "₩")}</span><input name="amt" type="number" inputmode="decimal" placeholder="금액" required></label>'
            '<div class="exf-who" role="group" aria-label="낸 사람">' + "".join(f'<button type="button" class="tone-{e(x.get("tone", "pri"))}" data-payer="{e(x["name"])}" aria-pressed="{str(n == 0).lower()}">{e(x["name"])}</button>' for n, x in enumerate(trav)) + '</div></div>'
            '<div class="exf-row">' + ("" if DOM else '<button type="button" class="exf-tf" aria-pressed="false">면세로 샀어요</button>') + '<button class="btn primary" type="submit">추가</button></div></form><div class="exsum"></div><div class="excat"></div><div class="extf"></div><ul class="exlist"></ul>'))
    w(sheet("tool-sync", "일행과 맞추기", "서버 없이 링크 하나로 픽과 지출을 합쳐요",
            '<ol class="steps"><li><b>내 기록 보내기</b><span>아래 버튼을 누르면 내 픽, 함께 쓴 돈, 출발 전 체크가 담긴 링크가 만들어져요. 카카오톡이나 문자로 보내요.</span></li>'
            '<li><b>받은 사람이 링크 열기</b><span>링크를 열면 무엇이 들어 있는지 보여 주고, 합치기를 누르면 그 휴대폰 기록과 합쳐져요.</span></li>'
            '<li><b>서로 한 번씩</b><span>둘이 한 번씩 보내면 양쪽이 같아져요. 기록은 링크 안에만 담기고 어디에도 올라가지 않아요.</span></li></ol>'
            '<div class="sync-me"></div><div class="row"><button type="button" class="btn primary" data-sync="send">내 기록 보내기</button></div>'))
    w(sheet("sync-in", "기록을 받았어요", "", '<div class="sync-body"></div><div class="row"><button type="button" class="btn primary" data-sync="merge">내 기록과 합치기</button><button type="button" class="btn" data-close>나중에</button></div>'))
    w('<dialog class="photoview" aria-label="사진 보기"><img alt=""><div class="pv-bar"><button type="button" data-pv="del">삭제</button><button type="button" data-pv="close">닫기</button></div></dialog>')
    if t.get("emergency"):
        w(sheet("tool-sos", "비상 연락", "누르면 전화가 걸려요", '<ul class="sos">' + "".join(
            (f'<li><a href="tel:{e(num.replace("-", ""))}"><span>{e(nm)}</span><b>{e(num)}</b></a></li>' if any(ch.isdigit() for ch in num) else f'<li><a href="{e(t.get("emergency_link", "#"))}" target="_blank" rel="noopener"><span>{e(nm)}</span><b>{e(num)} ↗</b></a></li>')
            for nm, num in t["emergency"]) + '</ul>' + ("" if DOM else '<p class="lead" style="margin:12px 0 0;font-size:13px">여권을 잃어버리면 경찰서에서 분실 신고서를 받은 뒤 총영사관에서 여행증명서를 받아요. 여권 사진면을 휴대폰에 찍어 두면 빨라요.</p>')))
    w('<dialog class="bigshow" aria-label="크게 보여주기"><b lang="ja"></b><small></small><span>화면을 누르면 닫혀요</span></dialog>')
    w(sheet("tool-log", "여행 기록", "다녀온 곳, 한 줄 기록, 사진 · 이 휴대폰에 저장돼요", '<div class="log"></div>'))
    w(extras.sheets(slug, t))
    w(live.sheets(t))
    w(sheet("tool-tz", "현지 시각", e(t.get("local_tz_note", "")), '<div class="tz"><div><small>현지</small><b class="tz-local">--:--</b></div><div><small>한국</small><b class="tz-home">--:--</b></div></div>'))
    w('<section id="overview"><h2>숙소·이동·예약</h2><p class="lead">누르면 자세한 내용이 열려요.</p><div class="stack">')
    kv = lambda rows: "".join(f"<dt>{e(k)}</dt><dd>{rich(v)}</dd>" for k, v in rows)
    plain1 = lambda x: re.sub(r"\*\*|\{확인 필요\}", "", x)
    ov_chips, ov_dlgs = [], []
    stay_map = f'<div class="row"><a class="btn primary" href="{gmap(t["stay_query"])}" target="_blank" rel="noopener">숙소 {MAP["name"]}</a></div>' if t.get("stay_query") else ""
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
        w('<div class="card"><h3>날짜별 강도·복귀 계획</h3><ul class="pace">')
        for r in p["rows"]:
            w(f'<li><b>{rich(r[0])}</b><span>{rich(r[1])}</span><small>{rich(" · ".join(r[2:-1]))}</small><em>{e(p["columns"][-1])} {rich(r[-1])}</em></li>')
        w("</ul></div>")
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
    w('<section id="detail"><h2>날짜별 일정</h2>')
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
            mk = MODE_KO.get(r["mode"], r["mode"])
            nm = nmap_route(r["mode"], stops) if MAP["kind"] == "naver" else ""
            if nm:  # 네이버 지도 앱 길찾기. 앱이 없거나 컴퓨터면 구글 지도 경로로 연다
                rbtn = f'<a class="btn primary" href="{dirurl(r["mode"], stops)}" data-nmap="{e(nm)}" target="_blank" rel="noopener">네이버 지도 길찾기 ({mk})</a>'
                hint = "장소를 누르면 네이버 지도가 열려요. 아래 지도를 불러온 뒤에는 누른 장소로 지도가 바뀌어요. 길찾기는 네이버 지도 앱으로, 앱이 없으면 구글 지도로 열어요."
            elif MAP["kind"] == "naver":
                rbtn = f'<a class="btn primary" href="{dirurl(r["mode"], stops)}" target="_blank" rel="noopener">구글 지도에서 전체 경로 ({mk})</a>'
                hint = "장소를 누르면 네이버 지도가 열려요. 아래 지도를 불러온 뒤에는 누른 장소로 지도가 바뀌어요. 하루 전체 경로는 구글 지도로 열어요."
            else:
                rbtn = f'<a class="btn primary" href="{dirurl(r["mode"], stops)}" target="_blank" rel="noopener">구글 지도에서 경로 보기 ({mk})</a>'
                hint = "장소를 누르면 구글 지도 앱이 열려요. 아래 지도를 불러온 뒤에는 누른 장소로 지도가 바뀌어요."
            w('</ol><div class="row">' + rbtn + day_fb + f'<span class="hint">{hint}</span></div>'
              f'<div class="mapbox idle"><iframe loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="{i}일차 지도" data-src="{embed(stops[0]["query"])}"></iframe>'
              f'<button type="button" class="map-load"><b>지도 불러오기</b><small>데이터를 아끼려고 누를 때만 불러와요 · 위 장소 이름을 누르면 {MAP["name"]} 앱이 열려요</small></button>'
              f'<div class="mapcap">지도: <b>{e(stops[0]["label"])}</b>'
              + (f' <a class="mapopen" href="{gmap(stops[0]["query"])}" target="_blank" rel="noopener">네이버 지도로 열기 ↗</a>' if MAP["kind"] == "naver" else "")
              + '</div></div></div>')
        w('<div class="card" style="padding:6px 12px"><table class="blocks"><thead><tr><th>시간</th><th>구분</th><th>장소</th><th>내용</th><th>이동·소요</th><th>비고</th></tr></thead><tbody>')
        pl_ids = {p["name"]: f"pl-{i}-{n}" for n, p in enumerate(d.get("places", []), 1)}
        blk_dlgs = []
        for j, b in enumerate(d["blocks"], 1):
            bid = f"blk-{i}-{j}"
            pname = plain(b["place"])
            pid = next((v for k, v in pl_ids.items() if k in pname or (pname and pname.split()[0] in k)), "")
            w(f'<tr class="tap" data-open="{bid}" tabindex="0"><td class="time">{e(b["time"])}</td><td class="cat"><span class="tag {TYPE_CLS.get(b["type"], "act")}">{e(b["type"])}</span></td>'
              f'<td class="place">{rich(b["place"])}{"".join(f"<span class=\'fl {k}\'>{v}</span>" for k, v in flags(b))}{live.alert_badge(b)}</td><td>{rich(b["what"])}</td><td class="move">{rich(b["move"])}</td><td class="note">{rich(b["note"])}</td></tr>')
            rows = [("할 일", b["what"]), ("이동·소요", b["move"]), ("메모", b["note"])]
            inner = live.block_extra(b) + '<dl class="kv">' + "".join(f"<dt>{k}</dt><dd>{rich(v)}</dd>" for k, v in rows if plain(v) not in ("", "-")) + "</dl>"
            btns = []
            if pid:
                btns.append(f'<button type="button" class="btn primary" data-open="{pid}">장소 상세 보기</button>')
            if pname and pname not in ("미정", "-"):
                btns.append(f'<a class="btn" href="{gmap(pname)}" target="_blank" rel="noopener">{MAP["name"]}</a>')
            inner += '<div class="row">' + "".join(btns) + "</div>" + live.plan_ctl(bid, b.get("area"), b["type"])
            inner += (f'<div class="jr" data-jr="{bid}"><button type="button" class="jr-done" aria-pressed="false">다녀왔어요</button>'
                      '<div class="jr-stars" role="group" aria-label="별점">' + "".join(f'<button type="button" data-star="{k}" aria-label="{k}점">★</button>' for k in range(1, 6)) + '</div>'
                      '<textarea rows="2" placeholder="한 줄 기록 (맛, 분위기, 다음에 또 올지)"></textarea>'
                      '<div class="jr-pics"></div><label class="jr-add">사진 추가<input type="file" accept="image/*" multiple hidden></label></div>')
            blk_dlgs.append(sheet(bid, rich(b["place"]), f'{i}일차 · {e(b["time"])} · {e(b["type"])}', inner))
        w('</tbody></table></div>' + "".join(blk_dlgs))
        if d.get("alternatives") or d.get("plan_b"):
            pb = d.get("plan_b")
            nm = pb["title"] if pb else " · ".join(a["when"] for a in d["alternatives"])
            w(f'<button type="button" class="gchip ov wide planb" data-open="alt-{i}"><span class="k">플랜 B</span><span class="nm">{e(nm)}</span><small>{"하루 대안 일정 · 휴무 요일 확인" if pb else "날씨나 컨디션이 안 좋을 때 바꿀 일정"}</small></button>')
            w(sheet(f"alt-{i}", "플랜 B", f"{i}일차 · {md(d['date'])}", planb_html(d)))
        if d.get("places"):
            w('<div><div class="sub">장소 ' + str(len(d["places"])) + '곳 · 누르면 상세</div><div class="pchips">')
            dlgs = []
            for n, p in enumerate(d["places"], 1):
                place_fb = fb(t.get("short", "") + f" {md(d['date'])} " + p["name"])
                did = f"pl-{i}-{n}"
                w(f'<div class="pitem"><button type="button" class="pchip" data-open="{did}"><span class="nm">{e(p["name"])}</span><span class="cost">{rich(p.get("cost", ""))}</span></button>{pick_bar(p["name"], ai_for(p["name"]))}</div>')
                inner = (f'<dl class="kv"><dt>주소</dt><dd>{rich(p.get("address", ""))}</dd><dt>영업·휴무</dt><dd>{rich(p.get("hours", ""))}</dd><dt>추천 이유</dt><dd>{rich(p.get("why", ""))}</dd>'
                         + (f'<dt>팁</dt><dd>{rich(p["tip"])}</dd>' if p.get("tip") else "")
                         + f'<dt>예상 비용</dt><dd>{rich(p.get("cost", ""))}</dd></dl><div class="row"><a class="btn primary" href="{gmap(p.get("query") or p["name"])}" target="_blank" rel="noopener">{MAP["name"]}에서 보기</a>{place_fb}</div>')
                dlgs.append(sheet(did, e(p["name"]), e(p.get("local", "")), inner))
            w('</div></div>' + "".join(dlgs))
        w('</div></div>')
    w('</section>')

    # 4. 후보 정리
    cands = t.get("candidates", [])
    if cands:
        cnt = {k: sum(1 for c in cands if c["status"] == k) for k in STATUS}
        w(f'<section id="cands"><h2>후보 장소</h2><p class="lead">조사한 장소 {len(cands)}곳이에요. '
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
        w('<label class="search"><input type="search" class="cand-q" placeholder="장소 찾기 (이름, 종류, 메모)" aria-label="장소 찾기" autocomplete="off"></label><div class="cand-res card" hidden></div>')
        w('<div class="gchips">' + "".join(chips) + '</div>' + "".join(dlgs))
        w('</section>')

    # 5. 비용
    b = t.get("budget")
    if b:
        u = b.get("unit", "")
        M = max(r[3] for r in b["rows"])
        M = int(-(-M // 4000) * 4000) if M > 4000 else max(M, 1)
        w(f'<section id="budget"><h2>{e(b["title"])}</h2><p class="lead">{rich(b.get("note", ""))}</p>'
          f'<div class="card" style="margin-bottom:14px"><h3>일차별 범위</h3><div class="bars">')
        for lab, _, a, z, _ in b["rows"]:
            l, wd = a / M * 100, (z - a) / M * 100
            pos = f"left:{l + wd:.1f}%" if l + wd < 60 else f"right:{100 - l + 1:.1f}%;padding-left:0;padding-right:6px"
            w(f'<div class="bar"><span class="lbl">{e(lab)}</span><span class="track"><span class="rng" style="left:{l:.1f}%;width:{max(wd, 1):.1f}%"></span>'
              f'<span class="val" style="{pos}">{u}{a:,}~{z:,}</span></span></div>')
        ticks = [0, M / 3, M * 2 / 3, M]
        w('</div><div class="axis" aria-hidden="true"><span></span><span class="ticks">'
          + "".join(f'<span style="left:{k / M * 100:.1f}%">{int(k):,}</span>' for k in ticks) + '</span></div></div>')
        w('<div class="card"><h3>날짜별 구성</h3><ul class="bud">')
        for lab, what, a, z, krw in b["rows"] + ([b["total"]] if b.get("total") else []):
            tot = b.get("total") and lab == b["total"][0]
            w(f'<li{" class=tot" if tot else ""}><b>{e(lab)}</b><em>{u}{a:,}~{z:,}</em><span>{rich(what)}</span><small>{e(krw)}</small></li>')
        w(f'</ul><p class="lead" style="margin:12px 0 0;font-size:13px">{rich(b.get("footnote", ""))}</p></div></section>')

    # 6. 출발 전 확인
    bf = t.get("before")
    if bf:
        w(f'<section id="before"><h2>출발 전 확인</h2><p class="lead">{rich(bf.get("note", ""))}</p><div class="grid2">')
        for title, items in bf["lists"]:
            w(f'<div class="card"><h3>{e(title)}</h3><ul class="todo" role="group" aria-label="{e(title)}">'
              + "".join(f'<li tabindex="0" role="checkbox" aria-checked="false" data-ck="{e(title)}-{n}"><span class="box"></span><span>{rich(x)}</span></li>' for n, x in enumerate(items)) + '</ul></div>')
        w('</div></section>')
    w(extras.export_section(slug, t))
    w('</main>')
    if FEEDBACK:
        w(f'<section id="feedback"><div class="card fbcard"><h3>의견 보내기</h3><p class="lead" style="margin:0 0 10px">바꾸고 싶은 곳, 가고 싶은 곳이 있으면 {e(SITE.get("feedback_name", ""))}에게 문자로 알려 주세요. 버튼을 누르면 내용이 적힌 문자 창이 열리고, 받는 사람은 연락처에서 고르면 돼요.</p>'
          f'<div class="row">{fb(t.get("short", "") + " 여행 전체", "문자로 의견 보내기")}</div></div></section>')
    w(f'<footer><div class="wrap">출처: {rich(t.get("source", ""))} <span class="chk">확인 필요</span> 표시는 아직 확정되지 않은 정보예요.</div></footer>')
    names = " · ".join(x["name"] for x in t.get("travelers", []))
    steps = [("아래 탭 4개", "홈은 지금 일정과 여행 도구, 일정은 날짜별 동선과 지도, 장소는 픽과 후보, 준비는 예약·비용·체크예요."),
             ("누르면 팝업", "시간표 한 줄, 장소, 숙소·예약 칩을 누르면 자세한 내용이 아래에서 올라와요. 바깥을 누르거나 ✕로 닫아요."),
             ("우리의 픽", "가고 싶은 곳에 하트를 눌러 저장하면 누가 고른 곳인지" + (f"({names})" if names else "") + " 장소마다 보여요. 나중에 '픽 수정'으로 바꿀 수 있어요."),
             ("일행과 맞추기", "여행 도구의 '일행과 맞추기'에서 링크를 보내면 서로의 픽과 지출이 합쳐져요.")]
    w(sheet("welcome", "이렇게 보면 돼요", e(t.get("short", "")) + " 여행 페이지 사용법",
            '<div class="fan" aria-hidden="true">' + "".join(f'<div class="fc c-{e(d["color"])}" style="--i:{k - (min(len(t["days"]), 5) - 1) / 2}"><small>{k + 1}일차 · {md(d["date"])}</small><b>{e(d["theme"])}</b><span>{len(d["route"]["stops"])}곳</span></div>' for k, d in enumerate(t["days"][:5])) + '</div>'
            '<ol class="steps">' + "".join(f'<li><b>{e(a)}</b><span>{e(b)}</span></li>' for a, b in steps) + '</ol>'
            '<div class="row"><button type="button" class="btn primary" data-close>시작하기</button></div>').replace('<dialog class="sheet"', f'<dialog class="sheet welcome" data-auto="tp-welcome-{e(slug)}"', 1))
    days_txt = " / ".join(d["theme"] for d in t["days"])
    og = {"title": t.get("short", t["title"]) + " 여행 · " + t["start"].replace("-", ".") + "~",
          "desc": f'{nights}박 {nights + 1}일 일정과 지도: {days_txt}', "image": f"trips/{slug}/og.png", "path": f"trips/{slug}/"}
    body = "\n".join(P)
    views = {"simple": "home", "tools": "home", "detail": "plan", "picks": "places", "cands": "places",
             "overview": "prep", "budget": "prep", "before": "prep", "export": "prep", "feedback": "prep"}
    for sid, v in views.items():
        body = body.replace(f'<section id="{sid}"', f'<section data-view="{v}" id="{sid}"', 1)
    body = body.replace('<header class="hero">', '<header class="hero" data-view="home">', 1)
    icons = {"home": '<path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
             "plan": '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/>',
             "places": '<path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/>',
             "prep": '<path d="M5 6.5h14M5 12h14M5 17.5h9"/><path d="m16.5 17.5 1.8 1.8 3-3.4"/>'}
    body += ('<nav class="tabbar" aria-label="화면 바꾸기">' + "".join(
        f'<button type="button" data-tab="{k}"><svg viewBox="0 0 24 24" aria-hidden="true">{icons[k]}</svg><span>{lab}</span></button>'
        for k, lab in (("home", "홈"), ("plan", "일정"), ("places", "장소"), ("prep", "준비"))) + '</nav>')
    return page(t.get("short", t["title"]) + " 여행", body, 2, t.get("theme", "hakata"), og=og)


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


def vtimezone(tz, day):
    """여행 시작일 기준 시차로 VTIMEZONE을 만든다. 서머타임이 있는 곳도 여행 기간 동안은 대개 한 가지 시차라 이것으로 충분하다."""
    try:
        from zoneinfo import ZoneInfo
        z = dt.datetime.combine(day, dt.time(12), ZoneInfo(tz))
    except Exception:
        return []
    m = int(z.utcoffset().total_seconds() // 60)
    off = f"{'+' if m >= 0 else '-'}{abs(m) // 60:02d}{abs(m) % 60:02d}"
    return ["BEGIN:VTIMEZONE", f"TZID:{tz}", "BEGIN:STANDARD", "DTSTART:19700101T000000",
            f"TZOFFSETFROM:{off}", f"TZOFFSETTO:{off}", f"TZNAME:{z.tzname()}", "END:STANDARD", "END:VTIMEZONE"]


def render_ics(slug, t):
    use_map(t)
    tz = t.get("timezone", "Asia/Seoul")
    ev = []

    def add(day, st, en, summary, loc, desc, url, alarm=0):
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
        if alarm:
            L += ["BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + ics_escape(summary), f"TRIGGER:-PT{alarm}M", "END:VALARM"]
        ev.extend(L + ["END:VEVENT"])

    tm = lambda x: dt.time(*map(int, x.split(":")))
    for x in t.get("calendar_extra", []):
        add(d_of(x["date"]), tm(x["start"]), tm(x["end"]), x["title"], x.get("location"), x.get("description"), gmap(x["location"]) if x.get("location") else None, x.get("alarm", 60))
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
            fl = [k for k, _ in flags(b)]
            alarm = 180 if re.search(r"(?<![A-Za-z0-9])(?:[A-Z]{2}|[A-Z]\d|\d[A-Z])\d{3,4}(?!\d)", b["what"]) else (60 if "rsv" in fl else 0)
            add(day, st, en, f"[{b['type']}] {place}", loc, desc, gmap(q or place) if loc else None, alarm)
    cal = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//travel-planner//KO", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
           "X-WR-CALNAME:" + ics_escape(t.get("short", t["title"]) + " 여행"), "X-WR-TIMEZONE:" + tz]
    cal += vtimezone(tz, d_of(t["start"]))
    cal += ev + ["END:VCALENDAR"]
    return "\r\n".join(ics_fold(x) for x in cal) + "\r\n", ev.count("BEGIN:VEVENT")


# ---------------------------------------------------------------- 여행 목록
def render_home(trips):
    cards = []
    for slug, t in sorted(trips, key=lambda x: x[1]["start"], reverse=True):
        s, z = d_of(t["start"]), d_of(t["end"])
        n = (z - s).days
        color = t["days"][0]["color"] if t.get("days") else "hakata"
        lm = t.get("landmark") or {}
        art = lm.get("art")
        if art and os.path.isfile(os.path.join(ROOT, "trips", slug, art)):
            # 랜드마크 일러스트 카드: 위에 그림(직접 그린 SVG), 아래에 제목·날짜·소개
            cards.append(f'<a class="trip lm theme-{e(t.get("theme", "hakata"))} c-{e(color)}" href="trips/{e(slug)}/">'
                         f'<span class="lm-ph"><img src="trips/{e(slug)}/{e(art)}?v={asset_ver(os.path.join(ROOT, "trips", slug, art))}" alt="{e(lm.get("name", ""))} 그림" width="400" height="250" loading="lazy" decoding="async">'
                         f'<span class="lm-top"><span class="dday" data-start="{t["start"]}" data-end="{t["end"]}">{s:%Y.%m}</span>'
                         + (f'<span class="lm-name">{e(lm["name"])}</span>' if lm.get("name") else "") + '</span></span>'
                         f'<span class="ttl">{e(t["title"].replace("*", ""))}</span>'
                         f'<span class="when">{s:%Y.%m.%d} — {z:%m.%d} · {n}박 {n + 1}일 · {e(t.get("country", ""))}</span>'
                         f'<span class="intro">{e(t.get("intro", ""))}</span></a>')
            continue
        has_og = os.path.isfile(os.path.join(ROOT, "trips", slug, "og.png"))
        cover = f'<img class="cover" src="trips/{e(slug)}/og.png" alt="" width="1200" height="630" loading="lazy">' if has_og else ""
        cards.append(f'<a class="trip theme-{e(t.get("theme", "hakata"))} c-{e(color)}{" has-cover" if has_og else ""}" href="trips/{e(slug)}/">{cover}<span class="dday" data-start="{t["start"]}" data-end="{t["end"]}">{s:%Y.%m}</span>'
                     f'<span class="ttl">{e(t["title"].replace("*", ""))}</span><span class="when">{s:%Y.%m.%d} — {z:%m.%d} · {n}박 {n + 1}일 · {e(t.get("country", ""))}</span>'
                     f'<span class="intro">{e(t.get("intro", ""))}</span></a>')
    howto_sheet = sheet("howto", "새 여행 추가하기", "3단계", '''<ol>
<li><code>trips/2027-03-fukuoka/trip.json</code>을 복사해서 <code>trips/연도-월-도시/trip.json</code>을 만들어요.</li>
<li>날짜, 동선(<code>route.stops</code>의 이름과 지도 검색어. 해외는 구글, 국내는 네이버 지도), 시간표를 채워요. 일정 메모를 Claude에게 주면 이 형식으로 바꿔 줘요.</li>
<li>GitHub에 올리면 1~2분 뒤 이 목록과 캘린더 파일이 자동으로 바뀌어요.</li>
</ol>''')
    body = f'''<header class="hero"><div class="wrap">
<div class="topbar">{brand("")}</div>
<div class="eyebrow">TRAVEL PLANNER</div>
<h1>우리 여행을 <em>한곳에</em></h1>
<p>우리 여행의 동선, 지도, 예약, 비용을 한곳에서 봐요. 여행을 누르면 날짜별 일정과 지도가 열려요.</p>
<div class="cta"><button class="btn share" type="button" data-title="{SITE_NAME}">일행에게 공유</button></div>
</div><div class="kenjo" aria-hidden="true"></div></header>
<main class="wrap">
<section><h2>여행 {len(trips)}개</h2><p class="lead">가까운 여행부터 보여요.</p><div class="trips">{"".join(cards)}</div></section>
<section class="howto"><button type="button" class="gchip ov wide" data-open="howto"><span class="k">관리자용</span><span class="nm">새 여행 추가하는 방법</span><small>여행 파일을 하나 만들면 이 목록과 캘린더가 자동으로 바뀌어요</small></button></section>
</main>
{howto_sheet}
<footer><div class="wrap">각 여행의 '캘린더에 추가'를 아이폰에서 누르면 애플 캘린더에 일정이 들어가요.</div></footer>'''
    og = {"title": SITE_NAME, "desc": "우리 여행의 동선, 지도, 예약, 비용을 한곳에서 봐요.", "image": "assets/og-home.png", "path": ""}
    return page(SITE_NAME, body, 0, "hakata", [t.get("theme", "hakata") for _, t in trips] + ["hakata"], og=og)


def main():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(os.path.join(OUT, "assets"))
    here = os.path.dirname(os.path.abspath(__file__))
    open(os.path.join(OUT, "assets", "app.js"), "w", encoding="utf-8").write(
        "\n".join(open(os.path.join(here, f), encoding="utf-8").read() for f in ("app.js", "live.js")))
    open(os.path.join(OUT, "assets", "style.css"), "w", encoding="utf-8").write(extras.theme_css() + open(os.path.join(here, "style.css"), encoding="utf-8").read())
    for f in ("favicon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "og-home.png"):
        shutil.copy(os.path.join(here, "brand", f), os.path.join(OUT, "assets", f))
    manifest = {"name": SITE_NAME, "short_name": SITE_NAME, "lang": "ko", "start_url": "../", "scope": "../", "display": "standalone",
                "background_color": "#f5f6f9", "theme_color": "#24346b",
                "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
                          {"src": "favicon.svg", "sizes": "any", "type": "image/svg+xml"}]}
    open(os.path.join(OUT, "assets", "manifest.webmanifest"), "w", encoding="utf-8").write(json.dumps(manifest, ensure_ascii=False))
    trips, extra_pre = [], []
    tdir = os.path.join(ROOT, "trips")
    for slug in sorted(os.listdir(tdir)):
        p = os.path.join(tdir, slug, "trip.json")
        if not os.path.isfile(p):
            continue
        t = json.load(open(p, encoding="utf-8"))
        t["_shopping"] = extras.load_shopping(slug)
        trips.append((slug, t))
        od = os.path.join(OUT, "trips", slug)
        os.makedirs(od)
        open(os.path.join(od, "index.html"), "w", encoding="utf-8").write(render_trip(slug, t))
        if os.path.isfile(os.path.join(tdir, slug, "og.png")):
            shutil.copy(os.path.join(tdir, slug, "og.png"), os.path.join(od, "og.png"))
        lmi = (t.get("landmark") or {}).get("art")
        if lmi and os.path.isfile(os.path.join(tdir, slug, lmi)):
            shutil.copy(os.path.join(tdir, slug, lmi), os.path.join(od, os.path.basename(lmi)))
        ics, n = render_ics(slug, t)
        open(os.path.join(od, "calendar.ics"), "w", encoding="utf-8", newline="").write(ics)
        extra_pre += extras.write_trip_files(od, slug, t)
        print(f"{slug}: {len(t['days'])}일, 캘린더 {n}건")
    open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(render_home(trips))
    os.makedirs(os.path.join(OUT, "design"))
    open(os.path.join(OUT, "design", "index.html"), "w", encoding="utf-8").write(extras.design_page())
    open(os.path.join(OUT, ".nojekyll"), "w").close()
    import hashlib
    pre = ["./", "assets/style.css", "assets/app.js", "assets/favicon.svg", "assets/manifest.webmanifest"] + [f"trips/{slug}/" for slug, _ in trips] + extra_pre
    h = hashlib.sha1()
    for f in pre:
        fp = os.path.join(OUT, f, "index.html") if f.endswith("/") else os.path.join(OUT, f)
        h.update(open(fp, "rb").read())
    sw = open(os.path.join(here, "sw.js"), encoding="utf-8").read().replace("__VER__", h.hexdigest()[:10]).replace("__PRE__", json.dumps(pre))
    open(os.path.join(OUT, "sw.js"), "w", encoding="utf-8").write(sw)


import extras  # noqa: E402  (위 도우미 함수를 쓰므로 맨 아래에서 불러온다)
import live  # noqa: E402

if __name__ == "__main__":
    sys.exit(main())
