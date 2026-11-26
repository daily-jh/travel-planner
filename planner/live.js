// ================================================================ 현지 실전 기능 (planner/live.py 가 그린 화면을 움직인다)
// 여행 중 퀵 바·카운트다운, 건너뛰기·대안 교체, 주변 대안, QR·바우처 보관함, 식당 카드, 동전 털기, 오프라인 알림
// 모든 기록은 이 휴대폰(localStorage·IndexedDB)에만 저장된다. QR·바우처는 '일행과 공유' 링크에도 담지 않는다.
(function(){
  var cfgEl=document.getElementById('trip-cfg'); if(!cfgEl) return;
  var C=JSON.parse(cfgEl.textContent), slug=C.trip;
  var LS={get:function(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set:function(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
  var esc=function(x){ return String(x==null?'':x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]}); };
  var say=function(m){var t=document.querySelector('.toast'); if(!t) return; t.textContent=m; t.hidden=false; clearTimeout(say.t); say.t=setTimeout(function(){t.hidden=true},3200);};
  var q=new URLSearchParams(location.search).get('now');
  var localNow=function(){ return q?new Date(q):new Date(new Date().toLocaleString('en-US',{timeZone:C.timezone||'Asia/Tokyo'})); };
  var ymd=function(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  var tm=function(s){ var m=(s||'').match(/(\d{1,2}):(\d{2})/); return m?(+m[1])*60+(+m[2]):null; };
  var hm=function(m){ return (m>=60?Math.floor(m/60)+'시간 ':'')+(m%60)+'분'; };
  var clean=function(s){ return String(s||'').replace(/\{확인 필요\}/g,'').trim(); };
  var gmap=function(qq){ return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(qq); };
  function openSheet(id){ var d=document.getElementById(id); if(d&&d.showModal&&!d.open){ d.showModal(); document.body.classList.add('sheet-open'); } }

  // ------------------------------------------------ 여행 중 퀵 바 + 늦으면 안 되는 일정 카운트다운
  var quick=document.querySelector('.quick'), qb=quick&&quick.querySelector('.qbanner');
  function inTrip(){ var d=ymd(localNow()), s=new Date(C.start+'T00:00:00'); s.setDate(s.getDate()-1); return d>=ymd(s)&&d<=C.end; }
  function paintQuick(ev){
    if(!quick) return; quick.hidden=!inTrip(); if(quick.hidden) return;
    var go=document.querySelector('.t-go'), qg=quick.querySelector('.q-go'); if(go&&qg) qg.href=go.href;
    var d=ev&&ev.detail; if(!qb) return;
    if(!d||d.di<0){ qb.hidden=true; return; }
    var bl=C.days[d.di].blocks, mins=d.mins, best=null;
    bl.forEach(function(b,i){ if(d.skip&&d.skip(i)) return; var swapped=d.swap&&d.swap(i); if(swapped) return; // 바꾼 줄은 원래 가게의 마감·예약 시각을 쓰지 않는다
      var due=b.alert&&!swapped?tm(b.alert.by):(b.fl.indexOf('rsv')>=0?tm(b.time):null); if(due===null) return;
      var left=due-mins; if(left<=0||left>60) return;
      if(!best||left<best.left) best={left:left,b:b,i:i,label:b.alert&&!swapped?b.alert.by+' 전 도착':'예약 '+b.time.split(/[–-]/)[0]}; });
    (C.flights||[]).forEach(function(f){ if(f.date!==ymd(localNow())||f.dep_tz!==(C.timezone||'Asia/Tokyo')) return;
      var left=tm(f.dep)-120-mins; if(left>0&&left<=60&&(!best||left<best.left)) best={left:left,b:{place:f.airline+' '+f.no},i:-1,label:'공항 도착 (출발 2시간 전)'}; });
    if(!best){ qb.hidden=true; return; }
    var nm=(d.swap&&best.i>=0&&d.swap(best.i))||best.b.place;
    qb.innerHTML='<span class="qb-t">'+esc(best.label)+'</span><b>'+esc(nm)+'</b><em>'+hm(best.left)+' 남음</em>';
    qb.classList.toggle('urgent',best.left<=30); qb.hidden=false;
    if(best.i>=0){ qb.dataset.open='blk-'+(d.di+1)+'-'+(best.i+1); qb.setAttribute('role','button'); qb.tabIndex=0; }
  }
  document.addEventListener('tp-now',paintQuick); paintQuick();
  setTimeout(function(){ document.dispatchEvent(new Event('tp-plan')); },0); // 브리핑 카드를 한 번 더 그려 퀵 바·카운트다운을 채운다

  // ------------------------------------------------ 시간표: 건너뛰기 · 대안으로 바꾸기 ('다녀왔어요'가 완료)
  var PK='tp-plan-'+slug, PL=LS.get(PK,{s:{},w:{}}); PL.s=PL.s||{}; PL.w=PL.w||{};
  var swapFor=null; // 대안 목록에서 고르면 이 줄을 바꾼다
  function paintPlan(){
    document.querySelectorAll('tr[data-open^="blk-"]').forEach(function(tr){ var id=tr.dataset.open, w=PL.w[id];
      tr.classList.toggle('skipped',!!PL.s[id]); tr.classList.toggle('swapped',!!w);
      var pc=tr.querySelector('td.place'), s=pc&&pc.querySelector('.swap-to'); if(s) s.remove();
      if(pc&&w){ s=document.createElement('span'); s.className='swap-to'; s.textContent='→ '+w; pc.appendChild(s); } });
    document.querySelectorAll('.plan-ctl').forEach(function(x){ var id=x.dataset.plan, w=PL.w[id];
      x.querySelector('[data-pl="skip"]').setAttribute('aria-pressed',!!PL.s[id]);
      x.querySelector('[data-pl="skip"]').textContent=PL.s[id]?'건너뜀 ✓':'건너뛰기';
      x.querySelector('[data-pl="swap"]').textContent=w?'다른 대안 고르기':'대안으로 바꾸기';
      x.querySelector('.plan-st').innerHTML=w?'<b>'+esc(w)+'</b>(으)로 바꿨어요 <button type="button" data-pl="undo">원래대로</button>':(PL.s[id]?'남은 동선과 "다음" 카드에서 빠져요':''); });
  }
  function savePlan(){ LS.set(PK,PL); paintPlan(); document.dispatchEvent(new Event('tp-plan')); }
  window.TPPlan={get:function(id){ return PL.w[id]; }, set:function(id,w){ if(w) PL.w[id]=w; else delete PL.w[id]; delete PL.s[id]; savePlan(); }}; // together.js(함께 고르기)가 정한 곳을 시간표에 반영
  document.addEventListener('click',function(ev){ var b=ev.target.closest('[data-pl]'); if(!b) return; var id=b.closest('.plan-ctl').dataset.plan;
    if(b.dataset.pl==='skip'){ if(PL.s[id]) delete PL.s[id]; else PL.s[id]=1; savePlan(); }
    if(b.dataset.pl==='undo'){ delete PL.w[id]; savePlan(); }
    if(b.dataset.pl==='swap'){ swapFor=id; nearArea=b.dataset.area||''; nearRef=null; setNf(b.dataset.kind||'all'); var me=b.closest('dialog'); if(me&&me.open) me.close(); setTimeout(function(){ openSheet('tool-near'); renderNear(); },60); } });
  paintPlan();

  // ------------------------------------------------ 주변 대안: 미배치 후보 중 지금 열었을 만한 곳 (영업시간은 업종별 어림)
  // 내 위치를 켜면 페이지 안 구글 지도에 내 위치가 뜨고, 후보를 고르면 내 위치 → 그곳 걷는 길을 같은 지도에 보여 준다.
  // 위치는 이 휴대폰 안에서만 쓰고 저장·전송하지 않는다 (지도를 그릴 때 구글 지도에 좌표가 넘어가는 것만 예외)
  var nearUl=document.querySelector('ul.near'), nearWhere=document.querySelector('.near-where'), nearArea='', nearRef=null, nf='all', nowArea='', watch=null, nearPick=null;
  var AR=C.areas||{}, NAV=C.map==='naver', NAK='tp-narea-'+slug, NA=LS.get(NAK,{}); // 위치 모르는 후보: 여행자가 고른 동네 (이 휴대폰에만)
  var areaOf=function(x){ return x.a||NA[x.n]||''; };
  var nmapQ=function(qq){ return 'https://map.naver.com/p/search/'+encodeURIComponent(qq); };
  var mapQ=function(qq){ return NAV?nmapQ(qq):gmap(qq); };
  // 길찾기: 출발지를 비우면 지도 앱이 '내 위치'에서 시작한다
  var walkTo=function(qq){ return NAV?nmapQ(qq):'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(qq)+'&travelmode=walking'; };
  var ll=function(p){ return p[0].toFixed(5)+','+p[1].toFixed(5); };
  // 페이지 안 지도(구글, 키 없이 쓰는 embed 주소 — 일정 지도와 같은 방식)
  var embedMe=function(p){ return 'https://maps.google.com/maps?q='+ll(p)+'&z=16&hl=ko&output=embed'; };
  var embedRoute=function(p,qq){ return 'https://maps.google.com/maps?saddr='+ll(p)+'&daddr='+encodeURIComponent(qq)+'&dirflg=w&hl=ko&output=embed'; };
  var embedSearch=function(p,kw){ return 'https://maps.google.com/maps?q='+encodeURIComponent(kw)+'&ll='+ll(p)+'&sll='+ll(p)+'&z=16&hl=ko&output=embed'; };
  var gNear=function(p,kw){ return NAV?nmapQ(kw):'https://www.google.com/maps/search/'+encodeURIComponent(kw)+'/@'+ll(p)+',16z'; };
  function setNf(k){ nf=k; document.querySelectorAll('[data-nf]').forEach(function(x){x.setAttribute('aria-pressed',x.dataset.nf===k)}); }
  var kind=function(x){ var s=x.g+' '+x.c; if(/카페|커피|디저트|베이커리|도넛|아이스크림|제과/.test(x.c)||(/카페/.test(x.g)&&!/식당/.test(x.c))) return 'cafe';
    if(/관광|쇼핑/.test(x.g)||/잡화|상점|선물|약국|슈퍼|할인점|호텔|판매점/.test(x.c)) return 'shop'; return 'eat'; };
  function openState(o,m){ var p=(o||'').split('-'), a=tm(p[0]), z=tm(p[1]); if(a===null||z===null) return 'unk'; if(z<=a) z+=1440;
    var mm=m<a&&m+1440<z?m+1440:m; if(mm<a) return a-mm<=60?'soon':'closed'; if(mm>=z) return 'closed'; return z-mm<=45?'closing':'open'; }
  var km=function(a,b){ var R=6371,r=Math.PI/180,dl=(b[0]-a[0])*r,dn=(b[1]-a[1])*r,x=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dn/2)*Math.sin(dn/2); return 2*R*Math.asin(Math.sqrt(x)); };
  var ST={open:['open','영업 중일 듯'],closing:['closing','곧 닫을 듯'],soon:['soon','곧 열 듯'],closed:['closed','닫았을 듯'],unk:['unk','시간 모름']};
  // 지금 일정 줄의 권역: 여행 중엔 위치를 안 켜도 '지금 있는 동네' 기준으로 가까운 순
  document.addEventListener('tp-now',function(ev){ var d=ev.detail||{}; nowArea='';
    if(d.di>=0&&C.days[d.di]){ var bl=C.days[d.di].blocks, i=d.ci>=0?d.ci:d.nx; for(var k=i;k>=0&&k<bl.length;k--){ if(bl[k]&&bl[k].area&&AR[bl[k].area]){ nowArea=bl[k].area; break; } } } });
  var nmap=document.querySelector('.near-map'), nframe=nmap&&nmap.querySelector('iframe'), ncap=nmap&&nmap.querySelector('.nm-cap'), nopen=nmap&&nmap.querySelector('.nm-open');
  function paintMap(){ if(!nmap) return; nmap.hidden=!nearRef; if(!nearRef) return;
    var src, cap, href;
    if(nearPick&&nearPick.kw){ src=embedSearch(nearRef,nearPick.kw); cap='내 위치 근처 '+nearPick.label; href=gNear(nearRef,nearPick.kw); }
    else if(nearPick){ src=embedRoute(nearRef,nearPick.q); cap='내 위치 → '+nearPick.n+' 걷는 길'; href=walkTo(nearPick.q); }
    else { src=embedMe(nearRef); cap='내 위치'+(nearRef.acc?' (오차 약 '+Math.round(nearRef.acc)+'m)':''); href=NAV?'https://map.naver.com/p/search/'+ll(nearRef):'https://www.google.com/maps/search/?api=1&query='+ll(nearRef); }
    if(nframe&&nframe.dataset.cur!==src){ nframe.dataset.cur=src; nframe.src=src; }
    ncap.textContent=cap; nopen.href=href;
    document.querySelectorAll('[data-nkw]').forEach(function(b){ b.setAttribute('aria-pressed',!!(nearPick&&nearPick.kw===b.dataset.nkw)); }); }
  function renderNear(){
    if(!nearUl) return; var n=localNow(), m=n.getHours()*60+n.getMinutes();
    var area=nearArea||(!swapFor&&nowArea)||'';
    var ref=nearRef||(area&&AR[area])||null;
    nearWhere.textContent=(nearRef?'내 위치 기준':area?area+(nearArea?'':' (지금 일정)')+' 기준':'권역별')+' · 지금 '+String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')+(swapFor?' · 고른 곳으로 일정 한 줄을 바꿔요':'');
    var list=(C.near||[]).filter(function(x){ return nf==='all'||kind(x)===nf; }).map(function(x){
      var st=openState(x.o,m), xa=areaOf(x), d=ref&&AR[xa]?km(ref,AR[xa]):null;
      return {x:x,st:st,d:d,score:(st==='open'||st==='closing'?0:st==='soon'?1:2)*1000+(d===null?500:d)}; });
    list.sort(function(a,b){ return a.score-b.score; });
    nearUl.innerHTML=list.slice(0,60).map(function(r,i){ var x=r.x, s=ST[r.st], on=nearPick&&!nearPick.kw&&nearPick.n===x.n;
      return '<li class="'+s[0]+(on?' on':'')+'"><div class="nr-b"><b>'+esc(x.n)+'</b><small>'+esc([x.c,x.r&&'★ '+x.r,x.m].filter(Boolean).join(' · '))+'</small>'
        +'<span class="nr-m"><i class="nst '+s[0]+'">'+s[1]+'</i>'+esc(x.o.replace('-','~'))+' 어림'+(areaOf(x)?' · '+esc(areaOf(x))+(x.a?'':' <button type="button" class="nr-ar" data-nar="'+i+'">바꾸기</button>')+(r.d===null?'':(r.d<0.3?(nearRef?' · 약 300m 안':' · 같은 동네'):' · 약 '+(r.d<1?Math.round(r.d*10)*100+'m':r.d.toFixed(1)+'km')+(nearRef&&r.d<3?' · 걸어서 '+Math.max(5,Math.round(r.d*1.3/4.5*60/5)*5)+'분쯤':''))):' · <label class="nr-ar">동네 정하기 <select data-nsel="'+i+'"><option value="">모름</option>'+Object.keys(AR).map(function(k){return '<option>'+esc(k)+'</option>'}).join('')+'</select></label>')+'</span></div>'
        +'<div class="nr-a">'+(nearRef?'<button type="button" class="btn'+(on?' primary':'')+'" data-nshow="'+i+'">지도에서 보기</button>':'')+'<a class="btn" href="'+walkTo(x.q)+'" target="_blank" rel="noopener">길찾기</a>'+(swapFor?'<button type="button" class="btn primary" data-swapto="'+esc(x.n)+'">이걸로 바꾸기</button>':'')+'</div></li>'; }).join('')
      ||'<li class="empty">고른 종류의 후보가 없어요.</li>';
    nearUl._list=list; paintMap();
  }
  function gotPos(p){ var first=!nearRef; nearRef=[p.coords.latitude,p.coords.longitude]; nearRef.acc=p.coords.accuracy; nearRef.at=Date.now(); renderNear(); if(first) say('내 위치에서 가까운 순이에요.'); }
  function stopWatch(){ if(watch!==null&&navigator.geolocation){ navigator.geolocation.clearWatch(watch); } watch=null; }
  document.addEventListener('click',function(ev){
    var o=ev.target.closest('[data-open="tool-near"]'); if(o&&!o.closest('.plan-ctl')){ swapFor=null; nearArea=o.dataset.area||''; if(nearRef&&Date.now()-nearRef.at>600000){ nearRef=null; nearPick=null; } if(o.dataset.kind) setNf(o.dataset.kind); setTimeout(renderNear,0); }
    var f=ev.target.closest('[data-nf]'); if(f){ setNf(f.dataset.nf); renderNear(); }
    var na=ev.target.closest('[data-nar]'); if(na&&nearUl._list){ delete NA[nearUl._list[+na.dataset.nar].x.n]; LS.set(NAK,NA); renderNear(); return; }
    var sh=ev.target.closest('[data-nshow]'); if(sh&&nearUl._list){ var x=nearUl._list[+sh.dataset.nshow].x; nearPick={n:x.n,q:x.q}; renderNear(); if(nmap) nmap.scrollIntoView({behavior:'smooth',block:'nearest'}); }
    var kw=ev.target.closest('[data-nkw]'); if(kw&&nearRef){ nearPick=nearPick&&nearPick.kw===kw.dataset.nkw?null:{kw:kw.dataset.nkw,label:kw.textContent}; paintMap(); }
    if(ev.target.closest('.nm-me')){ nearPick=null; renderNear(); }
    if(ev.target.closest('.near-gps')){ if(!navigator.geolocation){ say('이 브라우저는 위치를 쓸 수 없어요.'); return; }
      say('위치를 찾는 중이에요…'); stopWatch();
      navigator.geolocation.getCurrentPosition(function(p){ gotPos(p);
          // 창을 연 동안엔 걸어가면서 위치를 새로 받는다 (닫으면 멈춤)
          watch=navigator.geolocation.watchPosition(function(q){ if(!nearRef||km(nearRef,[q.coords.latitude,q.coords.longitude])>0.05) gotPos(q); },function(){},{enableHighAccuracy:true,maximumAge:30000}); },
        function(){ say('위치를 못 가져왔어요. 설정에서 이 사이트 위치 허용을 켜 주세요. 지금은 '+(nowArea?nowArea+' 기준':'권역 기준')+'으로 보여 줄게요.'); },{enableHighAccuracy:true,timeout:10000,maximumAge:120000}); }
    var s=ev.target.closest('[data-swapto]'); if(s&&swapFor){ PL.w[swapFor]=s.dataset.swapto; delete PL.s[swapFor]; var id=swapFor; swapFor=null; savePlan();
      var d=document.getElementById('tool-near'); if(d&&d.open) d.close(); say(s.dataset.swapto+'(으)로 바꿨어요.'); setTimeout(function(){ openSheet(id); },300); }
  });
  document.addEventListener('change',function(ev){ var se=ev.target.closest('[data-nsel]'); if(!se||!nearUl._list) return; var x=nearUl._list[+se.dataset.nsel].x; if(se.value) NA[x.n]=se.value; else delete NA[x.n]; LS.set(NAK,NA); renderNear(); say(se.value?x.n+' → '+se.value+'(으)로 기억할게요.':'지웠어요.'); });
  var nd=document.getElementById('tool-near'); if(nd) nd.addEventListener('close',function(){ swapFor=null; stopWatch(); });
  renderNear();

  // ------------------------------------------------ QR·바우처 보관함 (사진·PDF는 IndexedDB, 번호·메모는 localStorage — 둘 다 이 휴대폰에만)
  // 한 칸에 여러 장(예: 두 사람 탑승권), PDF, QR만 잘라 크게 보기, 화면 꺼짐 방지, 번호 복사, 다 쓴 칸 접기, 파일로 옮기기
  var vUl=document.querySelector('ul.vault');
  if(vUl){
    var VK='tp-vault-'+slug, V=LS.get(VK,{t:{},mine:[],used:{}}); V.t=V.t||{}; V.mine=V.mine||[]; V.used=V.used||{};
    var pics={}, idb=null; // pics[칸 id] = [기록…] (넣은 순서)
    var db=function(){ return idb||(idb=new Promise(function(ok,no){ if(!window.indexedDB) return no(); var r=indexedDB.open('tp-vault',1);
      r.onupgradeneeded=function(){ r.result.createObjectStore('v',{keyPath:'id'}); }; r.onsuccess=function(){ok(r.result)}; r.onerror=no; })); };
    var tx=function(mode,fn){ return db().then(function(d){ return new Promise(function(ok,no){ var t=d.transaction('v',mode), r=fn(t.objectStore('v')); t.oncomplete=function(){ok(r&&r.result)}; t.onerror=t.onabort=no; }); }); };
    var slots=function(){ return (C.vouchers||[]).concat(V.mine.map(function(x){return {id:x.id,label:x.label,hint:'직접 추가한 칸',when:x.when||'',mine:1}})); };
    var isPdf=function(r){ return /pdf/i.test((r.blob&&r.blob.type)||'')||/\.pdf$/i.test(r.name||''); };
    var addUrl=function(r){ r.url=URL.createObjectURL(r.blob); if(r.crop) r.curl=URL.createObjectURL(r.crop); return r; };
    var drop=function(r){ URL.revokeObjectURL(r.url); if(r.curl) URL.revokeObjectURL(r.curl); };
    // QR 찾기: 캡처 속 작은 QR만 잘라 화면 가득 보여 준다. 해독 라이브러리(jsQR)는 처음 쓸 때 한 번만 받는다 (그 뒤엔 오프라인 저장본)
    var jsqr=null;
    function loadQR(){ return jsqr||(jsqr=new Promise(function(ok,no){ if(window.jsQR) return ok(window.jsQR); var s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'; s.onload=function(){ window.jsQR?ok(window.jsQR):no(); }; s.onerror=function(){ jsqr=null; no(); }; document.head.appendChild(s); })); }
    function findQR(blob){
      if(!/^image\//.test(blob.type||'')) return Promise.resolve(null);
      return Promise.all([loadQR(),new Promise(function(ok,no){ var im=new Image(); im.onload=function(){ok(im)}; im.onerror=no; im.src=URL.createObjectURL(blob); })]).then(function(a){
        var J=a[0], im=a[1], W=im.naturalWidth, H=im.naturalHeight, k=Math.min(1,1400/Math.max(W,H)); // 큰 사진은 줄여서 찾고, 자르는 건 원본에서
        var c=document.createElement('canvas'); c.width=Math.round(W*k); c.height=Math.round(H*k); var g=c.getContext('2d',{willReadFrequently:true}); g.drawImage(im,0,0,c.width,c.height);
        var res=J(g.getImageData(0,0,c.width,c.height).data,c.width,c.height,{inversionAttempts:'attemptBoth'}); URL.revokeObjectURL(im.src); if(!res) return null;
        var L=res.location, xs=[L.topLeftCorner.x,L.topRightCorner.x,L.bottomLeftCorner.x,L.bottomRightCorner.x], ys=[L.topLeftCorner.y,L.topRightCorner.y,L.bottomLeftCorner.y,L.bottomRightCorner.y];
        var x0=Math.min.apply(0,xs)/k, x1=Math.max.apply(0,xs)/k, y0=Math.min.apply(0,ys)/k, y1=Math.max.apply(0,ys)/k, pad=(x1-x0)*0.12;
        x0=Math.max(0,x0-pad); y0=Math.max(0,y0-pad); x1=Math.min(W,x1+pad); y1=Math.min(H,y1+pad);
        if(x1-x0>W*0.8&&y1-y0>H*0.8) return null; // 이미 QR만 찍은 사진
        var o=document.createElement('canvas'); o.width=Math.round(x1-x0); o.height=Math.round(y1-y0); var og=o.getContext('2d'); og.imageSmoothingEnabled=false; og.fillStyle='#fff'; og.fillRect(0,0,o.width,o.height);
        og.drawImage(im,x0,y0,x1-x0,y1-y0,0,0,o.width,o.height);
        return new Promise(function(ok){ o.toBlob(function(b){ ok(b); },'image/png'); }); }).catch(function(){ return null; }); }
    function sorted(){ var today=ymd(localNow());
      var rank=function(s){ return V.used[s.id]?3:s.when===today?0:(!s.when||s.when>today)?1:2; };
      return slots().map(function(s,i){return {s:s,i:i}}).sort(function(a,b){ return rank(a.s)-rank(b.s)||a.i-b.i; }).map(function(x){return x.s}); }
    function paintVault(){ var today=ymd(localNow()), n=0, used=0;
      vUl.innerHTML=sorted().map(function(s){ var ps=pics[s.id]||[], tx2=V.t[s.id]||'', u=!!V.used[s.id], past=s.when&&s.when<today; if(ps.length||tx2) n++; if(u) used++;
        var thumbs=ps.map(function(p,k){ return isPdf(p)?'<button type="button" class="v-pdf" data-vshow="'+k+'" aria-label="'+esc(s.label)+' PDF 열기"><b>PDF</b><span>'+esc(p.name||'파일')+'</span></button>'
          :'<button type="button" class="v-pic" data-vshow="'+k+'" aria-label="'+esc(s.label)+' 크게 보기"><img src="'+(p.curl||p.url)+'" alt="">'+(p.crop?'<i class="v-qr">QR</i>':'')+'</button>'; }).join('');
        return '<li data-v="'+esc(s.id)+'" class="'+(s.when===today&&!u?'today':'')+(u?' used':'')+(past&&!u?' past':'')+'"><div class="v-h"><b>'+esc(s.label)+'</b>'
          +(s.when?'<small>'+(s.when===today?'오늘 · ':'')+esc(s.when.slice(5).replace('-','/'))+'</small>':'')+(u?'<small class="v-done">다 썼어요</small>':'')+'</div>'
          +(u?'':(thumbs?'<div class="v-pics'+(ps.length>1?' many':'')+'">'+thumbs+'</div>':'')
          +'<div class="v-numrow"><input class="v-num" value="'+esc(tx2)+'" placeholder="'+esc(s.hint||'번호·메모')+' (번호·메모)" maxlength="80" autocomplete="off">'+(tx2?'<button type="button" class="btn v-copy" data-vcopy>복사</button>':'')+'</div>')
          +'<div class="v-a">'+(u?'':'<label class="btn">'+(ps.length?'한 장 더':'사진·PDF 넣기')+'<input type="file" accept="image/*,application/pdf" multiple hidden></label>')
          +(ps.length||tx2?'<button type="button" class="btn" data-vused>'+(u?'다시 펼치기':'다 썼어요')+'</button>':'')
          +(!u&&(ps.length||tx2)?'<button type="button" class="btn" data-vdel>비우기</button>':'')+(s.mine?'<button type="button" class="btn" data-vrm>칸 지우기</button>':'')+'</div></li>'; }).join('');
      var mini=document.querySelector('.qr-mini'); if(mini) mini.textContent=n?n+'칸 채움 · 이 휴대폰에만':'이 휴대폰에만 저장';
      var qq=document.querySelector('.q-qr'); if(qq){ var td=slots().filter(function(s){ return s.when===today&&!V.used[s.id]&&(pics[s.id]||[]).length; }).length; qq.dataset.n=td||''; }
    }
    function loadPics(){ return tx('readonly',function(s){return s.getAll()}).then(function(rows){ Object.keys(pics).forEach(function(k){ pics[k].forEach(drop); }); pics={};
      (rows||[]).filter(function(r){return r.trip===slug}).sort(function(a,b){return a.t-b.t}).forEach(function(r){ (pics[r.slot]=pics[r.slot]||[]).push(addUrl(r)); }); paintVault(); }); }
    loadPics().catch(function(){});
    vUl.addEventListener('input',function(ev){ var i=ev.target.closest('.v-num'); if(!i) return; var id=i.closest('li').dataset.v; if(i.value) V.t[id]=i.value.slice(0,80); else delete V.t[id]; LS.set(VK,V); });
    vUl.addEventListener('change',function(ev){ var i=ev.target.closest('.v-num'); if(i){ paintVault(); return; }
      var inp=ev.target.closest('input[type=file]'); if(!inp||!inp.files.length) return; var id=inp.closest('li').dataset.v, fs=[].slice.call(inp.files,0,6); inp.value='';
      say('넣는 중이에요…');
      // QR이 깨지지 않게 줄이지 않고 원본을 그대로 넣는다 (캡처 한 장은 보통 1MB 안팎). 첫 장은 예전과 같은 키를 쓴다
      Promise.all(fs.map(function(f,k){ return findQR(f).then(function(crop){ var first=!(pics[id]||[]).length&&k===0;
        return {id:slug+':'+id+(first?'':':'+Date.now().toString(36)+k),trip:slug,slot:id,blob:f,name:(f.name||'').slice(0,60),crop:crop||undefined,t:Date.now()+k}; }); }))
        .then(function(recs){ return tx('readwrite',function(s){ recs.forEach(function(r){ s.put(r); }); }).then(function(){ return recs; }); })
        .then(function(recs){ return loadPics().then(function(){ var q=recs.filter(function(r){return r.crop}).length;
          say('이 휴대폰에 저장했어요.'+(q?' QR을 찾아 크게 보이게 잘라 뒀어요.':'')); }); },function(){ say('저장하지 못했어요. 저장 공간을 확인해 주세요.'); }); });
    vUl.addEventListener('click',function(ev){ var li=ev.target.closest('li[data-v]'); if(!li) return; var id=li.dataset.v;
      var sh=ev.target.closest('[data-vshow]'); if(sh){ showV(id,+sh.dataset.vshow); return; }
      if(ev.target.closest('[data-vcopy]')){ var v=V.t[id]||''; (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(v):Promise.reject()).then(function(){ say('복사했어요: '+v); },function(){ var i=li.querySelector('.v-num'); i.select(); say('길게 눌러 복사해 주세요.'); }); return; }
      if(ev.target.closest('[data-vused]')){ if(V.used[id]) delete V.used[id]; else V.used[id]=1; LS.set(VK,V); paintVault(); return; }
      if(ev.target.closest('[data-vdel]')){ if(!confirmDel()) return; delete V.t[id]; delete V.used[id]; LS.set(VK,V); var gone=pics[id]||[]; delete pics[id];
        tx('readwrite',function(s){ gone.forEach(function(r){ s.delete(r.id); }); s.delete(slug+':'+id); }).catch(function(){}); gone.forEach(drop); paintVault(); }
      if(ev.target.closest('[data-vrm]')){ if(!confirmDel()) return; V.mine=V.mine.filter(function(x){return x.id!==id}); delete V.t[id]; delete V.used[id]; LS.set(VK,V); var g2=pics[id]||[]; delete pics[id];
        tx('readwrite',function(s){ g2.forEach(function(r){ s.delete(r.id); }); }).catch(function(){}); g2.forEach(drop); paintVault(); } });
    // 비우기는 한 번 더 눌러야 지워진다 (실수 방지, 알림창은 쓰지 않음)
    var armed=0; function confirmDel(){ if(Date.now()-armed<3000){ armed=0; return true; } armed=Date.now(); say('한 번 더 누르면 지워져요.'); return false; }
    var vf=document.querySelector('.vault-add'); if(vf) vf.addEventListener('submit',function(ev){ ev.preventDefault(); var l=String(new FormData(vf).get('label')||'').trim(); if(!l) return;
      V.mine.push({id:'m'+Date.now().toString(36),label:l.slice(0,30)}); LS.set(VK,V); vf.reset(); paintVault(); });

    // 예약 메일 붙여넣기: 날짜·시각·예약번호·이름을 글에서 찾아 칸을 만든다 (이미 있는 칸과 겹치면 그 칸에 번호를 넣는다)
    var MON={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
    var p2=function(n){ return String(n).padStart(2,'0'); };
    function mailParse(tx){ var Y=+C.start.slice(0,4), ds=[], m, re;
      var add=function(y,mo,d,at){ y=+y||Y; mo=+mo; d=+d; if(mo>=1&&mo<=12&&d>=1&&d<=31) ds.push({v:y+'-'+p2(mo)+'-'+p2(d),at:at}); };
      re=/(20\d\d)\s*[.\-\/년]\s*(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})/g; while((m=re.exec(tx))) add(m[1],m[2],m[3],m.index);
      re=/(20\d\d)年\s*(\d{1,2})月\s*(\d{1,2})日/g; while((m=re.exec(tx))) add(m[1],m[2],m[3],m.index);
      re=/(?:^|[^\d년.])(\d{1,2})\s*월\s*(\d{1,2})\s*일/g; while((m=re.exec(tx))) add(0,m[1],m[2],m.index);
      re=/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s+(20\d\d)/gi; while((m=re.exec(tx))) add(m[3],MON[m[2].toLowerCase()],m[1],m.index);
      re=/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(20\d\d)/gi; while((m=re.exec(tx))) add(m[3],MON[m[1].toLowerCase()],m[2],m.index);
      var s0=new Date(C.start+'T00:00:00'); s0.setDate(s0.getDate()-1); var lo=ymd(s0);
      ds.sort(function(a,b){return a.at-b.at}); var dd=ds.filter(function(d){return d.v>=lo&&d.v<=C.end})[0]||ds[0];
      var tm2=(dd?tx.slice(dd.at):tx).match(/(?:^|[^\d])([0-2]?\d):([0-5]\d)/);
      var num=tx.match(/(?:예약\s*번호|확인\s*번호|예약\s*코드|바우처\s*번호|주문\s*번호|booking\s*(?:id|no\.?|number|reference|ref\.?|code)|confirmation\s*(?:no\.?|number|code)|reservation\s*(?:id|no\.?|number|code)|order\s*(?:id|no\.?|number)|itinerary\s*(?:no\.?|number)|PNR|予約番号|確認番号)\s*[:：#.]?\s*([A-Z0-9][A-Z0-9\-]{3,})/i);
      var fl=tx.match(/\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{3,4})\b/);
      var ttl=tx.match(/(?:상품\s*명|상품|투어\s*명|activity|product|hotel\s*name|property|숙소\s*명|호텔\s*명|호텔|매장|가게|레스토랑|restaurant|施設名|店舗名|プラン名)\s*[:：]\s*([^\n]{2,40})/i);
      var first=tx.split(/\n/).map(function(l){return l.trim()}).filter(function(l){ return l.length>=3&&l.length<=40&&!/^(from|to|보낸|받는|date|subject|제목)\b/i.test(l); })[0]||'';
      var label=(ttl?ttl[1]:first).replace(/\s+/g,' ').trim().slice(0,30);
      // 이미 있는 칸: 편명이나 이름이 겹치면 그 칸
      var lb=label.replace(/\s/g,''), geo=Object.keys(AR).concat([(C.geo||{}).city||'','후쿠오카','호텔','공항']);
      var hit=slots().map(function(s){ var L=s.label.replace(/\s/g,''); if(fl&&L.indexOf(fl[1]+fl[2])>=0) return {s:s,n:9};
        return {s:s,n:lb?s.label.split(/[^0-9A-Za-z가-힣ぁ-んァ-ン一-龥]+/).filter(function(w){ w=w.replace(/예약|바우처|탑승권|확인|화면/g,''); return w.length>=3&&!geo.some(function(g){ return g&&(g.indexOf(w)>=0||w.indexOf(g)>=0); })&&lb.indexOf(w)>=0; }).length:0}; })
        .filter(function(x){return x.n}).sort(function(a,b){return b.n-a.n}).map(function(x){return x.s})[0];
      var memo=[num?num[1]:'',tm2?p2(tm2[1])+':'+tm2[2]:''].filter(Boolean).join(' · ');
      return {when:dd?dd.v:'',label:hit?hit.label:label,num:memo,hit:hit,flight:fl?fl[1]+fl[2]:''}; }
    var vmIn=document.querySelector('.vm-in'), vmOut=document.querySelector('.vm-out'), vmRes=null;
    var vmGo=document.querySelector('.vm-go'); if(vmGo) vmGo.addEventListener('click',function(){ var tx=(vmIn.value||'').trim(); if(!tx){ say('메일 내용을 먼저 붙여 넣어 주세요.'); return; }
      vmRes=mailParse(tx); vmOut.hidden=false; vmOut.label.value=vmRes.label; vmOut.when.value=vmRes.when; vmOut.num.value=vmRes.num;
      vmOut.querySelector('.vm-hit').textContent=vmRes.hit?'이미 있는 "'+vmRes.hit.label+'" 칸에 번호를 넣어요.':(vmRes.when||vmRes.num?'찾은 걸 확인하고 고쳐서 만들어요.':'날짜·번호를 못 찾았어요. 직접 적어 주세요.'); });
    if(vmOut) vmOut.addEventListener('submit',function(ev){ ev.preventDefault(); var f=new FormData(vmOut), l=String(f.get('label')||'').trim().slice(0,30), w=String(f.get('when')||''), n=String(f.get('num')||'').trim().slice(0,80);
      var id=vmRes&&vmRes.hit&&vmRes.hit.label===l?vmRes.hit.id:null;
      if(!id){ id='m'+Date.now().toString(36); V.mine.push({id:id,label:l,when:w}); }
      if(n) V.t[id]=V.t[id]?(V.t[id].indexOf(n)>=0?V.t[id]:(n+' · '+V.t[id]).slice(0,80)):n;
      LS.set(VK,V); vmOut.hidden=true; vmIn.value=''; vmRes=null; var d=vmOut.closest('details'); if(d) d.open=false; paintVault(); say('"'+l+'" 칸을 '+(id[0]==='m'?'만들었어요':'채웠어요')+'. 캡처나 PDF도 넣어 두세요.'); });

    // 크게 보기: 흰 화면 가득, 여러 장은 좌우로 넘기기, 'QR만'·'전체' 바꾸기, 누르면 확대, 보는 동안 화면이 꺼지지 않게
    var vv=document.querySelector('.vaultview'), cur={id:null,k:0,full:false}, lock=null;
    function wake(on){ try{ if(on&&navigator.wakeLock&&!lock) navigator.wakeLock.request('screen').then(function(l){ lock=l; l.addEventListener('release',function(){ lock=null; }); },function(){});
      if(!on&&lock){ lock.release(); lock=null; } }catch(e){} }
    document.addEventListener('visibilitychange',function(){ if(vv&&vv.open&&document.visibilityState==='visible') wake(true); });
    function paintV(){ var ps=pics[cur.id]||[], p=ps[cur.k]; if(!p) return; var sl=slots().filter(function(s){return s.id===cur.id})[0];
      var img=vv.querySelector('img'), qr=!!p.crop&&!cur.full; img.src=qr?p.curl:p.url; img.classList.toggle('qr',qr); vv.classList.remove('zoom');
      vv.querySelector('.vv-t').textContent=(sl?sl.label:'')+(V.t[cur.id]?' · '+V.t[cur.id]:'');
      vv.querySelector('.vv-n').textContent=ps.length>1?(cur.k+1)+' / '+ps.length:'';
      vv.querySelectorAll('.vv-prev,.vv-next').forEach(function(b){ b.hidden=ps.length<2; });
      var tg=vv.querySelector('.vv-crop'); tg.hidden=!p.crop; tg.textContent=cur.full?'QR만 크게':'전체 화면 보기'; }
    function showV(id,k){ var p=(pics[id]||[])[k]; if(!p) return;
      if(isPdf(p)){ var w=window.open(p.url,'_blank'); if(!w) location.href=p.url; return; }
      cur={id:id,k:k,full:false}; paintV(); if(!vv.open) vv.showModal(); wake(true); }
    function stepV(d){ var ps=(pics[cur.id]||[]).filter(function(p){return !isPdf(p)}), all=pics[cur.id]||[]; if(ps.length<2) return; var k=cur.k;
      do{ k=(k+d+all.length)%all.length; }while(isPdf(all[k])); cur.k=k; cur.full=false; paintV(); }
    if(vv){
      vv.addEventListener('click',function(ev){
        if(ev.target.closest('.vv-prev')){ stepV(-1); return; } if(ev.target.closest('.vv-next')){ stepV(1); return; }
        if(ev.target.closest('.vv-crop')){ cur.full=!cur.full; paintV(); return; }
        if(ev.target.closest('.vv-close')){ vv.close(); return; }
        if(ev.target.tagName==='IMG'){ vv.classList.toggle('zoom'); return; }
        vv.close(); });
      var sx=null; vv.addEventListener('touchstart',function(ev){ sx=vv.classList.contains('zoom')?null:ev.touches[0].clientX; },{passive:true});
      vv.addEventListener('touchend',function(ev){ if(sx===null) return; var dx=ev.changedTouches[0].clientX-sx; sx=null; if(Math.abs(dx)>50) stepV(dx<0?1:-1); });
      vv.addEventListener('keydown',function(ev){ if(ev.key==='ArrowRight') stepV(1); if(ev.key==='ArrowLeft') stepV(-1); });
      vv.addEventListener('close',function(){ wake(false); });
    }

    // 옮기기: 보관함을 파일 하나로 (새 휴대폰으로 옮기거나 일행에게 에어드롭). 파일 안에는 사진이 그대로 들어 있으니 아무에게나 보내지 않기
    var b64=function(blob){ return new Promise(function(ok,no){ var r=new FileReader(); r.onload=function(){ok(r.result)}; r.onerror=no; r.readAsDataURL(blob); }); };
    var unb64=function(u){ return fetch(u).then(function(r){return r.blob()}); };
    document.addEventListener('click',function(ev){
      if(ev.target.closest('.vault-out')){ var all=[]; Object.keys(pics).forEach(function(k){ all=all.concat(pics[k]); });
        if(!all.length&&!Object.keys(V.t).length){ say('아직 넣은 게 없어요.'); return; }
        say('파일을 만드는 중이에요…');
        Promise.all(all.map(function(r){ return Promise.all([b64(r.blob),r.crop?b64(r.crop):null]).then(function(a){ return {slot:r.slot,name:r.name||'',t:r.t,blob:a[0],crop:a[1]||undefined}; }); }))
          .then(function(items){ var data=JSON.stringify({kind:'tp-vault',trip:slug,v:2,made:new Date().toISOString(),text:V.t,mine:V.mine,used:V.used,items:items});
            var name=slug+'-qr-보관함.json', file=new Blob([data],{type:'application/json'});
            var f=window.File?new File([file],name,{type:'application/json'}):null;
            if(f&&navigator.canShare&&navigator.canShare({files:[f]})) return navigator.share({files:[f],title:'QR·바우처 보관함'}).catch(function(){});
            var a=document.createElement('a'); a.href=URL.createObjectURL(file); a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },1000); }); }
    });
    var vin=document.querySelector('.vault-in input'); if(vin) vin.addEventListener('change',function(){ var f=vin.files[0]; vin.value=''; if(!f) return;
      f.text().then(function(s){ var d=JSON.parse(s); if(d.kind!=='tp-vault'||d.trip!==slug) throw 0;
        Object.keys(d.text||{}).forEach(function(k){ if(!V.t[k]) V.t[k]=d.text[k]; });
        (d.mine||[]).forEach(function(m){ if(!V.mine.some(function(x){return x.id===m.id})) V.mine.push(m); });
        Object.keys(d.used||{}).forEach(function(k){ V.used[k]=1; }); LS.set(VK,V);
        var have={}; Object.keys(pics).forEach(function(k){ pics[k].forEach(function(r){ have[r.slot+'|'+r.blob.size]=1; }); });
        return Promise.all((d.items||[]).map(function(it,k){ return Promise.all([unb64(it.blob),it.crop?unb64(it.crop):null]).then(function(a){
          return have[it.slot+'|'+a[0].size]?null:{id:slug+':'+it.slot+':in'+Date.now().toString(36)+k,trip:slug,slot:it.slot,blob:a[0],crop:a[1]||undefined,name:it.name,t:it.t||Date.now()}; }); }))
          .then(function(recs){ recs=recs.filter(Boolean); return tx('readwrite',function(s){ recs.forEach(function(r){ s.put(r); }); }).then(function(){ return loadPics(); }).then(function(){ say(recs.length?recs.length+'장을 가져왔어요.':'이미 다 있어요. 번호·메모만 합쳤어요.'); }); }); })
        .catch(function(){ say('이 여행의 QR 보관함 파일이 아니에요.'); }); });
    paintVault();
  }

  // ------------------------------------------------ 식당 카드: 고른 재료로 '빼 주세요'·'알레르기' 문장 만들기
  var ings=document.querySelector('.ings');
  if(ings){ ings.addEventListener('click',function(ev){ var b=ev.target.closest('.ing'); if(b) b.setAttribute('aria-pressed',b.getAttribute('aria-pressed')!=='true'); });
    document.addEventListener('click',function(ev){ var b=ev.target.closest('[data-ing]'); if(!b) return;
      var on=[].filter.call(ings.querySelectorAll('.ing'),function(x){return x.getAttribute('aria-pressed')==='true'});
      if(!on.length){ say('먼저 재료를 골라 주세요.'); return; }
      var k=b.dataset.ing==='remove'?'r':'a', sep=ings.dataset.sep||', ';
      var ja=ings.dataset[k+'ja'].replace('{x}',on.map(function(x){return x.dataset.ja}).join(sep)), ko=ings.dataset[k+'ko'].replace('{x}',on.map(function(x){return x.dataset.ko}).join(', '));
      var big=document.querySelector('.bigshow'); if(!big) return; big.querySelector('b').textContent=ja; big.querySelector('small').textContent=ko; if(big.showModal) big.showModal(); }); }

  // ------------------------------------------------ 지하철 1일권: 오늘 날짜 표시
  document.querySelectorAll('.pd[data-date]').forEach(function(li){ li.classList.toggle('today',li.dataset.date===ymd(localNow())); });

  // ------------------------------------------------ 동전 털기: 남은 동전으로 살 수 있는 것
  var ci=document.querySelector('.coin-in'), co=document.querySelector('.coin-out');
  if(ci&&co) ci.addEventListener('input',function(){ var y=Math.max(0,Math.floor(+ci.value||0)); if(!y){ co.textContent=''; return; }
    var r=(C.currency||{}).fallback_krw_per_100||0;
    co.innerHTML='¥'+y.toLocaleString('ko-KR')+(r?' ≈ ₩'+Math.round(y*r/100).toLocaleString('ko-KR'):'')+' · 자판기 음료(¥160 안팎) <b>'+Math.floor(y/160)+'병</b> 또는 편의점 과자·음료로 털 수 있어요'+(y%10?'. ¥1·5 동전 '+(y%10)+'엔어치는 모금함에 넣어요':'')+'.'; });

  // ------------------------------------------------ 오프라인 알림: 지하상가처럼 인터넷이 끊기면 알려 준다
  function net(){ document.body.classList.toggle('offline',!navigator.onLine); }
  window.addEventListener('offline',function(){ net(); say('인터넷이 끊겼어요. 저장된 일정·택시 카드·QR은 그대로 열려요.'); });
  window.addEventListener('online',function(){ net(); say('다시 연결됐어요.'); });
  if(!navigator.onLine){ net(); setTimeout(function(){ say('오프라인이에요. 마지막으로 저장된 화면을 보여 줘요.'); },600); }
})();

// ================================================================ 쇼핑 리스트: 가게별 면세 합산 (2026-11 환급제 · 같은 가게·같은 날 세금 제외 ¥5,000 이상)
(function(){
  var cfgEl=document.getElementById('shop-cfg'); if(!cfgEl) return;
  var C=JSON.parse(cfgEl.textContent), K='tp-shop-'+C.trip, SK='tp-shopat-'+C.trip, box=document.querySelector('.tfx'); if(!box) return;
  var STORES=C.stores||[], at={}; try{ at=JSON.parse(localStorage.getItem(SK)||'{}'); }catch(e){}
  var fmt=function(n){ return Math.round(n).toLocaleString('ko-KR'); };
  var esc=function(x){ return String(x||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]}); };
  var cards=[].slice.call(document.querySelectorAll('.shop'));
  function guess(c){ var w=c.dataset.where||''; for(var i=0;i<STORES.length;i++){ if(STORES[i].kw&&new RegExp(STORES[i].kw).test(w)) return STORES[i].id; } return 'etc'; }
  function store(c){ return at[c.dataset.id]||guess(c); }
  function paint(){
    var mine={}; try{ mine=JSON.parse(localStorage.getItem(K)||'{}'); }catch(e){}
    var by={};
    cards.forEach(function(c){ var lab=c.querySelector('.shop-at'), on=!!mine[c.dataset.id]; if(lab){ lab.hidden=!on; lab.querySelector('select').value=store(c); }
      if(!on) return; var s=store(c), yen=+c.dataset.yen||0, r=c.dataset.food==='1'?1.08:1.10, g=by[s]=by[s]||{n:0,y:0,ex:0,unk:0};
      g.n++; if(yen){ g.y+=yen; g.ex+=yen/r; } else g.unk++; });
    var ids=Object.keys(by); if(!ids.length){ box.innerHTML='<p class="lead" style="margin:0">담기를 누르면 가게별로 모아서 면세 기준을 넘었는지 계산해요.</p>'; return; }
    box.innerHTML=ids.map(function(id){ var g=by[id], st=STORES.filter(function(x){return x.id===id})[0]||{label:'기타',tf:false}, pct=Math.min(100,g.ex/C.tf_min*100), ok=g.ex>=C.tf_min;
      var left=Math.max(0,Math.ceil((C.tf_min-g.ex)*1.1/10)*10);
      return '<div class="tfx-r'+(ok?' ok':'')+(st.tf?'':' na')+'"><div class="tfx-h"><b>'+esc(st.label)+'</b><span>'+g.n+'개 · ¥'+fmt(g.y)+(g.unk?' + 가격 모름 '+g.unk:'')+'</span></div>'
        +(st.tf?'<div class="tfx-bar"><i style="width:'+pct.toFixed(0)+'%"></i></div><p>'+(ok?'면세 기준을 넘었어요 · 돌려받을 소비세 약 ¥'+fmt(g.y-g.ex)+'. 하루에 한 가게에서 같이 사야 해요.':'세금 제외 ¥'+fmt(g.ex)+' / ¥'+fmt(C.tf_min)+' · 약 ¥'+fmt(left)+' 더 사면 면세')+'</p>'
          :'<p>'+esc(st.note||'보통 면세가 안 되는 곳이에요')+'</p>')+'</div>'; }).join('');
  }
  document.addEventListener('change',function(ev){ var s=ev.target.closest('.shop-at select'); if(!s) return; at[s.closest('.shop').dataset.id]=s.value; try{localStorage.setItem(SK,JSON.stringify(at))}catch(e){} paint(); });
  document.addEventListener('click',function(ev){ if(ev.target.closest('.shop-add')) setTimeout(paint,0); });
  paint();
})();
