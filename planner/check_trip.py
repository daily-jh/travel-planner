"""trip.json 을 올리기 전에 점검한다. 오류가 있으면 종료 코드 1.

  python planner/check_trip.py                     # 모든 여행
  python planner/check_trip.py trips/2027-10-osaka # 한 여행

점검하는 것
- 형식: 필수 항목, 날짜가 첫날~마지막 날과 하루씩 맞는지, 6칸 간단 일정(아침·오전·점심·오후·저녁·밤), 테마·색·상태 값
- 남은 뼈대: {채우기} 가 남아 있으면 오류
- 개인정보: 휴대폰 번호, 이메일, 예약·확인 번호, 여권 번호가 보이면 오류 (공개 저장소라서)
- 영업 요일: closures 의 방문일 요일이 실제 날짜와 맞는지, 장소 영업시간에 적힌 휴무 요일에 방문하는지
- 캘린더: 시각(HH:MM)이 있는 시간표 줄 수. 시각이 없는 줄은 캘린더에 들어가지 않는다
"""
import datetime as dt
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WD = "월화수목금토일"
SLOTS = ["아침", "오전", "점심", "오후", "저녁", "밤"]
DAY_COLORS = {"ume", "hakata", "lantern", "tide", "sea", "gold", "plum", "indigo"}
TYPES = {"아침", "점심", "저녁", "밤", "카페", "이동", "숙소", "활동", "쇼핑"}
STATUS = {"sel", "alt", "off", "exc"}
MODES = {"transit", "driving", "walking"}
REQUIRED = ["title", "short", "theme", "travelers", "start", "end", "timezone", "country", "intro", "days", "geo", "source"]
PRIVATE = [
    (r"(?<!\d)(?:\+?82[-.\s]?)?0?1[016789][-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)", "휴대폰 번호"),
    (r"[\w.+-]+@[\w-]+\.[\w.]+", "이메일"),
    (r"(예약|확인|승인|주문)\s*(번호|코드)\s*[:：]?\s*[A-Za-z0-9-]{4,}", "예약·확인 번호"),
    (r"\b(PNR|booking\s*(no|number|ref)|confirmation)\b\s*[:#]?\s*[A-Z0-9-]{5,}", "예약 번호"),
    (r"여권\s*번호|\b[MSRGD][0-9]{8}\b", "여권 번호"),
]


def closed_days(h):
    """영업시간 글에서 닫는 요일을 뽑는다: '화요일 휴무', '월·화 휴무', '평일 휴무', '토·일만', '주말만 영업'."""
    h = re.sub(r"휴무\s*없음|무휴", "", h).replace("평일", "월화수목금").replace("주말", "토일")
    m = re.search(r"([월화수목금토일](?:[·,/ ]*[월화수목금토일])*)(?:요일)?\s*(정기)?\s*휴(?:무|관)", h)
    if m:
        return "".join(c for c in m.group(1) if c in WD)
    m = re.search(r"([월화수목금토일](?:[·,/ ]*[월화수목금토일])*)(?:요일)?\s*만", h)
    if m:
        return "".join(c for c in WD if c not in m.group(1))
    return ""


def strings(o, path=""):
    if isinstance(o, str):
        yield path, o
    elif isinstance(o, dict):
        for k, v in o.items():
            yield from strings(v, f"{path}.{k}" if path else k)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from strings(v, f"{path}[{i}]")


def check(folder):
    err, warn = [], []
    p = os.path.join(folder, "trip.json")
    try:
        t = json.load(open(p, encoding="utf-8"))
    except Exception as x:
        return [f"trip.json 을 읽을 수 없어요: {x}"], [], {}
    slug = os.path.basename(os.path.normpath(folder))
    if not re.fullmatch(r"\d{4}-\d{2}-[a-z0-9-]+", slug):
        err.append(f"폴더 이름 '{slug}' 은 '연도-월-도시'(영문 소문자) 형식이어야 해요. 예: 2027-10-osaka")
    for k in REQUIRED:
        if k not in t:
            err.append(f"필수 항목 '{k}' 이 없어요")
    if err:
        return err, warn, {}

    themes = json.load(open(os.path.join(ROOT, "planner", "themes.json"), encoding="utf-8"))
    if t["theme"] not in themes:
        err.append(f"theme '{t['theme']}' 은 없는 테마예요 ({', '.join(themes)})")
    try:
        s, z = dt.date.fromisoformat(t["start"]), dt.date.fromisoformat(t["end"])
    except ValueError:
        return err + ["start·end 는 YYYY-MM-DD 형식이어야 해요"], warn, {}
    want = [s + dt.timedelta(days=i) for i in range((z - s).days + 1)]
    got = [d.get("date") for d in t["days"]]
    if got != [d.isoformat() for d in want]:
        err.append(f"days 의 날짜가 {t['start']}~{t['end']} 와 하루씩 맞지 않아요: {got}")
    if not t["travelers"] or any(not x.get("name") for x in t["travelers"]):
        err.append("travelers 에 이름이 필요해요")

    timed = 0
    for i, d in enumerate(t["days"], 1):
        tag = f"{i}일차"
        slots = [r.get("slot") for r in d.get("simple", [])]
        if slots != SLOTS:
            err.append(f"{tag} simple 은 {'·'.join(SLOTS)} 6칸이어야 해요 (지금: {slots})")
        if d.get("color") not in DAY_COLORS:
            err.append(f"{tag} color '{d.get('color')}' 은 없는 색이에요 ({', '.join(sorted(DAY_COLORS))})")
        r = d.get("route") or {}
        if r.get("mode") not in MODES:
            err.append(f"{tag} route.mode 는 {', '.join(sorted(MODES))} 중 하나예요")
        if not r.get("stops") or any(not x.get("label") or not x.get("query") for x in r.get("stops", [])):
            err.append(f"{tag} route.stops 에 label·query 가 있는 장소가 한 곳 이상 필요해요")
        if len(r.get("stops", [])) > 10:
            warn.append(f"{tag} 경로 장소가 {len(r['stops'])}곳이에요. 구글 지도 경로는 10곳까지라 일부가 빠질 수 있어요")
        if not d.get("blocks"):
            err.append(f"{tag} blocks(시간표)가 비었어요")
        for b in d.get("blocks", []):
            for k in ("time", "type", "place", "what", "move", "note"):
                if k not in b:
                    err.append(f"{tag} 시간표 '{b.get('place', '?')}' 에 '{k}' 가 없어요 (빈 값은 \"\")")
            if b.get("type") not in TYPES:
                warn.append(f"{tag} 시간표 구분 '{b.get('type')}' 은 기본 색이 없어요 ({'·'.join(sorted(TYPES))})")
            if re.search(r"\d{1,2}:\d{2}", b.get("time", "")):
                timed += 1
        wd = WD[dt.date.fromisoformat(d["date"]).weekday()] if d.get("date") else ""
        for pl in d.get("places", []):
            off = closed_days(pl.get("hours", ""))
            if wd and wd in off:
                err.append(f"{tag}({wd}) '{pl.get('name')}' 은 {off}요일에 닫아요. 다른 날로 옮기거나 대안을 넣어요")
            if not pl.get("hours"):
                warn.append(f"{tag} '{pl.get('name')}' 영업시간이 비었어요. 모르면 {{확인 필요}}")

        pb = d.get("plan_b")
        if pb:
            if [r.get("slot") for r in pb.get("simple", [])] != SLOTS:
                err.append(f"{tag} plan_b.simple 도 {'·'.join(SLOTS)} 6칸이어야 해요")
            if not pb.get("title"):
                err.append(f"{tag} plan_b 에 title 이 필요해요")
            for pl in pb.get("places", []):
                off = closed_days(pl.get("hours", ""))
                if wd and wd in off:
                    err.append(f"{tag}({wd}) 플랜 B '{pl.get('name')}' 은 {off}요일에 닫아요")
                if not pl.get("hours"):
                    warn.append(f"{tag} 플랜 B '{pl.get('name')}' 영업시간이 비었어요. 모르면 {{확인 필요}}")

    for c in t.get("closures", []):
        if len(c) != 4 or c[3] not in ("ok", "check"):
            err.append(f"closures 줄 {c} 은 [장소, 휴무, 방문일 'M/D 요일', 'ok'|'check'] 형식이어야 해요")
            continue
        m = re.match(r"(\d{1,2})/(\d{1,2})\s*([월화수목금토일])", c[2])
        if m:
            for dd in want:
                if (dd.month, dd.day) == (int(m.group(1)), int(m.group(2))) and WD[dd.weekday()] != m.group(3):
                    err.append(f"closures '{c[0]}' 방문일 {c[2]} 의 요일이 틀려요 (실제 {WD[dd.weekday()]})")
            if c[3] == "ok" and m.group(3) in closed_days(c[1] if "휴무" in c[1] else c[1] + " 휴무"):
                err.append(f"closures '{c[0]}' 은 {c[1]} 휴무인데 {c[2]} 에 가요")
    for c in t.get("candidates", []):
        if c.get("status") not in STATUS:
            err.append(f"후보 '{c.get('name')}' status 는 sel·alt·off·exc 중 하나예요")
        if not c.get("group"):
            err.append(f"후보 '{c.get('name')}' 에 group 이 없어요")

    left, chk = [], 0
    for path, sv in strings(t):
        if "{채우기}" in sv:
            left.append(path)
        chk += sv.count("{확인 필요}")
        for pat, what in PRIVATE:
            if path.startswith("emergency") and what == "휴대폰 번호":
                continue
            if re.search(pat, sv, re.I):
                err.append(f"개인정보로 보이는 {what}: {path} = '{sv[:40]}' (공개 저장소에는 넣지 않아요)")
    for x in t.get("emergency", []):
        if re.search(PRIVATE[0][0], x[1] if len(x) > 1 else ""):
            err.append(f"비상 연락 '{x[0]}' 에 개인 휴대폰 번호가 있어요. 공공 번호(경찰·영사콜센터 등)만 넣어요")
    if left:
        err.append(f"{{채우기}} 가 {len(left)}군데 남았어요: " + ", ".join(left[:8]) + (" …" if len(left) > 8 else ""))
    if not os.path.isfile(os.path.join(folder, "og.png")):
        warn.append(f"og.png(링크 썸네일)가 없어요. node planner/tools/render-assets.js {slug} 로 만들어요")
    lm = t.get("landmark")
    if not lm:
        warn.append("landmark(첫 화면 카드 배경 사진)가 없어요. 없으면 og.png 썸네일로 보여요 (TRIP_FORMAT.md '랜드마크 사진')")
    else:
        if not os.path.isfile(os.path.join(folder, lm.get("image", ""))):
            err.append(f"landmark.image '{lm.get('image')}' 파일이 폴더에 없어요")
        for k in ("name", "credit", "license", "source"):
            if not lm.get(k):
                err.append(f"landmark.{k} 가 비었어요 (사진 출처 표기는 라이선스 조건이에요)")
    return err, warn, {"days": len(t["days"]), "timed": timed, "chk": chk,
                       "cands": len(t.get("candidates", [])), "places": sum(len(d.get("places", [])) for d in t["days"])}


def main():
    folders = sys.argv[1:] or sorted(os.path.dirname(p) for p in glob.glob(os.path.join(ROOT, "trips", "*", "trip.json")))
    bad = 0
    for f in folders:
        err, warn, st = check(f)
        name = os.path.basename(os.path.normpath(f))
        if st:
            print(f"■ {name}: {st['days']}일 · 시각 있는 시간표 {st['timed']}줄 · 장소 {st['places']}곳 · 후보 {st['cands']}곳 · 확인 필요 {st['chk']}개")
        else:
            print(f"■ {name}")
        for x in err:
            print("  ✗ " + x)
        for x in warn:
            print("  △ " + x)
        if not err:
            print("  ✓ 통과")
        bad += bool(err)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
