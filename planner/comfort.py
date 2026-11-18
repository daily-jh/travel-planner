"""여행자 편의 기능: 오늘 챙길 것, 둘이 고르기, 다음 여행 메모.

build.py가 부른다. 표준 라이브러리만 쓴다. 화면 동작은 planner/comfort.js.
기록(체크·고른 곳·메모)은 각자 휴대폰 localStorage 에만 저장된다.

왜 이 셋인가 (2026-11 조사, PR 본문에 출처):
- 오늘 챙길 것: 여행 당일 정보를 휴대폰으로 받고 싶다는 사람이 대부분(MTT 93%)이고,
  호텔에 두고 가는 물건 1위는 충전기·보조배터리(Hotels.com 2024, Choice Hotels 유럽 약 2/3).
  일본은 단기 여행자도 여권을 늘 가지고 다녀야 한다(출입국관리법 23조).
- 둘이 고르기: 커플은 '여행 가서 뭘 할지'를 정할 때 가장 많이 부딪히고(College of Charleston, 25쌍),
  한쪽이 늘 정하는 불균형이 여행 만족도를 낮춘다(Journal of Quality Assurance in Hospitality & Tourism).
- 다음 여행 메모: 같은 플래너를 계속 쓰니, 한 번 겪은 시행착오를 다음 여행 준비 화면에 다시 보여 준다.
"""
import re
import zlib

import build as B

# 마지막 날(체크아웃) 방 나가기 전 확인. 앞쪽일수록 많이 두고 가는 물건
CHECKOUT = [
    ("co-plug", "콘센트에 꽂힌 충전기·어댑터·보조배터리", "호텔 분실물 1위"),
    ("co-safe", "객실 금고 (여권·현금)", ""),
    ("co-bath", "욕실 세면도구·렌즈·화장품", ""),
    ("co-closet", "옷장·문 뒤 옷걸이·잠옷", ""),
    ("co-fridge", "냉장고 속 음료·간식", ""),
    ("co-bed", "침대 밑·이불 속·베개 옆 휴대폰", ""),
    ("co-key", "카드키 반납·짐 맡기기", ""),
]

LESSON_CATS = ["짐", "돈", "일정", "음식", "이동", "기타"]

# 일정 글에 나오면 그날 챙길 것을 더한다 (찾을 말, id, 챙길 것, 이유)
KEYWORDS = [
    (r"온천|스파|테르메|대욕장", "kw-onsen", "갈아입을 속옷·작은 수건·머리끈", "온천 가는 날"),
    (r"워터파크|수영|테르메", "kw-swim", "수영복·수모", "물놀이 하는 날"),
    (r"해변|바다|공원 산책|전망", "kw-wind", "바람막이·얇은 겉옷", "바깥에 오래 있는 날"),
    (r"버스투어|투어 버스", "kw-tour", "멀미약·목베개·간식", "버스를 오래 타는 날"),
    (r"신사|절|텐만구|사원", "kw-coin", "동전 (참배·오미쿠지)", "참배하는 날"),
]


def _all(b):
    return " ".join(B.plain(b.get(k, "")) for k in ("place", "what", "note", "move"))


def _name(b):
    """'점심 택1 · A / B' 는 그대로, 'A · 설명' 은 A 만."""
    p = B.plain(b["place"])
    return p if "택1" in p else p.split(" · ")[0]


def _bid(di, i):
    return f"blk-{di + 1}-{i + 1}"


def _carry_day(t, di, d):
    """하루치 챙길 것: [{id, t, why, open}] — 일정 글·예약·바우처에서 뽑는다."""
    dom = B.domestic(t)
    jp = t.get("country") == "일본"
    items = []
    seen = set()

    def add(i, txt, why="", op=""):
        if i in seen:
            return
        seen.add(i)
        items.append({"id": i, "t": txt, "why": why, "open": op})

    blocks = d["blocks"]
    shop = any("면세" in B.plain(b["place"]) + B.plain(b.get("what", "")) for b in blocks)
    if jp:
        add("pass", "여권", "일본에선 외국인 여권 휴대가 의무" + (" · 면세 구매에도 필요" if shop else ""))
    elif dom:
        car = any(re.search(r"자가용|운전|주차|차로", _all(b)) for b in blocks)
        add("id", "신분증" + (" · 운전면허증" if car else ""), "체크인·운전에 필요")
    else:
        add("pass", "여권", "")
    add("card", "결제 카드" + (" · 교통카드" if not dom else ""), "")
    add("bat", "보조배터리·충전 케이블", "지도·번역을 종일 켜 두면 오후에 꺼져요")
    cash = [_name(b) for b in blocks if any(k == "cash" for k, _ in B.flags(b))]
    if cash and not dom:
        add("cash", "현금", "현금만 받는 곳: " + ", ".join(dict.fromkeys(cash)))
    for v in t.get("vouchers") or []:
        if v.get("when") == d["date"]:
            add("v-" + v["id"], v["label"], "QR·바우처 보관함에 넣어 뒀는지", "tool-qr" if t.get("vouchers") else "")
    rsv = [(b["time"].split("–")[0].split("-")[0], _name(b)) for b in blocks if any(k == "rsv" for k, _ in B.flags(b))]
    if rsv:
        add("rsv", "예약 시각 다시 보기", " · ".join(f"{a} {p}" for a, p in rsv[:3]))
    # 일정 글 속 '챙기기' 문장 그대로
    for i, b in enumerate(blocks):
        for part in re.split(r"\s*·\s*", B.plain(b.get("note", "")) + " · " + B.plain(b.get("what", ""))):
            if "챙기" in part or "챙겨" in part:
                add(f"n-{i}-{zlib.crc32(part.encode()) % 99991}", part.strip(), B.plain(b["place"]).split(" · ")[0])
    text = " ".join(_all(b) for b in blocks)
    for pat, i, txt, why in KEYWORDS:
        if pat == r"신사|절|텐만구|사원" and not jp:
            continue
        if re.search(pat, text):
            add(i, txt, why)
    pace = (t.get("pace") or {}).get("rows") or []
    if di < len(pace) and re.search(r"(^|\s)상\b|상 ·", " ".join(pace[di])):
        add("shoe", "가장 편한 신발", "걷는 양이 가장 많은 날")
    return items


def choices(t):
    """'택1' 줄: 둘이 고르기. [{id, day, time, slot, opts}]"""
    out = []
    for di, d in enumerate(t["days"]):
        for i, b in enumerate(d["blocks"]):
            place = B.plain(b["place"])
            if "택1" not in place:
                continue
            head, _, rest = place.partition("·")
            if rest.strip():
                opts = [x.strip() for x in rest.split("/")]
            else:  # '유후인 점심 택1' 처럼 가게 이름이 설명 칸에만 있으면 값은 빼고 이름만
                opts = [re.split(r"\s+[¥₩\d]", x.strip())[0] for x in B.plain(b.get("what", "")).split("/")]
            opts = [o for o in opts if o][:6]
            if len(opts) >= 2:
                out.append({"id": _bid(di, i), "day": di, "date": d["date"], "time": b["time"],
                            "slot": head.replace("택1", "").strip() or b["type"], "opts": opts})
    return out


def cfg(t):
    """trip-cfg 에 더할 것."""
    return {
        "carry": [_carry_day(t, di, d) for di, d in enumerate(t["days"])],
        "checkout": [{"id": i, "t": x, "why": w} for i, x, w in CHECKOUT] if t.get("stay") else [],
        "choices": choices(t),
        "day_theme": [B.plain(d.get("theme", "")) for d in t["days"]],
        "lesson_cats": LESSON_CATS,
        "short": B.plain(t.get("short") or t["title"]),
    }


def tiles(t):
    x = [("t-carry", "tool-carry", "✓", "오늘 챙길 것", '<small class="carry-mini">나가기 전 한 번 보기</small>')]
    n = len(choices(t))
    if n and len(t.get("travelers") or []) > 1:
        x.append(("t-duo", "tool-duo", "♡", "둘이 고르기", f'<small class="duo-mini">고를 곳 {n}군데 · 양보 저울</small>'))
    x.append(("t-les", "tool-les", "✐", "다음 여행 메모", '<small class="les-mini">이번에 배운 것 남기기</small>'))
    return x


def sheets(t):
    S = B.sheet
    out = [S("tool-carry", "오늘 챙길 것", "그날 일정에서 뽑았어요 · 이 휴대폰에 저장돼요",
             '<div class="carry"><div class="seg carry-days" role="tablist"></div><p class="carry-head"></p>'
             '<ul class="bag carry-list"></ul><div class="carry-co" hidden><h4>방 나가기 전</h4><ul class="bag carry-out"></ul></div>'
             '<form class="bag-add carry-add"><input name="it" placeholder="이날 챙길 것 직접 추가" required><button class="btn primary" type="submit">추가</button></form></div>')]
    if choices(t) and len(t.get("travelers") or []) > 1:
        out.append(S("tool-duo", "둘이 고르기", "'택1' 줄을 한 사람씩 몰래 골라요 · 이 휴대폰에 저장돼요",
                     '<div class="duo"><div class="duo-scale"></div><div class="duo-stage" hidden></div><div class="duo-list"></div>'
                     '<p class="lead duo-why">커플 여행에서 가장 자주 부딪히는 건 \'가서 뭘 할지\' 정할 때래요. 한 사람씩 몰래 고르고, 다르면 양보를 덜 한 사람이 이번엔 양보해요.</p></div>'))
    out.append(S("tool-les", "다음 여행 메모", "이번 여행에서 배운 것 · 다음 여행 준비 때 다시 보여 줘요",
                 '<div class="les"><form class="les-add"><div class="seg les-cat" role="group"></div>'
                 '<div class="bag-add" style="margin-top:0"><input name="it" placeholder="예: 보조배터리 하나 더 · 첫날 저녁은 예약" required><button class="btn primary" type="submit">남기기</button></div></form>'
                 '<div class="les-here"></div><div class="les-past"></div></div>'))
    return "".join(out)
