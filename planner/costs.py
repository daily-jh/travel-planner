"""일차별 1인 비용을 종류별로 나눈다 (budget 막대 차트용).

trip.json의 days[].blocks에서 블록 종류(type)와 'what'에 적힌 가격(¥1,080, ₩12,000, 1.2만 원 …)을 읽어
식비·카페·간식·체험·입장료로 묶고, budget.rows의 최소·최대 합계와 맞춘다.
- 'A / B' 는 택1 → 가장 싼 값 ~ 가장 비싼 값
- 'A + B', 'A · B' 는 더하기, '(+C)' 는 선택이라 최대에만 더함
- 계획 범위에서 메뉴 합을 뺀 나머지는 '음료·추가 주문', 메뉴 합이 범위보다 크면 범위를 올린다
- 블록에 "cost_cat"을 적으면 종류를 직접 정할 수 있다 (예: 시장 먹거리 → "식비", 빼려면 "")
- budget.rows 줄에 6번째 칸으로 [{"cat","place","lo","hi"}] 를 주면 자동 계산 대신 그대로 쓴다
"""
import re

CATS = {  # 이름: (색 토큰, 설명)
    "식비": ("viz-1", "아침·점심·저녁"),
    "카페": ("viz-2", "커피·디저트"),
    "간식": ("viz-4", "길거리 음식·과자"),
    "체험·입장료": ("viz-3", "입장권·전망대·체험"),
    "음료·추가 주문": ("viz-5", "술·음료·추가 메뉴 여유"),
    "여유분": ("viz-6", "간식·음료·편의점"),
}
TYPE_CAT = {"아침": "식비", "점심": "식비", "저녁": "식비", "밤": "식비", "식사": "식비", "야식": "식비",
            "카페": "카페", "디저트": "카페", "간식": "간식", "활동": "체험·입장료", "체험": "체험·입장료",
            "관광": "체험·입장료", "입장": "체험·입장료"}
FREE = re.compile(r"무료|free", re.I)
# ¥1,080  ¥1,080~1,100  ₩12,000  12,000원  1.2만 원  $12
NUM = r"\d[\d,]*(?:\.\d+)?"
PRICE = re.compile(rf"([¥₩$€£฿])\s?({NUM})(?:\s?[~–-]\s?[¥₩$€£฿]?\s?({NUM}))?|({NUM})(?:\s?[~–-]\s?({NUM}))?\s?(만\s?원|천\s?원|원)")


def _n(s, mul=1):
    return round(float(s.replace(",", "")) * mul)


def prices(text):
    """글 속 가격들 → [(lo, hi)]"""
    out = []
    for m in PRICE.finditer(text or ""):
        if m.group(2):
            a = _n(m.group(2)); z = _n(m.group(3)) if m.group(3) else a
        else:
            mul = 10000 if m.group(6).startswith("만") else 1000 if m.group(6).startswith("천") else 1
            a = _n(m.group(4), mul); z = _n(m.group(5), mul) if m.group(5) else a
        out.append((a, max(a, z)))
    return out


def cost(text):
    """한 블록의 'what' → (lo, hi) 또는 None"""
    alts = []
    for alt in re.split(r"\s/\s", text or ""):
        must = re.sub(r"\(\+[^)]*\)", "", alt)
        opt = sum(z for _, z in prices(" ".join(re.findall(r"\(\+([^)]*)\)", alt))))
        p = prices(must)
        if p:
            alts.append((sum(a for a, _ in p), sum(z for _, z in p) + opt))
    if not alts:
        return None
    return min(a for a, _ in alts), max(z for _, z in alts)


CAFE = re.compile(r"커피|카페|coffee|cafe|café|스타벅스|starbucks|디저트", re.I)


def _short(place):
    s = re.sub(r"\s*(택1|\d+F|B\d+F?)(\s|$)", " ", place)
    return s.strip() or place


def day_items(day, row_text=""):
    """하루 블록 → [{"cat","place","what","lo","hi"}]"""
    items = []
    for b in day.get("blocks", []):
        cat = b.get("cost_cat", TYPE_CAT.get(b.get("type", "")))
        what = b.get("what", "")
        if b.get("type") == "쇼핑" and "cost_cat" not in b:
            # 쇼핑은 빼되, 비용 줄에 이름이 적힌 먹거리(예: 이모야 켄피)만 간식으로
            for seg in re.split(r"\s·\s", what):
                c = cost(seg)
                if c and row_text and seg.split()[0] in row_text:
                    items.append({"cat": "간식", "place": seg.split()[0], "what": seg, "lo": c[0], "hi": c[1]})
            continue
        if not cat:
            continue
        c = cost(what)
        if not c:
            continue
        if cat == "식비" and "cost_cat" not in b and CAFE.search(b.get("place", "")):
            cat = "카페"
        items.append({"cat": cat, "place": _short(b.get("place", "")), "what": what, "lo": c[0], "hi": c[1]})
    return items


def _seg(cat, xs):
    return {"cat": cat, "lo": sum(x["lo"] for x in xs), "hi": sum(x["hi"] for x in xs), "w": sum(x["w"] for x in xs), "items": xs}


def breakdown(t):
    """budget.rows 순서대로 [{"label","lo","hi","segs":[{"cat","lo","hi","items":[...]}]}]"""
    b = t.get("budget") or {}
    days = t.get("days", [])
    out = []
    for i, r in enumerate(b.get("rows", [])):
        lab, text, lo, hi = r[0], r[1], r[2], r[3]
        if len(r) > 5 and isinstance(r[5], list):
            items = [dict(x, what=x.get("what", "")) for x in r[5]]  # 직접 적은 구성
        elif i < len(days):
            items = day_items(days[i], text)
        else:
            items = []
        # 합계 맞추기: 메뉴 가격 합이 계획 범위보다 크면 범위를 올리고(올림 단위 step),
        # 남는 몫은 '음료·추가 주문'(날짜 줄) 또는 '여유분'(날짜 밖 줄)으로 둔다. 그래서 칸을 더하면 늘 그 날 합계가 된다.
        step = 1000 if b.get("unit") == "₩" else 100
        up = lambda v: int(-(-v // step) * step)
        plo, phi = sum(x["lo"] for x in items), sum(x["hi"] for x in items)
        lo = max(lo, up(plo))
        hi = max(hi, up(phi + lo - plo))
        if items and (lo > plo or hi > phi):
            items.append({"cat": "음료·추가 주문", "place": "음료·추가 메뉴", "what": "계산한 메뉴 밖의 음료·술·오토시·추가 주문",
                          "lo": lo - plo, "hi": hi - phi})
        elif not items:
            items = [{"cat": "여유분", "place": text, "what": text, "lo": lo, "hi": hi}]
        for x in items:
            x["w"] = (x["lo"] + x["hi"]) / 2
        segs = []
        for c in CATS:
            xs = [x for x in items if x["cat"] == c]
            if xs:
                segs.append(_seg(c, xs))
        for x in items:  # CATS에 없는 종류(직접 적은 것)도 뒤에 붙임
            if x["cat"] not in CATS and not any(s["cat"] == x["cat"] for s in segs):
                xs = [y for y in items if y["cat"] == x["cat"]]
                segs.append(_seg(x["cat"], xs))
        out.append({"label": lab, "text": text, "lo": lo, "hi": hi, "was": (r[2], r[3]), "segs": segs})
    return out


def totals(t):
    """여행 전체: (최소, 최대, 종류별 [(cat, lo, hi, w)])"""
    data = breakdown(t)
    cats = {}
    for r in data:
        for sg in r["segs"]:
            c = cats.setdefault(sg["cat"], [0, 0, 0])
            c[0] += sg["lo"]; c[1] += sg["hi"]; c[2] += sg["w"]
    order = [c for c in CATS if c in cats] + [c for c in cats if c not in CATS]
    return sum(r["lo"] for r in data), sum(r["hi"] for r in data), [(c, *cats[c]) for c in order]
