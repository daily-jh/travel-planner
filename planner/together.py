"""둘이 함께: 택1 함께 고르기, 오늘의 질문, 여행 돌아보기.

build.py가 부른다. 표준 라이브러리만 쓴다. 화면 동작은 planner/together.js.
리서치 근거(2026-11-18, 스레드 '면세 환급·에티켓·역사 안내 추가'):
  - 여행 중 함께 정할 때 한 사람만 고르면 만족도가 떨어진다 → 각자 고르고, 갈리면 번갈아 정한다
  - 여행 뒤 다시 떠올리는(savoring) 사람일수록 여행 효과가 오래간다 → 저녁마다 짧은 질문, 다녀온 뒤 돌아보기
기록은 모두 이 휴대폰(localStorage·IndexedDB)에만 남고, '일행과 공유' 링크로 합칠 수 있다.
"""
import re

import build as B

# 저녁 질문: 감각·고마움·처음 같은 구체적인 장면을 떠올리게 한다 (날마다 하나씩 차례로)
QUESTIONS = [
    "오늘 가장 맛있었던 한 입은 뭐였어?",
    "오늘 가장 크게 웃은 순간은?",
    "사진엔 없지만 오래 기억하고 싶은 장면은?",
    "오늘 상대에게 고마웠던 일 하나",
    "오늘 처음 해 본 것은?",
    "오늘 들은 소리나 맡은 냄새 중 기억나는 것",
    "내일 꼭 하고 싶은 것 하나",
    "다음에 또 온다면 다시 갈 곳은?",
    "이번 여행을 한 단어로 말하면?",
]
LAST_Q = "이번 여행을 한 단어로 말하면?"


def options(b):
    """택1 줄의 고를 것들 [(이름, 가격·내용)]. 장소에 '택1 · A / B' 가 있거나, '택1' 만 있으면 내용의 ' / ' 로 나눈다."""
    place, what = B.plain(b.get("place", "")), B.plain(b.get("what", ""))
    if "택1" not in place:
        return []
    after = place.split("택1", 1)[1].strip(" ·")
    segs = [s.strip() for s in what.split(" / ")] if " / " in what else []
    if " / " in after:
        names = [x.strip() for x in after.split(" / ")]
    else:
        names = [re.split(r"\s*(?:[¥₩]|\d|\(|\{)", s)[0].strip() for s in segs]
    names = [n for n in names if n]
    if len(names) < 2:
        return []
    info = segs if len(segs) == len(names) else [""] * len(names)
    return list(zip(names, info))


def choices(t):
    """[(i, j, 줄, [(이름, 내용)])] 택1 줄 전체."""
    out = []
    for i, d in enumerate(t["days"], 1):
        for j, b in enumerate(d["blocks"], 1):
            o = options(b)
            if o:
                out.append((i, j, b, o))
    return out


def tiles(t):
    x = []
    trav = t.get("travelers", [])
    n = len(choices(t))
    if n and len(trav) > 1:
        x.append(("t-ch", "tool-ch", "⚖", "함께 고르기", f'<small class="ch-mini">택1 {n}곳 · 각자 고르기</small>'))
    if trav:
        x.append(("t-mem", "tool-mem", "✦", "돌아보기", '<small class="mem-mini">저녁 질문 · 날마다 한 장</small>'))
    return x


def block_choose(t, b, bid):
    """시간표 줄 팝업: 택1 함께 고르기."""
    o = options(b)
    trav = t.get("travelers", [])
    if not o or not trav:
        return ""
    e = B.e
    cards = "".join(
        f'<li class="ch-o" data-i="{k}"><div class="ch-t"><b>{e(n)}</b>{f"<small>{e(info)}</small>" if info else ""}</div>'
        f'<div class="ch-v">' + "".join(f'<button type="button" class="tone-{e(x.get("tone", "pri"))}" data-vote="{e(x["name"])}" aria-pressed="false">{e(x["name"])}</button>' for x in trav)
        + '</div></li>' for k, (n, info) in enumerate(o))
    lead = "각자 가고 싶은 곳에 이름을 눌러요. 같으면 바로 정해지고, 갈리면 번갈아 정해요." if len(trav) > 1 else "갈 곳을 골라 두면 시간표와 길찾기에 반영돼요."
    return (f'<div class="ch" data-ch="{bid}" data-names="{e("|".join(n for n, _ in o))}"><h4>{"둘이 고르기" if len(trav) > 1 else "고르기"}</h4>'
            f'<p class="ch-lead">{lead}</p><ul class="ch-os">{cards}</ul><div class="ch-res" aria-live="polite"></div></div>')


def sheets(t):
    e = B.e
    out = []
    trav = t.get("travelers", [])
    ch = choices(t)
    if ch and len(trav) > 1:
        rows = "".join(f'<li><button type="button" data-open="blk-{i}-{j}" data-chrow="blk-{i}-{j}"><small>{i}일차 · {e(b["time"])} · {e(b["type"])}</small>'
                       f'<b>{e(B.plain(b["place"]).split("택1")[0].strip(" ·") or b["type"])} · {len(o)}곳 중</b><span class="ch-st">아직</span></button></li>'
                       for i, j, b, o in ch)
        out.append(B.sheet("tool-ch", "함께 고르기", "택1로 남겨 둔 곳을 각자 골라요", f'''<div class="chl"><div class="chl-sum" aria-live="polite"></div>
<ul class="chl-l">{rows}</ul>
<p class="lead gd-foot">한 사람이 다 정하면 여행 만족이 떨어진다는 연구가 있어요. 의견이 갈리면 지금까지 덜 정한 사람 차례예요. 정한 곳은 시간표·지금 카드·길찾기에 반영되고, '일행과 공유' 링크로 서로 합쳐져요.</p></div>'''))
    if trav:
        days = "".join(f'<button type="button" role="tab" data-md="{k}" aria-selected="false">{k + 1}일차</button>' for k in range(len(t["days"])))
        out.append(B.sheet("tool-mem", "돌아보기", "저녁마다 한 질문, 다녀온 곳과 사진을 날마다 한 장으로", f'''<div class="mem">
<div class="seg mem-days" role="tablist"><button type="button" role="tab" data-md="all" aria-selected="true">한눈에</button>{days}</div>
<div class="mem-body" aria-live="polite"></div>
<p class="lead gd-foot">여행을 자주 떠올릴수록 여행의 좋은 기분이 오래간다는 연구가 있어요. 답은 이 휴대폰에만 남고, '일행과 공유'로 서로의 답을 합칠 수 있어요.</p></div>'''))
    return "".join(out)


def cfg(t):
    q = [QUESTIONS[k % (len(QUESTIONS) - 1)] for k in range(len(t["days"]))]
    if q:
        q[-1] = LAST_Q
    return {"mem_q": q, "title_plain": t.get("short", t["title"]).replace("*", "")}
