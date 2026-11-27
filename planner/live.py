"""현지에서 바로 쓰는 화면: 여행 중 퀵 바, QR·바우처, 식당 카드, 주변 대안, 지하철 1일권, 동전 털이.

build.py가 부른다. 표준 라이브러리만 쓴다. 화면 동작은 planner/live.js.
개인정보(예약번호·QR 사진)는 페이지에 넣지 않는다: trip.json 에는 칸 이름만 두고,
내용은 각자 휴대폰(localStorage·IndexedDB)에만 저장한다.
"""
import json
import re

import build as B

# 식당에서 직원에게 보여 줄 문장 (현지어, 한국어). trip.json lang.code 별
EAT = {
    "ja-JP": {
        "basic": [
            ("people", "{n}명이에요", "{n}人です"),
            ("", "줄 서야 하나요? 얼마나 기다려요?", "どのくらい待ちますか？"),
            ("", "한국어나 영어 메뉴판 있나요?", "韓国語か英語のメニューはありますか？"),
            ("", "사진 있는 메뉴판 있나요?", "写真付きのメニューはありますか？"),
            ("", "이거 주세요 (메뉴를 가리키며)", "これをください"),
            ("", "추천 메뉴가 뭐예요?", "おすすめは何ですか？"),
            ("", "카드로 낼 수 있나요?", "カードで払えますか？"),
            ("", "현금으로 낼게요", "現金で払います"),
            ("", "따로 계산할게요", "別々に払います"),
            ("", "같이 계산할게요", "一緒に払います"),
            ("", "물 주세요", "お水をください"),
            ("", "앞접시 하나 더 주세요", "取り皿をもう一枚ください"),
            ("", "포장 되나요?", "持ち帰りできますか？"),
            ("", "계산해 주세요", "お会計お願いします"),
        ],
        # (한국어, 현지어) — 고른 재료로 '빼 주세요'·'알레르기가 있어요' 문장을 만든다
        "ingredients": [("새우", "えび"), ("게", "かに"), ("땅콩", "ピーナッツ"), ("견과류", "ナッツ"), ("계란", "卵"), ("우유", "乳製品"),
                        ("밀", "小麦"), ("메밀", "そば"), ("돼지고기", "豚肉"), ("소고기", "牛肉"), ("날생선", "生の魚"), ("파", "ねぎ"),
                        ("마늘", "にんにく"), ("고수", "パクチー"), ("와사비", "わさび"), ("매운 것", "辛いもの"), ("술(알코올)", "アルコール")],
        "remove": ("{x} 빼 주세요", "{x}を抜いてください"),
        "allergy": ("{x} 알레르기가 있어요", "{x}アレルギーがあります"),
        "sep": "・",
    },
}


# 주변 대안 '내 위치 근처에서 찾기' 단추: (보여 줄 이름, 지도 검색어). 현지어로 찾아야 결과가 많다
NEAR_KW = {
    "ja-JP": [("라멘", "ラーメン"), ("카페", "カフェ"), ("편의점", "コンビニ"), ("드럭스토어", "ドラッグストア"), ("화장실", "公衆トイレ"),
              ("코인로커", "コインロッカー"), ("ATM", "セブン銀行 ATM"), ("약국", "薬局")],
    "ko-KR": [("맛집", "맛집"), ("카페", "카페"), ("편의점", "편의점"), ("약국", "약국"), ("화장실", "공중화장실"), ("주차장", "주차장")],
}


def _hm(s):
    m = re.match(r"(\d{1,2}):(\d{2})", s or "")
    return int(m.group(1)) * 60 + int(m.group(2)) if m else None


def tiles(t):
    """(클래스, 팝업 id, 아이콘, 이름, 부제). 여행 도구 앞쪽에 붙는다."""
    x = []
    if t.get("vouchers"):
        x.append(("t-qr", "tool-qr", "▦", "QR·바우처", '<small class="qr-mini">이 휴대폰에만 저장</small>'))
    if not B.domestic(t) and B.lang(t)["code"] in EAT:
        x.append(("t-eat", "tool-eat", "◍", "식당 카드", '<small>인원·메뉴판·재료 빼기</small>'))
    if t.get("areas"):
        x.append(("t-near", "tool-near", "◎", "주변 대안", '<small>지금 열었을 만한 곳</small>'))
    if t.get("transit_pass"):
        x.append(("t-pass", "tool-pass", "⇆", "지하철 1일권", '<small>살지 말지 날짜별로</small>'))
    if t.get("leftover"):
        x.append(("t-coin", "tool-coin", "◔", "동전 털기·공항", '<small>귀국 날 남은 엔화</small>'))
    return x


def quickbar(t, taxi_big, taxi_ko):
    """여행 중(전날~마지막 날)에만 위에 붙는 바로가기 + 늦으면 안 되는 일정 카운트다운."""
    items = [("q-go", "a", 'href="#" target="_blank" rel="noopener"', "➚", "길찾기")]
    if taxi_big:
        items.append(("q-taxi", "button", f'type="button" data-big="{B.e(taxi_big)}" data-bigko="{B.e(taxi_ko)}"', "⛟", "택시"))
    items.append(("q-ex", "button", 'type="button" data-open="tool-ex"', "÷", "지출"))
    if t.get("currency"):
        items.append(("q-fx", "button", 'type="button" data-open="tool-fx"', B.e(t["currency"].get("symbol", "")), "환율"))
    if t.get("vouchers"):
        items.append(("q-qr", "button", 'type="button" data-open="tool-qr"', "▦", "QR"))
    btns = "".join(f'<{tag} class="qk {cls}" {attrs}><span aria-hidden="true">{ic}</span><b>{lab}</b></{tag}>' for cls, tag, attrs, ic, lab in items)
    return (f'<div class="quick" hidden data-start="{t["start"]}" data-end="{t["end"]}"><div class="qbanner" hidden role="status"></div>'
            f'<nav class="qbar" aria-label="여행 중 바로가기">{btns}</nav></div>')


def alert_badge(b):
    a = b.get("alert")
    return f'<span class="fl alert" title="{B.e(B.plain(a["text"]))}">{B.e(a["by"])} 전</span>' if a else ""


def block_extra(b):
    """시간표 줄 팝업 안: 꼭 지킬 시각 + 건너뛰기·대안으로 바꾸기."""
    out = ""
    a = b.get("alert")
    if a:
        out += f'<p class="blk-alert"><b>{B.e(a["by"])} 전 도착</b><span>{B.rich(a["text"])}</span></p>'
    return out


KIND = {"아침": "eat", "점심": "eat", "저녁": "eat", "밤": "eat", "카페": "cafe", "쇼핑": "shop"}


def plan_ctl(bid, area, typ=""):
    return (f'<div class="plan-ctl" data-plan="{bid}"><button type="button" data-pl="skip" aria-pressed="false">건너뛰기</button>'
            f'<button type="button" data-pl="swap" data-area="{B.e(area or "")}" data-kind="{KIND.get(typ, "all")}">대안으로 바꾸기</button>'
            '<span class="plan-st"></span></div>')


def cfg_extra(t):
    """trip-cfg JSON 에 더할 것: 권역 좌표, 주변 대안 후보, 시간표 줄 권역·마감."""
    near = []
    for c in t.get("candidates", []):
        if c["status"] in ("off", "alt") and c.get("open"):
            near.append({"n": c["name"], "c": c.get("category", ""), "g": c["group"], "a": c.get("area", ""), "o": c["open"],
                         "r": c.get("rating", ""), "m": c.get("memo", ""), "q": c.get("query") or c["name"], "s": c["status"]})
    return {"areas": t.get("areas", {}), "near": near,
            "vouchers": [{k: v["id"] if k == "id" else B.plain(v.get(k, "")) for k in ("id", "label", "hint", "when")} for v in t.get("vouchers", [])]}


def sheets(t):
    e, rich = B.e, B.rich
    out = []
    if t.get("vouchers"):
        out.append(B.sheet("tool-qr", "QR·바우처", "입국 QR, 탑승권, 예약 화면을 한곳에", '''<p class="vault-note"><b>이 휴대폰 안에만 저장돼요.</b> 사이트·서버·공유 링크 어디에도 올라가지 않아요. 캡처 사진·PDF나 예약번호를 넣어 두면 인터넷이 없어도 바로 열려요. 브라우저에 암호화 없이 저장돼요. 공용 기기에는 저장하지 말고 휴대폰 화면 잠금을 켜 두세요.</p>
<ul class="vault-tips"><li><b>두 사람 것</b> 탑승권처럼 사람마다 다른 건 한 칸에 여러 장 넣고 크게 보기에서 옆으로 넘겨요</li><li><b>QR만 크게</b> 캡처 속 QR을 찾아 화면 가득 보여 줘요 · 보는 동안 화면이 꺼지지 않아요</li><li><b>다 썼어요</b> 누르면 아래로 접혀요 · 오늘 쓸 칸이 맨 위에 와요</li></ul>
<ul class="vault" aria-live="polite"></ul>
<details class="vault-mail"><summary>✉︎ 예약 메일 붙여넣기로 칸 만들기</summary><p>예약 확인 메일·문자를 통째로 복사해 붙여 넣으면 날짜·시각·예약번호를 찾아 칸을 만들어요. 글은 이 휴대폰 안에서만 읽어요.</p>
<textarea class="vm-in" rows="5" placeholder="여기에 메일 내용을 붙여 넣어요"></textarea><button type="button" class="btn vm-go">찾기</button>
<form class="vm-out" hidden><label>칸 이름<input name="label" maxlength="30" required></label><label>날짜<input name="when" type="date"></label><label>번호·메모<input name="num" maxlength="80"></label><p class="vm-hit"></p><div class="row"><button class="btn primary" type="submit">칸 만들기</button></div></form></details>
<form class="vault-add"><input name="label" placeholder="칸 직접 추가 (예: 렌터카 예약)" maxlength="30" required><button class="btn primary" type="submit">추가</button></form>
<div class="vault-move"><p><b>새 휴대폰·일행 휴대폰으로 옮기기</b> 보관함을 파일 하나로 만들어 에어드롭으로 보내고, 받은 쪽에서 가져오기를 눌러요. 사진이 그대로 들어 있으니 일행에게만 보내요.</p>
<div class="row"><button type="button" class="btn vault-out">파일로 내보내기</button><label class="btn vault-in">가져오기<input type="file" accept="application/json,.json" hidden></label></div></div>'''))
        out.append('<dialog class="vaultview" aria-label="QR 크게 보기"><button type="button" class="vv-close" aria-label="닫기">✕</button><img alt=""><p class="vv-t"></p>'
                   '<div class="vv-bar"><button type="button" class="vv-prev" aria-label="이전 장">‹</button><span class="vv-n"></span><button type="button" class="vv-crop" hidden></button><button type="button" class="vv-next" aria-label="다음 장">›</button></div>'
                   '<p class="vv-hint">화면 밝기를 최대로 올리면 잘 읽혀요 · 사진을 누르면 확대 · 빈 곳을 누르면 닫혀요</p></dialog>')
    lc = B.lang(t)["code"]
    if lc in EAT and not B.domestic(t):
        E = EAT[lc]
        rows = []
        for kind, ko, ja in E["basic"]:
            if kind == "people":
                rows.append('<li class="eat-n"><span class="ko">인원</span><div class="seg" role="group" aria-label="인원">' + "".join(
                    f'<button type="button" class="btn" data-big="{e(ja.format(n=n))}" data-bigko="{e(ko.format(n=n))}">{n}명</button>' for n in (1, 2, 3, 4)) + '</div></li>')
            else:
                rows.append(f'<li><button type="button" data-big="{e(ja)}" data-bigko="{e(ko)}"><span class="ko">{e(ko)}</span><b lang="ja">{e(ja)}</b></button></li>')
        chips = "".join(f'<button type="button" class="ing" data-ko="{e(k)}" data-ja="{e(j)}" aria-pressed="false">{e(k)}</button>' for k, j in E["ingredients"])
        out.append(B.sheet("tool-eat", "식당 카드", "누르면 직원에게 보여 줄 큰 글씨가 떠요", f'''<ul class="eat">{"".join(rows)}</ul>
<h4 class="eat-h">빼 주세요 · 알레르기</h4><p class="lead" style="margin:0 0 8px;font-size:13px">재료를 고르고 아래 버튼을 눌러요. 여러 개 골라도 돼요.</p>
<div class="ings" data-sep="{e(E["sep"])}" data-rko="{e(E["remove"][0])}" data-rja="{e(E["remove"][1])}" data-ako="{e(E["allergy"][0])}" data-aja="{e(E["allergy"][1])}">{chips}</div>
<div class="row"><button type="button" class="btn primary" data-ing="remove">빼 주세요 보여 주기</button><button type="button" class="btn" data-ing="allergy">알레르기 보여 주기</button></div>'''))
    if t.get("areas"):
        kws = NEAR_KW["ko-KR" if B.domestic(t) else B.lang(t)["code"]] if (B.domestic(t) or B.lang(t)["code"] in NEAR_KW) else []
        chips = "".join(f'<button type="button" data-nkw="{e(q)}" aria-pressed="false">{e(k)}</button>' for k, q in kws)
        out.append(B.sheet("tool-near", "주변 대안", "줄이 너무 길거나 문을 닫았을 때", f'''<div class="near-top"><div class="seg near-f" role="group" aria-label="종류"><button type="button" data-nf="all" aria-pressed="true">전체</button><button type="button" data-nf="eat" aria-pressed="false">식사</button><button type="button" data-nf="cafe" aria-pressed="false">카페</button><button type="button" data-nf="shop" aria-pressed="false">쇼핑</button></div>
<button type="button" class="btn near-gps">◎ 내 위치로 찾기</button></div>
<div class="near-map" hidden><div class="nm-frame"><iframe title="내 위치 지도" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
<div class="nm-bar"><span class="nm-cap"></span><button type="button" class="nm-me">내 위치만</button><a class="nm-open" href="#" target="_blank" rel="noopener">{B.MAP["name"]} 앱 ↗</a></div>
{f'<p class="nm-kh">내 위치 근처에서 바로 찾기 · 실제 영업 여부는 지도 앱이 보여 줘요</p><div class="nm-kw">{chips}</div>' if chips else ''}</div>
<p class="near-where lead"></p><ul class="near" aria-live="polite"></ul>
<p class="lead" style="font-size:12.5px;margin:12px 0 0">아직 일정에 넣지 않은 후보예요. 영업시간은 업종별 보통 시간으로 어림했어요 <span class="chk">확인 필요</span> 가기 전에 지도에서 오늘 영업을 확인해요. '길찾기'는 지도 앱에서 지금 내 위치부터 걷는 길을 열어요. 위치는 이 휴대폰 안에서만 쓰고, 페이지 안 지도를 그릴 때만 구글 지도에 넘겨요.</p>'''))
    tp = t.get("transit_pass")
    if tp:
        price = tp["price"]
        rows = []
        for i, d in enumerate(tp["days"], 1):
            s = sum(f for _, f in d["rides"])
            if not d["rides"]:
                verdict, cls = "지하철 안 타요", "na"
            elif s >= price:
                verdict, cls = f"1일권 이득 · ¥{s - price:,} 아껴요", "win"
            else:
                left = price - s
                verdict, cls = f"그냥 타는 게 나아요 · ¥{left:,} 덜 써요", "lose"
            rides = "".join(f'<li><span>{e(a)}</span><b>¥{f:,}</b></li>' for a, f in d["rides"])
            rows.append(f'<li class="pd {cls}" data-date="{e(d["date"])}"><div class="pd-h"><b>{i}일차 · {B.md(d["date"])}</b><em>{verdict}</em></div>'
                        + (f'<ul class="pd-r">{rides}</ul><div class="pd-s"><span>{len(d["rides"])}번 · 합계</span><b>¥{s:,}</b><span>1일권 ¥{price:,}</span></div>' if d["rides"] else "")
                        + '</li>')
        out.append(B.sheet("tool-pass", e(tp["name"]), f"¥{price:,} · 일정에서 지하철 탈 구간을 세어 봤어요", f'''<p class="pass-touch"><b>먼저, 터치 결제 카드가 있으면 고민 끝</b><span>{rich(tp.get("touch", ""))}</span></p>
<ul class="pdays">{"".join(rows)}</ul>
<p class="lead" style="font-size:13px;margin:12px 0 0">{rich(tp.get("fare_note", ""))} 택시·버스로 가는 구간은 세지 않았어요. 일정을 바꿔 지하철을 더 타면 다시 계산해 보세요: 4번 넘게 타면 대개 1일권이 이득이에요.</p>'''))
    lo = t.get("leftover")
    if lo:
        tips = "".join(f'<li><b>{e(a)}</b><span>{rich(b)}</span></li>' for a, b in lo["tips"])
        ap = "".join(f'<li><b>{e(a)}</b><span>{rich(b)}</span></li>' for a, b in lo["airport"])
        out.append(B.sheet("tool-coin", e(lo["title"]), "귀국 날 아침에 한 번 보면 돼요", f'''<div class="coin-calc"><label>남은 동전·지폐 <span class="fx-row sm"><span>¥</span><input type="number" inputmode="numeric" class="coin-in" placeholder="0" aria-label="남은 엔화"></span></label><p class="coin-out lead"></p></div>
<h4>털어 쓰는 법</h4><ol class="steps coin">{tips}</ol><h4>공항에서 순서</h4><ol class="steps coin">{ap}</ol>'''))
    return "".join(out)
