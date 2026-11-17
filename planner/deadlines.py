"""예약 오픈·마감 알림: trip.json "deadlines" 를 첫 화면·여행 페이지 카드와 캘린더 알림으로 만든다.

build.py가 부른다. 표준 라이브러리만 쓴다. 남은 시간 표시·'했어요' 체크는 planner/deadlines.js.
'했어요' 기록은 각자 휴대폰(localStorage tp-dl-<여행 폴더>)에만 저장된다.

trip.json 예:
  "deadlines": [
    {"at": "2026-11-24 20:00", "kind": "open", "what": "테르메덴 패키지 특가 오픈",
     "note": "12/18, 12/19 두 밤 · 1박 상품 두 번", "url": "https://..."},
    {"at": "2027-01-13", "kind": "open", "what": "인천공항 P5 예약주차장"}   # 시각 없이 날짜만 → 하루 종일 일정
  ]
kind: open(예약이 열리는 때) · due(마감). tz 를 안 쓰면 한국 시각(Asia/Seoul).
"""
import datetime as dt
import re

import build as B

KIND = {"open": "예약 오픈", "due": "예약 마감"}
WD = "월화수목금토일"


def parse(t):
    """[(번호, dict)] 날짜순. dict: at(datetime, 시각 없으면 None), day(date), tz, kind, what, note, url"""
    out = []
    for i, x in enumerate(t.get("deadlines") or []):
        m = re.fullmatch(r"(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}):(\d{2}))?", (x.get("at") or "").strip())
        if not m:
            continue
        day = B.d_of(m.group(1))
        at = dt.datetime.combine(day, dt.time(int(m.group(2)), int(m.group(3)))) if m.group(2) else None
        out.append({"id": str(x.get("id") or i + 1), "at": at, "day": day, "tz": x.get("tz") or "Asia/Seoul",
                    "kind": x.get("kind") if x.get("kind") in KIND else "due", "what": x.get("what", ""),
                    "note": x.get("note", ""), "url": x.get("url", "")})
    return sorted(out, key=lambda d: (d["day"], d["at"] or dt.datetime.combine(d["day"], dt.time(0))))


def _words(x):
    return {w for w in re.split(r"[\s·,()/—\-]+", B.plain(x)) if len(w) >= 2 and not re.fullmatch(r"[\d:/~]+", w)}


def before_links(t):
    """출발 전 확인 항목 중 예약 알림과 같은 일을 찾는다 {(목록 제목, 번호): 알림 id}.
    알림에 before(항목 글 일부)를 쓰면 그걸로, 없으면 겹치는 낱말이 3개 이상인 항목 중 가장 많이 겹치는 것."""
    lists = (t.get("before") or {}).get("lists") or []
    out = {}
    for d in parse(t):
        raw = next((x for i, x in enumerate(t.get("deadlines") or []) if str(x.get("id") or i + 1) == d["id"]), {})
        best, score = None, 0
        for title, items in lists:
            for n, it in enumerate(items):
                if raw.get("before"):
                    sc = 99 if raw["before"] in B.plain(it) else 0
                else:
                    sc = len(_words(d["what"]) & _words(it))
                if sc > score and (title, n) not in out:
                    best, score = (title, n), sc
        if best and score >= 3:
            out[best] = d["id"]
    return out


def _iso(d):
    """브라우저가 바로 읽을 수 있는 시각 (시차 포함). 날짜만이면 그날 0시."""
    try:
        from zoneinfo import ZoneInfo
        z = ZoneInfo(d["tz"])
    except Exception:
        z = dt.timezone(dt.timedelta(hours=9))
    at = (d["at"] or dt.datetime.combine(d["day"], dt.time(0))).replace(tzinfo=z)
    return at.isoformat(timespec="minutes")


def _when(d):
    s = f'{d["day"]:%m.%d} ({WD[d["day"].weekday()]})'
    return s + (f' {d["at"]:%H:%M}' if d["at"] else "")


def cards(slug, t, up=""):
    """남은 시간 카드 목록. up: 여행 페이지 기준 상대 경로 (첫 화면은 trips/<폴더>/)."""
    rows = []
    short = t.get("short") or t["title"].replace("*", "")
    for d in parse(t):
        k = KIND[d["kind"]]
        link = f'<a class="dl-go" href="{B.e(d["url"])}" target="_blank" rel="noopener">예약 사이트</a>' if d["url"] else ""
        rows.append(
            f'<li class="dl k-{d["kind"]}" data-at="{_iso(d)}" data-allday="{0 if d["at"] else 1}" data-store="tp-dl-{B.e(slug)}" data-id="{B.e(d["id"])}">'
            f'<div class="dl-when"><b class="dl-left">{d["day"]:%m.%d}</b><small>{_when(d)}</small></div>'
            f'<div class="dl-body"><small class="dl-k">{k}{" · " + B.e(short) if up else ""}</small><b>{B.rich(d["what"])}</b>'
            + (f'<span>{B.rich(d["note"])}</span>' if d["note"] else "")
            + f'<div class="dl-act">{link}<a class="dl-cal" href="{up}remind-{B.e(d["id"])}.ics">캘린더 알림</a>'
              f'<button type="button" class="dl-done" aria-pressed="false">했어요</button></div></div></li>')
    return rows


def trip_card(slug, t):
    rows = cards(slug, t)
    if not rows:
        return ""
    return ('<div class="card dlcard" data-dl hidden><div class="nc-h"><span class="live dl-dot"></span>놓치면 안 되는 예약'
            '<em class="dl-sum"></em></div><ol class="dlist">' + "".join(rows) + "</ol></div>")


def home_section(trips):
    rows = []
    for slug, t in trips:
        for r, d in zip(cards(slug, t, f"trips/{slug}/"), parse(t)):
            rows.append((d["day"], d["at"] or dt.datetime.combine(d["day"], dt.time(0)), r))
    if not rows:
        return ""
    rows.sort(key=lambda x: (x[0], x[1]))
    return ('<section class="dlhome" data-dl hidden><h2>다가오는 예약</h2><p class="lead">예약이 열리거나 마감되는 때예요. '
            '끝낸 건 \'했어요\'를 누르면 이 휴대폰에서 접혀요.</p><ol class="dlist">' + "".join(r for *_, r in rows) + "</ol></section>")


# ---------------------------------------------------------------- 캘린더
def _vevent(slug, d, n):
    summary = f'[{KIND[d["kind"]]}] {B.plain(d["what"])}'
    desc = " / ".join(x for x in [B.plain(d["note"]), d["url"]] if x)
    L = ["BEGIN:VEVENT", f"UID:dl-{d['id']}-{slug}@travel-planner", f"DTSTAMP:{dt.datetime.now(dt.timezone.utc):%Y%m%dT%H%M%SZ}"]
    if d["at"]:
        z = d["at"] + dt.timedelta(minutes=15)
        L += [f"DTSTART;TZID={d['tz']}:{d['at']:%Y%m%dT%H%M%S}", f"DTEND;TZID={d['tz']}:{z:%Y%m%dT%H%M%S}"]
        alarms = ["-P1D", "-PT15M"]  # 하루 전, 15분 전
    else:
        L += [f"DTSTART;VALUE=DATE:{d['day']:%Y%m%d}", f"DTEND;VALUE=DATE:{d['day'] + dt.timedelta(days=1):%Y%m%d}"]
        alarms = ["-PT15H", "PT9H"]  # 전날 오전 9시, 당일 오전 9시
    L.append("SUMMARY:" + B.ics_escape(summary))
    if desc:
        L.append("DESCRIPTION:" + B.ics_escape(desc))
    if d["url"]:
        L.append("URL:" + d["url"])
    for a in alarms:
        L += ["BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + B.ics_escape(summary), f"TRIGGER:{a}", "END:VALARM"]
    return L + ["END:VEVENT"]


def ics_events(slug, t):
    """여행 calendar.ics 에 넣을 줄과 필요한 시간대 목록."""
    L, tzs = [], []
    for n, d in enumerate(parse(t)):
        L += _vevent(slug, d, n)
        if d["at"] and d["tz"] not in tzs:
            tzs.append(d["tz"])
    return L, tzs


def remind_files(slug, t):
    """{파일 이름: 내용} 알림 하나씩 따로 받는 .ics (구독하지 않은 휴대폰용)."""
    out = {}
    for n, d in enumerate(parse(t)):
        cal = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//travel-planner//KO", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"]
        if d["at"]:
            cal += B.vtimezone(d["tz"], d["day"])
        cal += _vevent(slug, d, n) + ["END:VCALENDAR"]
        out[f"remind-{d['id']}.ics"] = "\r\n".join(B.ics_fold(x) for x in cal) + "\r\n"
    return out
