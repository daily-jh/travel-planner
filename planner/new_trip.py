"""새 여행의 뼈대 trip.json 을 만든다. 내용은 이 뼈대를 채워서 완성한다.

  python planner/new_trip.py --slug 2027-10-osaka --title "오사카, *가을* 먹방" --short 오사카 \
      --start 2027-10-02 --end 2027-10-05 --city 오사카 --theme temple --travelers 지훈,지윤

- 날짜마다 days[] 칸(6칸 간단 일정, 동선, 시간표, 장소)을 만들고, 일정표·비용표의 날짜 줄도 미리 채운다.
- 채워야 할 곳은 "{채우기}", 아직 모르는 정보는 "{확인 필요}"(사이트에서 배지로 보임)로 둔다.
- 다 채운 뒤 python planner/check_trip.py trips/<slug> 로 점검한다. {채우기}가 남아 있으면 실패한다.
"""
import argparse
import datetime as dt
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WD = "월화수목금토일"
SLOTS = ["아침", "오전", "점심", "오후", "저녁", "밤"]
DAY_COLORS = ["ume", "hakata", "lantern", "tide", "sea", "gold", "plum", "indigo"]
FILL = "{채우기}"

# 도시 이름으로 바로 채울 수 있는 기본값. 없는 도시는 {채우기}로 남기고 직접 찾아 넣는다.
CITIES = {
    "후쿠오카": (33.5902, 130.4207, "일본", "Asia/Tokyo", "JPY", "ja"),
    "오사카": (34.6937, 135.5023, "일본", "Asia/Tokyo", "JPY", "ja"),
    "교토": (35.0116, 135.7681, "일본", "Asia/Tokyo", "JPY", "ja"),
    "도쿄": (35.6812, 139.7671, "일본", "Asia/Tokyo", "JPY", "ja"),
    "삿포로": (43.0618, 141.3545, "일본", "Asia/Tokyo", "JPY", "ja"),
    "오키나와": (26.2124, 127.6809, "일본", "Asia/Tokyo", "JPY", "ja"),
    "나고야": (35.1815, 136.9066, "일본", "Asia/Tokyo", "JPY", "ja"),
    "타이베이": (25.0330, 121.5654, "대만", "Asia/Taipei", "TWD", "zh-TW"),
    "홍콩": (22.3193, 114.1694, "홍콩", "Asia/Hong_Kong", "HKD", "zh-HK"),
    "상하이": (31.2304, 121.4737, "중국", "Asia/Shanghai", "CNY", "zh-CN"),
    "방콕": (13.7563, 100.5018, "태국", "Asia/Bangkok", "THB", "th"),
    "치앙마이": (18.7883, 98.9853, "태국", "Asia/Bangkok", "THB", "th"),
    "다낭": (16.0544, 108.2022, "베트남", "Asia/Ho_Chi_Minh", "VND", "vi"),
    "하노이": (21.0278, 105.8342, "베트남", "Asia/Ho_Chi_Minh", "VND", "vi"),
    "나트랑": (12.2388, 109.1967, "베트남", "Asia/Ho_Chi_Minh", "VND", "vi"),
    "싱가포르": (1.3521, 103.8198, "싱가포르", "Asia/Singapore", "SGD", "en"),
    "세부": (10.3157, 123.8854, "필리핀", "Asia/Manila", "PHP", "en"),
    "발리": (-8.4095, 115.1889, "인도네시아", "Asia/Makassar", "IDR", "id"),
    "괌": (13.4443, 144.7937, "미국", "Pacific/Guam", "USD", "en"),
    "파리": (48.8566, 2.3522, "프랑스", "Europe/Paris", "EUR", "fr"),
    "런던": (51.5074, -0.1278, "영국", "Europe/London", "GBP", "en"),
    "제주": (33.4996, 126.5312, "한국", "Asia/Seoul", "KRW", "ko"),
    "부산": (35.1796, 129.0756, "한국", "Asia/Seoul", "KRW", "ko"),
    "강릉": (37.7519, 128.8761, "한국", "Asia/Seoul", "KRW", "ko"),
    "경주": (35.8562, 129.2247, "한국", "Asia/Seoul", "KRW", "ko"),
    "서울": (37.5665, 126.9780, "한국", "Asia/Seoul", "KRW", "ko"),
    "인천": (37.4563, 126.7052, "한국", "Asia/Seoul", "KRW", "ko"),
    "서귀포": (33.2541, 126.5600, "한국", "Asia/Seoul", "KRW", "ko"),
    "속초": (38.2070, 128.5918, "한국", "Asia/Seoul", "KRW", "ko"),
    "양양": (38.0754, 128.6190, "한국", "Asia/Seoul", "KRW", "ko"),
    "춘천": (37.8813, 127.7298, "한국", "Asia/Seoul", "KRW", "ko"),
    "가평": (37.8315, 127.5105, "한국", "Asia/Seoul", "KRW", "ko"),
    "전주": (35.8242, 127.1480, "한국", "Asia/Seoul", "KRW", "ko"),
    "여수": (34.7604, 127.6622, "한국", "Asia/Seoul", "KRW", "ko"),
    "순천": (34.9506, 127.4872, "한국", "Asia/Seoul", "KRW", "ko"),
    "목포": (34.8118, 126.3922, "한국", "Asia/Seoul", "KRW", "ko"),
    "통영": (34.8544, 128.4331, "한국", "Asia/Seoul", "KRW", "ko"),
    "남해": (34.8376, 127.8924, "한국", "Asia/Seoul", "KRW", "ko"),
    "거제": (34.8806, 128.6211, "한국", "Asia/Seoul", "KRW", "ko"),
    "대구": (35.8714, 128.6014, "한국", "Asia/Seoul", "KRW", "ko"),
    "대전": (36.3504, 127.3845, "한국", "Asia/Seoul", "KRW", "ko"),
    "안동": (36.5684, 128.7294, "한국", "Asia/Seoul", "KRW", "ko"),
    "포항": (36.0190, 129.3435, "한국", "Asia/Seoul", "KRW", "ko"),
    "울릉도": (37.4844, 130.9057, "한국", "Asia/Seoul", "KRW", "ko"),
}
CURRENCY = {  # 코드: (기호, 이름, 100단위 원화 대략값 — 실제 값은 조사해서 바꾼다)
    "JPY": ("¥", "엔", 900), "TWD": ("NT$", "대만 달러", 4300), "HKD": ("HK$", "홍콩 달러", 17500),
    "CNY": ("¥", "위안", 19000), "THB": ("฿", "바트", 4000), "VND": ("₫", "동", 6),
    "SGD": ("S$", "싱가포르 달러", 105000), "PHP": ("₱", "페소", 2400), "IDR": ("Rp", "루피아", 9),
    "KRW": ("₩", "원", 100), "USD": ("$", "달러", 140000), "EUR": ("€", "유로", 150000), "GBP": ("£", "파운드", 178000),
}
LANG = {  # 코드: (speechSynthesis 언어, 이름, 아이콘, 택시 카드 문장)
    "ja": ("ja-JP", "일본어", "あ", "{stay}までお願いします"),
    "zh-TW": ("zh-TW", "중국어", "中", "請帶我到{stay}"),
    "zh-HK": ("zh-HK", "광둥어", "中", "唔該去{stay}"),
    "zh-CN": ("zh-CN", "중국어", "中", "请带我去{stay}"),
    "th": ("th-TH", "태국어", "ก", "ไป{stay} ครับ/ค่ะ"),
    "vi": ("vi-VN", "베트남어", "Ơ", "Cho tôi đến {stay}"),
    "id": ("id-ID", "인도네시아어", "A", "Tolong antar ke {stay}"),
    "fr": ("fr-FR", "프랑스어", "É", "{stay}, s'il vous plaît"),
    "en": ("en-US", "영어", "A", "To {stay}, please"),
}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--slug", required=True, help="폴더 이름: 연도-월-도시 (예: 2027-10-osaka)")
    ap.add_argument("--title", required=True, help="표지 제목. *별표* 사이는 강조색 (예: '오사카, *가을* 먹방')")
    ap.add_argument("--short", required=True, help="짧은 이름 (예: 오사카)")
    ap.add_argument("--start", required=True, help="첫날 YYYY-MM-DD")
    ap.add_argument("--end", required=True, help="마지막 날 YYYY-MM-DD")
    ap.add_argument("--city", required=True, help="중심 도시 (한국어). 아는 도시는 위치·시간대·통화가 자동으로 들어가요")
    ap.add_argument("--theme", default="hakata", help="hakata · ocean · forest · snow · citrus · temple")
    ap.add_argument("--travelers", default="지훈,지윤", help="쉼표로 구분한 이름 (전화번호는 넣지 않아요)")
    ap.add_argument("--force", action="store_true", help="이미 있으면 덮어쓰기")
    a = ap.parse_args()

    themes = json.load(open(os.path.join(ROOT, "planner", "themes.json"), encoding="utf-8"))
    if a.theme not in themes:
        sys.exit(f"테마는 {', '.join(themes)} 중 하나예요.")
    s, z = dt.date.fromisoformat(a.start), dt.date.fromisoformat(a.end)
    if z < s:
        sys.exit("마지막 날이 첫날보다 빨라요.")
    out = os.path.join(ROOT, "trips", a.slug)
    path = os.path.join(out, "trip.json")
    if os.path.exists(path) and not a.force:
        sys.exit(f"{path} 가 이미 있어요. 고치려면 파일을 직접 고치거나 --force.")

    lat, lon, country, tz, cur, lg = CITIES.get(a.city, (FILL, FILL, FILL, FILL, None, None))
    dates = [s + dt.timedelta(days=i) for i in range((z - s).days + 1)]
    md = lambda d: f"{d.month}/{d.day} {WD[d.weekday()]}"
    names = [x.strip() for x in a.travelers.split(",") if x.strip()]
    tones = ["pri", "acc", "pri", "acc"]

    def day(i, d):
        return {
            "date": d.isoformat(),
            "theme": FILL + " (권역 이름, 예: 난바·도톤보리)",
            "color": DAY_COLORS[i % len(DAY_COLORS)],
            "summary": FILL,
            "simple": [{"slot": k, "time": FILL, "text": FILL} for k in SLOTS],
            "route": {"mode": "transit", "stops": [{"label": FILL, "query": FILL}]},
            "blocks": [{"time": FILL, "type": "활동", "place": FILL, "what": FILL, "move": FILL, "note": ""}],
            "alternatives": [{"when": "비·강풍", "text": FILL}],
            "places": [{"name": FILL, "local": "", "query": FILL, "address": FILL, "hours": FILL,
                        "why": FILL, "tip": "", "cost": FILL}],
        }

    t = {
        "title": a.title, "short": a.short, "eyebrow": FILL + " (공항코드 · 현지 표기, 예: KIX · 大阪)",
        "theme": a.theme,
        "travelers": [{"name": n, "tone": tones[k % 4]} for k, n in enumerate(names)],
        "start": a.start, "end": a.end, "timezone": tz, "country": country,
        "intro": FILL,
        "facts": [["숙소", FILL], ["항공", FILL]],
        "links": [{"label": "숙소 위치", "query": FILL}],
        "stay": [["호텔", FILL], ["체크인", "{확인 필요}"], ["체크아웃", "{확인 필요}"]],
        "stay_query": FILL,
        "transport": [["가는 편", "{확인 필요}"], ["오는 편", "{확인 필요}"], ["공항→시내", FILL]],
        "pace": {"columns": ["날짜", "권역", "강도", "숙소 복귀"], "rows": [[md(d), FILL, FILL, FILL] for d in dates]},
        "reservations": {"required": [], "recommended": []}, "deadlines": [],
        "closures": [],
        "candidates": [],
        "budget": {"title": "1인 예상 식비·입장료", "unit": CURRENCY[cur][0] if cur else FILL, "note": FILL,
                   "rows": [[md(d), FILL, 0, 0, FILL] for d in dates] + [["여유분", "간식·음료·편의점", 0, 0, FILL]],
                   "total": ["합계", "식비·입장료", 0, 0, FILL], "footnote": FILL},
        "before": {"note": f"가격·영업시간은 {dt.date.today().isoformat()} 기준이에요. 출발 1~2주 전에 한 번 더 봐요.",
                   "lists": [["예약", []], ["전화·사이트 확인", []], ["꼭 챙길 것", []]]},
        "calendar_extra": [], "calendar_skip": {},
        "source": FILL,
        "days": [day(i, d) for i, d in enumerate(dates)],
        "geo": {"lat": lat, "lon": lon, "city": a.city},
        "local_tz_note": FILL + " (예: 한국과 시차 없음)",
        "phrases": [], "packing": [], "emergency": [], "flights": [],
    }
    if country == "한국":  # 국내 여행: 네이버 지도, 원화, 해외 전용 도구(환율·면세·회화·택시 카드·현지 시각)는 사이트가 숨긴다
        t.update({"domestic": True, "map": "naver", "eyebrow": FILL + " (지역 · 교통, 예: 강원 강릉 · KTX)",
                  "facts": [["숙소", FILL], ["이동", FILL + " (KTX·자가용·항공 등)"]],
                  "transport": [["가는 편", "{확인 필요}"], ["오는 편", "{확인 필요}"], ["현지 이동", FILL]],
                  "emergency": [["경찰", "112"], ["화재·구급", "119"], ["관광 안내 (1330)", "1330"]]})
        for d in t["days"]:
            d["theme"] = FILL + " (권역 이름, 예: 경포·안목)"
        for k in ("local_tz_note", "phrases", "flights"):
            t.pop(k, None)
    if cur and cur != "KRW":
        sym, nm, krw = CURRENCY[cur]
        t["currency"] = {"code": cur, "symbol": sym, "name": nm, "fallback_krw_per_100": krw}
        t["facts"].append(["환율", f"{sym}100 ≈ ₩{krw} {{확인 필요}}"])
    elif not cur:
        t["currency"] = {"code": FILL, "symbol": FILL, "name": FILL, "fallback_krw_per_100": 0}
    if lg and lg != "ko":
        code, nm, icon, taxi = LANG[lg]
        t["lang"] = {"code": code, "name": nm, "icon": icon, "taxi": taxi}
        t["stay_ja"] = FILL + " (숙소 이름 현지어 표기, 택시 카드에 써요)"
    elif not lg:
        t["lang"] = {"code": FILL, "name": FILL, "icon": FILL, "taxi": FILL}
        t["stay_ja"] = FILL

    os.makedirs(out, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(t, f, ensure_ascii=False, indent=1)
        f.write("\n")
    left = json.dumps(t, ensure_ascii=False).count(FILL)
    print(f"{path} 를 만들었어요. 채울 곳 {left}군데 ({FILL}). {len(dates)}일, 테마 {a.theme}.")
    if a.city not in CITIES:
        print(f"'{a.city}'는 기본값이 없어서 geo·timezone·country·currency·lang 도 직접 채워야 해요.")


if __name__ == "__main__":
    main()
