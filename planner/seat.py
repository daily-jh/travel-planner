"""내 좌석: 항공편마다 기종과 좌석번호를 넣으면 비행기 그림에서 일행 좌석 위치를 보여 준다.

build.py가 부른다. 표준 라이브러리만 쓴다. 화면 동작은 planner/seat.js.
좌석번호는 개인정보라 trip.json 에 쓰지 않는다: 각자 휴대폰(localStorage)에만 저장하고,
'일행과 공유' 링크·예약 메일 붙여넣기로 채운다. trip.json flights[] 에는 기종(aircraft)과
실제 배치를 볼 링크(seatmap_url)만 넣는다 (둘 다 선택).
"""
import build as B


def tiles(t):
    """(클래스, 팝업 id, 아이콘, 이름, 부제). 항공편이 있거나 해외여행이면 나온다."""
    if not t.get("flights") and B.domestic(t):
        return []
    return [("t-seat", "tool-seat", "✈", "내 좌석", '<small class="seat-mini">편명·좌석 넣으면 위치</small>')]


def sheets(t):
    if not tiles(t):
        return ""
    mail = ("예약·체크인 메일을 QR·바우처의 <button type=\"button\" class=\"linkbtn\" data-open=\"tool-qr\">예약 메일 붙여넣기</button>에 넣으면 좌석·기종도 같이 찾아 채워요. "
            if t.get("vouchers") else "")
    return B.sheet("tool-seat", "내 좌석", "항공편마다 기종과 좌석번호를 넣으면 비행기 안 위치가 보여요", f'''<div class="seat" aria-live="polite"></div>
<details class="seat-add"><summary>＋ 다른 항공편 추가</summary><form class="seat-addf"><input name="no" placeholder="편명 (예: KE787)" maxlength="8" required autocapitalize="characters"><input name="date" type="date" aria-label="날짜"><input name="route" placeholder="구간 (예: 인천 → 오사카)" maxlength="30"><button class="btn primary" type="submit">추가</button></form></details>
<p class="seat-note"><b>좌석번호는 이 휴대폰에만 저장돼요.</b> 일행 휴대폰엔 '일행과 공유' 링크로 보내요. {mail}그림은 기종별 보통 배치라 줄 번호·비상구는 항공사마다 조금 달라요. 정확한 건 항공사 앱 좌석 선택 화면이에요.</p>''')
