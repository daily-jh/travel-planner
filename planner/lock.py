"""사이트 공용 비밀번호 잠금.

배포 직전에 _site/ 의 모든 HTML 페이지를 AES-GCM 으로 암호화해서,
비밀번호를 넣어야만 내용이 보이게 만든다. (그냥 JS 로 비밀번호를 비교하는 방식이 아니라
페이지 내용 자체가 암호문이라, 주소를 알아도 비밀번호 없이는 읽을 수 없다.)

  SITE_PASSWORD   공용 비밀번호. GitHub 저장소 Settings → Secrets and variables → Actions 에
                  SITE_PASSWORD 라는 이름으로 넣는다. 배포에서 비어 있으면 중단한다.

- 비밀번호 → PBKDF2-SHA256(60만 번) → 256비트 키. 페이지마다 새 IV 로 AES-GCM.
- 브라우저는 비밀번호가 아니라 만든 키만 기기에 저장해서, 다음부터는 다시 묻지 않는다.
  비밀번호를 바꾸면 저장된 키가 안 맞으니 다시 묻는다.
- 일정이 그대로 들어 있는 파일(calendar.ics, remind-*.ics, schedule.csv, itinerary.xlsx, booklet.pdf)은
  암호화할 수 없어서(캘린더 앱·구글 시트가 직접 읽음) 비밀번호로 만든 긴 폴더 이름(d-xxxxxxxx) 아래로 옮긴다.
  이 주소는 잠긴 페이지 안에만 적혀 있어서, 비밀번호를 아는 사람만 알 수 있다.
- 잠금 해제: 아무 주소 뒤에 ?lock 을 붙이면 이 기기에 저장된 키를 지운다.
"""
import base64
import gzip
import hashlib
import hmac
import html
import json
import os
import re
import secrets
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "_site")
ITER = 600_000
SALT = hashlib.sha256(b"travel-planner/site-lock/v1").digest()[:16]
DATA_EXT = (".ics", ".csv", ".xlsx", ".pdf")


def derive(pw):
    return hashlib.pbkdf2_hmac("sha256", pw.encode("utf-8"), SALT, ITER, 32)


def encrypt(key, raw):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    iv = secrets.token_bytes(12)
    return iv, AESGCM(key).encrypt(iv, gzip.compress(raw, 9, mtime=0), None)


def hide_data_files(pw):
    """trips/<폴더>/ 의 일정 파일을 비밀번호에서 만든 폴더로 옮기고, 페이지 속 링크를 고친다."""
    moves = []  # (slug, 파일 이름, 새 폴더)
    tdir = os.path.join(OUT, "trips")
    for slug in sorted(os.listdir(tdir)) if os.path.isdir(tdir) else []:
        d = os.path.join(tdir, slug)
        if not os.path.isdir(d):
            continue
        sub = "d-" + hmac.new(pw.encode("utf-8"), ("files:" + slug).encode(), "sha256").hexdigest()[:20]
        names = [n for n in os.listdir(d) if n.endswith(DATA_EXT)]
        if not names:
            continue
        os.makedirs(os.path.join(d, sub), exist_ok=True)
        for n in names:
            os.replace(os.path.join(d, n), os.path.join(d, sub, n))
            moves.append((slug, n, sub))
    texts = []
    for base, _, files in os.walk(OUT):
        for n in files:
            if n.endswith((".html", ".js", ".webmanifest")):
                texts.append(os.path.join(base, n))
    for p in texts:
        s = open(p, encoding="utf-8").read()
        o = s
        here = os.path.relpath(os.path.dirname(p), OUT).replace(os.sep, "/")
        for slug, n, sub in moves:
            s = s.replace(f"trips/{slug}/{n}", f"trips/{slug}/{sub}/{n}")
            s = s.replace(f"trips%2F{slug}%2F{n}", f"trips%2F{slug}%2F{sub}%2F{n}")
            if here == f"trips/{slug}":
                s = re.sub(r'((?:href|src)=")' + re.escape(n) + '"', r"\g<1>" + sub + "/" + n + '"', s)
        if s != o:
            open(p, "w", encoding="utf-8").write(s)
    return moves


LOCK = """<!doctype html>
<html lang="ko">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="{up}assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="{up}assets/apple-touch-icon.png">
<link rel="manifest" href="{up}assets/manifest.webmanifest">
<meta name="theme-color" content="#24346b">
<meta name="apple-mobile-web-app-title" content="여행 플래너">
<meta property="og:type" content="website">
<meta property="og:title" content="여행 플래너">
<meta property="og:description" content="함께 가는 사람만 볼 수 있는 여행 일정이에요.">
<meta property="og:image" content="{site}assets/og-home.png">
<meta name="twitter:card" content="summary_large_image">
<title>여행 플래너</title>
<style>
:root{{--paper:#f5f6f9;--surface:#fff;--ink:#1b2238;--muted:#5b6278;--line:#dcdfe8;--pri:#24346b;--bad:#b3261e;color-scheme:light dark}}
@media (prefers-color-scheme:dark){{:root{{--paper:#0f121b;--surface:#171b27;--ink:#e9ebf2;--muted:#a2a8bb;--line:#2b3146;--pri:#9fb3ff;--bad:#ffb4ab}}}}
*{{box-sizing:border-box}}
html,body{{margin:0;min-height:100%;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Pretendard","Noto Sans KR",sans-serif;word-break:keep-all}}
main{{min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:24px 16px calc(24px + env(safe-area-inset-bottom,0px))}}
form{{width:100%;max-width:360px;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:28px 22px 22px;box-shadow:0 10px 30px rgba(20,30,60,.08);opacity:0;transform:translateY(8px);transition:opacity .35s ease,transform .35s ease}}
form.show{{opacity:1;transform:none}}
.mark{{width:44px;height:44px;border-radius:12px;display:block;margin-bottom:14px}}
h1{{font-size:20px;line-height:1.35;margin:0 0 6px;letter-spacing:-.01em}}
p{{margin:0 0 18px;color:var(--muted);font-size:14px;line-height:1.55}}
label.f{{display:block;font-size:13px;font-weight:600;margin-bottom:6px}}
input[type=password]{{width:100%;font:inherit;font-size:17px;padding:12px 14px;border-radius:10px;border:1px solid var(--line);background:var(--paper);color:var(--ink);outline:none}}
input[type=password]:focus{{border-color:var(--pri);box-shadow:0 0 0 3px color-mix(in srgb,var(--pri) 22%,transparent)}}
.err{{min-height:20px;margin:8px 0 4px;color:var(--bad);font-size:13px}}
.keep{{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--muted);margin:2px 0 16px}}
.keep input{{width:18px;height:18px;accent-color:var(--pri)}}
button{{width:100%;font:inherit;font-size:16px;font-weight:700;padding:13px;border:0;border-radius:10px;background:var(--pri);color:#fff;cursor:pointer}}
@media (prefers-color-scheme:dark){{button{{color:#0f121b}}}}
button:disabled{{opacity:.6}}
.shake{{animation:sh .35s}}
@keyframes sh{{20%,60%{{transform:translateX(-6px)}}40%,80%{{transform:translateX(6px)}}}}
@media (prefers-reduced-motion:reduce){{form{{transition:none}}.shake{{animation:none}}}}
.sr{{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}}
</style>
<main>
<form id="f" autocomplete="on">
<img class="mark" src="{up}assets/apple-touch-icon.png" alt="">
<h1>우리끼리 보는 여행 플래너</h1>
<p>함께 가는 사람만 볼 수 있어요. 공용 비밀번호를 넣어 주세요.</p>
<input class="sr" type="text" name="username" autocomplete="username" value="여행 플래너" tabindex="-1" aria-hidden="true">
<label class="f" for="pw">비밀번호</label>
<input id="pw" type="password" name="password" autocomplete="current-password" required enterkeyhint="go">
<div class="err" id="err" role="alert"></div>
<label class="keep"><input id="keep" type="checkbox" checked> 이 기기에서 기억하기</label>
<button id="go">열기</button>
</form>
</main>
<script type="application/json" id="tp-lock">{data}</script>
<script>
(function(){{
var K='tp-site-key',D=JSON.parse(document.getElementById('tp-lock').textContent),f=document.getElementById('f'),
  pw=document.getElementById('pw'),err=document.getElementById('err'),go=document.getElementById('go');
function b(s){{var x=atob(s),u=new Uint8Array(x.length);for(var i=0;i<x.length;i++)u[i]=x.charCodeAt(i);return u}}
function e(u){{var s='';for(var i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return btoa(s)}}
function get(){{try{{return localStorage.getItem(K)||sessionStorage.getItem(K)}}catch(_){{return null}}}}
function put(k,keep){{try{{(keep?localStorage:sessionStorage).setItem(K,k);if(!keep)localStorage.removeItem(K)}}catch(_){{}}}}
function drop(){{try{{localStorage.removeItem(K);sessionStorage.removeItem(K)}}catch(_){{}}}}
function show(){{f.classList.add('show');setTimeout(function(){{pw.focus()}},60)}}
function open_(raw){{
  return crypto.subtle.importKey('raw',b(raw),'AES-GCM',false,['decrypt'])
    .then(function(k){{return crypto.subtle.decrypt({{name:'AES-GCM',iv:b(D.iv)}},k,b(D.ct))}})
    .then(function(buf){{return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text()}})
    ;
}}
function write(h){{document.open();document.write(h);document.close()}}
if(!window.crypto||!crypto.subtle){{err.textContent='이 브라우저에서는 열 수 없어요. 사파리나 크롬으로 열어 주세요.';show();return}}
if(/[?&]lock(=|&|$)/.test(location.search)){{drop();history.replaceState(null,'',location.pathname+location.hash)}}
var saved=get();
if(saved)open_(saved).then(write,function(){{drop();show()}});else show();
f.addEventListener('submit',function(ev){{
  ev.preventDefault();var v=pw.value.trim();if(!v)return;go.disabled=true;go.textContent='여는 중…';err.textContent='';
  crypto.subtle.importKey('raw',new TextEncoder().encode(v),'PBKDF2',false,['deriveBits'])
    .then(function(k){{return crypto.subtle.deriveBits({{name:'PBKDF2',hash:'SHA-256',salt:b(D.salt),iterations:D.it}},k,256)}})
    .then(function(bits){{var raw=e(new Uint8Array(bits));return open_(raw).then(function(h){{put(raw,document.getElementById('keep').checked);write(h)}})}})
    .catch(function(){{go.disabled=false;go.textContent='열기';err.textContent='비밀번호가 맞지 않아요.';pw.select();
      f.classList.remove('shake');void f.offsetWidth;f.classList.add('shake')}});
}});
}})();
</script>
"""


def lock_pages(key, site):
    n = 0
    for base, _, files in os.walk(OUT):
        for name in files:
            if not name.endswith(".html"):
                continue
            p = os.path.join(base, name)
            rel = os.path.relpath(p, OUT).replace(os.sep, "/")
            up = "../" * rel.count("/")
            iv, ct = encrypt(key, open(p, "rb").read())
            data = json.dumps({"v": 1, "it": ITER, "salt": base64.b64encode(SALT).decode(),
                               "iv": base64.b64encode(iv).decode(), "ct": base64.b64encode(ct).decode()})
            open(p, "w", encoding="utf-8").write(LOCK.format(up=up, site=html.escape(site), data=data))
            n += 1
    return n


def main():
    pw = os.environ.get("SITE_PASSWORD", "").strip()  # 시크릿에 붙여 넣다 따라온 공백·줄바꿈은 뺀다
    if not pw and os.environ.get("REQUIRE_SITE_PASSWORD") == "1":
        sys.exit("lock: 배포하려면 SITE_PASSWORD가 필요합니다.")
    if not pw:
        print("lock: SITE_PASSWORD 가 없어서 잠그지 않아요 (사이트가 누구에게나 열려 있어요).")
        return
    if len(pw) < 6:
        sys.exit("lock: 비밀번호는 6자 이상으로 정해 주세요.")
    try:
        site = json.load(open(os.path.join(ROOT, "planner", "site.json"), encoding="utf-8")).get("base_url", "")
    except Exception:
        site = ""
    if site and not site.endswith("/"):
        site += "/"
    moves = hide_data_files(pw)
    n = lock_pages(derive(pw), site)
    print(f"lock: 페이지 {n}개를 잠그고, 일정 파일 {len(moves)}개를 비밀 폴더로 옮겼어요.")


if __name__ == "__main__":
    main()
