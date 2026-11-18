"""여행지 안내: 면세 환급 계산·처리 순서, 에티켓·주의·팁, 역사·문화 이야기.

build.py가 부른다. 표준 라이브러리만 쓴다. 화면 동작은 planner/guide.js.
자료는 두 군데에 나눠 둔다. 새 여행은 guide.json 하나만 쓰면 나라 자료가 저절로 붙는다.
  - planner/countries/<코드>.json   나라 공통: 면세 제도(taxfree), 나라 에티켓(etiquette). "name" 이 trip.json country 와 같아야 한다
  - trips/<폴더>/guide.json          도시: 도시 에티켓, 역사(history), 문화(culture), 면세 메모(taxfree_note)
형식은 planner/TRIP_FORMAT.md '여행지 안내' 참고.
"""
import json
import os
import re

import build as B

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
LV = {"must": ("꼭 지켜요", "!"), "warn": ("조심해요", "△"), "tip": ("알아 두면 좋아요", "✓")}


def _countries():
    d = os.path.join(HERE, "countries")
    out = {}
    for f in sorted(os.listdir(d)) if os.path.isdir(d) else []:
        if f.endswith(".json"):
            c = json.load(open(os.path.join(d, f), encoding="utf-8"))
            out[c["name"]] = c
    return out


COUNTRIES = _countries()


def load(slug, t):
    """{'country': 나라 자료 또는 {}, 'city': guide.json 또는 {}}. 국내 여행은 '한국' 자료를 쓴다."""
    name = "한국" if B.domestic(t) else str(t.get("country", "")).strip()
    p = os.path.join(ROOT, "trips", slug, "guide.json")
    city = json.load(open(p, encoding="utf-8")) if os.path.isfile(p) else {}
    return {"country": COUNTRIES.get(name, {}), "city": city}


def taxfree(t, G):
    return None if B.domestic(t) else G["country"].get("taxfree")


def _etq(G):
    """[(분류, 출처 이름, [항목])]. 도시 것을 먼저."""
    city = G["city"].get("city", "")
    out = [(c["cat"], city, c["items"]) for c in G["city"].get("etiquette", [])]
    out += [(c["cat"], G["country"].get("name", ""), c["items"]) for c in G["country"].get("etiquette", [])]
    return out


def _spots(t):
    """[(i, j, 장소 이름)] 시간표 줄 전체."""
    return [(i, j, B.plain(b["place"])) for i, d in enumerate(t["days"], 1) for j, b in enumerate(d["blocks"], 1)]


def find(t, kw):
    """장소 낱말이 처음 나오는 시간표 줄 (i, j, 이름). 없으면 None."""
    return next(((i, j, p) for i, j, p in _spots(t) if kw and kw in p), None)


def chips(t, places):
    """일정에서 만나는 곳: 누르면 그 시간표 줄 팝업이 열린다. 일정에 없는 곳은 그냥 이름표."""
    out, seen = [], set()
    for kw in places or []:
        hit = find(t, kw)
        if hit and (hit[0], hit[1]) not in seen:
            seen.add((hit[0], hit[1]))
            out.append(f'<button type="button" class="gd-chip" data-open="blk-{hit[0]}-{hit[1]}"><b>{hit[0]}일차</b>{B.e(kw)}</button>')
        elif not hit:
            out.append(f'<span class="gd-chip off">{B.e(kw)}</span>')
    return f'<div class="gd-chips">{"".join(out)}</div>' if out else ""


def tiles(t, G):
    x = []
    if taxfree(t, G):
        x.append(("t-tf", "tool-tf", "%", "면세 환급", f'<small class="tf-mini">{G["country"]["taxfree"]["symbol"]}5,000 넘는지·돌려받을 돈</small>'))
    if _etq(G):
        n = sum(len(i) for _, _, i in _etq(G))
        x.append(("t-etq", "tool-etq", "✓", "에티켓·주의", f'<small>{n}가지 · 일정에 맞춰</small>'))
    if G["city"].get("history") or G["city"].get("culture"):
        x.append(("t-his", "tool-his", "❦", "역사·문화", f'<small>{B.e(G["city"].get("city", ""))} 이야기</small>'))
    return x


def cfg(t, G):
    """trip-cfg 에 더할 것 (면세 계산기)."""
    tf = taxfree(t, G)
    if not tf:
        return {}
    return {"taxfree": {"min": tf["min_ex"], "sym": tf["symbol"], "rates": tf["rates"], "days": tf["days"],
                        "usd": tf.get("home_limit_usd", 800), "usdk": tf.get("usd_krw_fallback", 0), "code": (t.get("currency") or {}).get("code", "JPY")}}


# ---------------------------------------------------------------- 팝업
def _tf_sheet(t, G):
    tf, e, rich = taxfree(t, G), B.e, B.rich
    sym = tf["symbol"]
    chg = "".join(f'<li><em>{e(k)}</em><span>{rich(v)}</span></li>' for k, v in tf["changes"])
    rates = "".join(f'<button type="button" data-r="{r["r"]}" aria-pressed="{str(k == 0).lower()}">{e(r["label"])}</button>' for k, r in enumerate(tf["rates"]))
    days = "".join(f'<option value="{d["date"]}">{k}일차 · {B.md(d["date"])}</option>' for k, d in enumerate(t["days"], 1))
    steps, n = [], 0
    for g in tf["steps"]:
        li = []
        for a, b in g["items"]:
            n += 1
            li.append(f'<li><button type="button" class="tf-ck" data-st="{n}" aria-pressed="false" aria-label="{e(a)} 했어요"></button><b>{e(a)}</b><span>{rich(b)}</span></li>')
        steps.append(f'<div class="tf-g"><h4>{e(g["when"])}</h4><ol class="tf-steps">{"".join(li)}</ol></div>')
    warn = "".join(f'<li><b>{e(a)}</b><span>{rich(b)}</span></li>' for a, b in tf["warn"])
    note = G["city"].get("taxfree_note")
    src = " · ".join(f'<a href="{e(s["url"])}" target="_blank" rel="noopener">{e(s["label"])}</a>' for s in tf.get("sources", []))
    return B.sheet("tool-tf", e(tf["title"]), f"{tf['since'][:4]}년 {int(tf['since'][5:7])}월부터 환급 방식 · 계산기와 처리 순서", f'''<div class="tf" data-sym="{e(sym)}">
<p class="tf-lead">{rich(tf["lead"])}</p>
<ol class="tf-flow" aria-label="흐름"><li><i>1</i><b>세금 포함 결제</b><small>여권 보여 주기</small></li><li><i>2</i><b>세관 확인</b><small>출국 날 체크인 전</small></li><li><i>3</i><b>환급</b><small>카드·앱·현금</small></li></ol>
<div class="seg tf-tabs" role="tablist"><button type="button" role="tab" data-tfp="calc" aria-selected="true">계산기</button><button type="button" role="tab" data-tfp="steps" aria-selected="false">처리 순서 <span class="tf-prog"></span></button><button type="button" role="tab" data-tfp="rule" aria-selected="false">바뀐 점</button></div>
<div class="tf-p" data-tfp="calc">
<form class="tf-form" autocomplete="off">
<label class="fx-row tf-amtrow"><span>{e(sym)}</span><input type="number" inputmode="numeric" class="tf-amt" placeholder="영수증 금액" aria-label="금액" min="0"></label>
<div class="tf-opts"><div class="seg tf-kind" role="group" aria-label="금액 종류"><button type="button" data-k="in" aria-pressed="true">세금 포함</button><button type="button" data-k="ex" aria-pressed="false">세금 빼고</button></div>
<div class="seg tf-rate" role="group" aria-label="세율">{rates}</div></div>
<div class="tf-meta"><input class="tf-store" placeholder="가게 (예: 돈키호테 텐진)" maxlength="30" aria-label="가게 이름"><select class="tf-day" aria-label="산 날"><option value="">오늘</option>{days}</select></div>
<p class="tf-live" aria-live="polite"></p>
<button class="btn primary" type="submit">영수증 담기</button>
</form>
<div class="tf-sum" aria-live="polite"></div>
<ul class="tf-list"></ul>
<div class="row tf-acts"><button type="button" class="btn" data-tf="import">함께 쓴 돈의 면세 기록 불러오기</button><button type="button" class="btn" data-tf="clear">모두 지우기</button></div>
<label class="tf-fee">환급 수수료 <span class="fx-row sm"><input type="number" inputmode="decimal" step="0.1" min="0" max="30" value="0" aria-label="수수료 퍼센트"><span>%</span></span><small>가게 안내문에 적힌 값. 모르면 0</small></label>
<p class="lead tf-foot">같은 가게에서 <b>같은 날</b> 산 영수증끼리 더해 세금 빼고 {e(sym)}{tf["min_ex"]:,} 이상인지 봐요. 기록은 이 휴대폰에만 남아요. 원화는 실시간 환율(안 되면 기본값)로 어림해요.</p>
</div>
<div class="tf-p" data-tfp="steps" hidden>{"".join(steps)}</div>
<div class="tf-p" data-tfp="rule" hidden><ul class="tf-chg">{chg}</ul><h4>헷갈리기 쉬운 것</h4><ul class="tf-warn">{warn}</ul>
{f'<p class="tf-note">{rich(note)}</p>' if note else ""}<p class="lead tf-src">기준일 {e(G["country"].get("checked", ""))} · {src}</p></div>
</div>''')


def _etq_sheet(t, G):
    e, rich = B.e, B.rich
    secs, n = [], 0
    for cat, who, items in _etq(G):
        li = []
        for it in items:
            lv = it.get("lv", "tip")
            lab, ic = LV.get(lv, LV["tip"])
            hit = None
            if it.get("match"):
                rx = re.compile(it["match"])
                hit = next(((i, j, p) for i, j, p in _spots(t) if rx.search(p)), None)
            where = f'<button type="button" class="gd-chip" data-open="blk-{hit[0]}-{hit[1]}"><b>{hit[0]}일차</b>{e(hit[2][:18])}</button>' if hit else ""
            li.append(f'<li class="lv-{lv}" style="--i:{min(n, 12)}"><i aria-label="{lab}">{ic}</i><div><b>{e(it["t"])}</b><span>{rich(it["d"])}</span>{where}</div></li>')
            n += 1
        secs.append(f'<div class="etq-c"><h4>{e(cat)}{f"<em>{e(who)}</em>" if who else ""}</h4><ul class="etq">{"".join(li)}</ul></div>')
    filt = '<div class="seg etq-f" role="group" aria-label="보기">' + '<button type="button" data-lv="all" aria-pressed="true">전체</button>' + "".join(
        f'<button type="button" data-lv="{k}" aria-pressed="false">{v[0]}</button>' for k, v in LV.items()) + '</div>'
    city = G["city"].get("city") or t.get("short", "")
    sub = f"{G['country'].get('name', '')} 공통 + {city}" if G["city"].get("etiquette") and G["country"].get("etiquette") else city
    return B.sheet("tool-etq", "에티켓·주의", e(sub) + " · 일정에 나오는 곳은 날짜를 눌러 봐요", filt + "".join(secs)
                   + f'<p class="lead gd-foot">기준일 {e(G["city"].get("checked") or G["country"].get("checked", ""))} · 현지 사정은 바뀔 수 있어요.</p>')


def _his_sheet(slug, t, G):
    e, rich = B.e, B.rich
    c = G["city"]
    h = c.get("history") or {}
    art = (t.get("landmark") or {}).get("art")
    art = os.path.basename(art) if art and os.path.isfile(os.path.join(ROOT, "trips", slug, art)) else ""
    head = (f'<figure class="his-art"><img src="{e(art)}" alt="" loading="lazy"></figure>' if art else "") + (f'<p class="his-lead">{rich(h["lead"])}</p>' if h.get("lead") else "")
    # 날짜별로 만나는 이야기
    byday = {}
    for k, x in enumerate(h.get("eras", [])):
        for kw in x.get("places", []):
            hit = find(t, kw)
            if hit:
                byday.setdefault(hit[0], []).append((k, x["t"]))
    days = ""
    if byday:
        rows = []
        for i in sorted(byday):
            seen, ts = set(), []
            for k, title in byday[i]:
                if k not in seen:
                    seen.add(k)
                    ts.append(f'<a href="#his-{k}" data-his="{k}">{e(title)}</a>')
            rows.append(f'<li><b>{i}일차</b><span>{"".join(ts)}</span></li>')
        days = f'<div class="his-days"><h4>이번 일정에서 만나는 이야기</h4><ul>{"".join(rows)}</ul></div>'
    tl = "".join(f'<li id="his-{k}" style="--i:{min(k, 10)}"><span class="y">{e(x["y"])}</span><b>{e(x["t"])}</b><p>{rich(x["d"])}</p>{chips(t, x.get("places"))}</li>'
                 for k, x in enumerate(h.get("eras", [])))
    cul = "".join(f'<li style="--i:{min(k, 10)}"><b>{e(x["t"])}</b><p>{rich(x["d"])}</p>'
                  + (f'<p class="try"><em>해 볼 것</em>{e(x["try"])}</p>' if x.get("try") else "") + chips(t, x.get("places")) + '</li>'
                  for k, x in enumerate(c.get("culture", [])))
    tabs = '<div class="seg his-tabs" role="tablist">' + (f'<button type="button" role="tab" data-hp="h" aria-selected="true">역사 {len(h.get("eras", []))}장면</button>' if tl else "") + (
        f'<button type="button" role="tab" data-hp="c" aria-selected="{str(not tl).lower()}">문화·맛</button>' if cul else "") + '</div>'
    src = " · ".join(f'<a href="{e(s["url"])}" target="_blank" rel="noopener">{e(s["label"])}</a>' for s in c.get("sources", []))
    return B.sheet("tool-his", f'{e(c.get("city", ""))} 역사·문화', "떠나기 전에 읽어 두면 같은 길이 다르게 보여요", f'''<div class="his">{head}{days}{tabs}
{f'<ol class="his-tl" data-hp="h">{tl}</ol>' if tl else ""}{f'<ul class="his-cul" data-hp="c"{"" if not tl else " hidden"}>{cul}</ul>' if cul else ""}
<p class="lead gd-foot">기준일 {e(c.get("checked", ""))}{" · " + src if src else ""} · 연도는 전해 오는 이야기를 포함해요.</p></div>''')


def sheets(slug, t, G):
    out = []
    if taxfree(t, G):
        out.append(_tf_sheet(t, G))
    if _etq(G):
        out.append(_etq_sheet(t, G))
    if G["city"].get("history") or G["city"].get("culture"):
        out.append(_his_sheet(slug, t, G))
    return "".join(out)


def block_tips(t, G, b, day=0):
    """시간표 줄 팝업 아래 '알아 두기': 장소·종류에 맞는 에티켓 2개와 그곳 이야기 1개.
    같은 날 같은 팁·이야기는 처음 나오는 줄에만 붙인다. 이동 줄(→)에는 이야기를 붙이지 않는다."""
    seen = G.setdefault("_seen", set())
    text = " ".join(B.plain(b.get(k, "")) for k in ("place", "type", "what"))
    tips = []
    for _, _, items in _etq(G):
        for it in items:
            if it.get("match") and re.search(it["match"], text) and len(tips) < 2 and (day, it["t"]) not in seen:
                seen.add((day, it["t"]))
                tips.append(it)
    stories = []
    place = B.plain(b.get("place", ""))
    if "→" not in place:
        for k, x in enumerate((G["city"].get("history") or {}).get("eras", [])):
            if any(kw in place for kw in x.get("places", [])) and (day, "his", k) not in seen and len(stories) < 2:
                seen.add((day, "his", k))
                stories.append((k, x))
    if not tips and not stories:
        return ""
    e = B.e
    li = "".join(f'<li class="lv-{it.get("lv", "tip")}"><b>{e(it["t"])}</b><span>{B.rich(it["d"])}</span></li>' for it in tips)
    st = "".join(f'<button type="button" class="bk-story" data-open="tool-his" data-his="{k}"><small>{e(x["y"])} · 이곳의 이야기</small><b>{e(x["t"])}</b></button>' for k, x in stories)
    return f'<div class="bk-tips">{f"<h4>알아 두기</h4><ul>{li}</ul>" if li else ""}{st}</div>'
