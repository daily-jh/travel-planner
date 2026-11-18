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
  document.addEventListener('click',function(ev){ var b=ev.target.closest('[data-pl]'); if(!b) return; var id=b.closest('.plan-ctl').dataset.plan;
    if(b.dataset.pl==='skip'){ if(PL.s[id]) delete PL.s[id]; else PL.s[id]=1; savePlan(); }
    if(b.dataset.pl==='undo'){ delete PL.w[id]; savePlan(); }
    if(b.dataset.pl==='swap'){ swapFor=id; nearArea=b.dataset.area||''; nearRef=null; setNf(b.dataset.kind||'all'); var me=b.closest('dialog'); if(me&&me.open) me.close(); setTimeout(function(){ openSheet('tool-near'); renderNear(); },60); } });
  paintPlan();

  // ------------------------------------------------ 주변 대안: 미배치 후보 중 지금 열었을 만한 곳 (영업시간은 업종별 어림)
  var nearUl=document.querySelector('ul.near'), nearWhere=document.querySelector('.near-where'), nearArea='', nearRef=null, nf='all';
  var AR=C.areas||{};
  function setNf(k){ nf=k; document.querySelectorAll('[data-nf]').forEach(function(x){x.setAttribute('aria-pressed',x.dataset.nf===k)}); }
  var kind=function(x){ var s=x.g+' '+x.c; if(/카페|커피|디저트|베이커리|도넛|아이스크림|제과/.test(x.c)||(/카페/.test(x.g)&&!/식당/.test(x.c))) return 'cafe';
    if(/관광|쇼핑/.test(x.g)||/잡화|상점|선물|약국|슈퍼|할인점|호텔|판매점/.test(x.c)) return 'shop'; return 'eat'; };
  function openState(o,m){ var p=(o||'').split('-'), a=tm(p[0]), z=tm(p[1]); if(a===null||z===null) return 'unk'; if(z<=a) z+=1440;
    var mm=m<a&&m+1440<z?m+1440:m; if(mm<a) return a-mm<=60?'soon':'closed'; if(mm>=z) return 'closed'; return z-mm<=45?'closing':'open'; }
  var km=function(a,b){ var R=6371,r=Math.PI/180,dl=(b[0]-a[0])*r,dn=(b[1]-a[1])*r,x=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dn/2)*Math.sin(dn/2); return 2*R*Math.asin(Math.sqrt(x)); };
  var ST={open:['open','영업 중일 듯'],closing:['closing','곧 닫을 듯'],soon:['soon','곧 열 듯'],closed:['closed','닫았을 듯'],unk:['unk','시간 모름']};
  function renderNear(){
    if(!nearUl) return; var n=localNow(), m=n.getHours()*60+n.getMinutes();
    var ref=nearRef||(nearArea&&AR[nearArea])||null;
    nearWhere.textContent=(nearRef?'내 위치 기준':nearArea?nearArea+' 기준':'권역별')+' · 지금 '+String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')+(swapFor?' · 고른 곳으로 일정 한 줄을 바꿔요':'');
    var list=(C.near||[]).filter(function(x){ return nf==='all'||kind(x)===nf; }).map(function(x){
      var st=openState(x.o,m), d=ref&&AR[x.a]?km(ref,AR[x.a]):null;
      return {x:x,st:st,d:d,score:(st==='open'||st==='closing'?0:st==='soon'?1:2)*1000+(d===null?500:d)}; });
    list.sort(function(a,b){ return a.score-b.score; });
    nearUl.innerHTML=list.slice(0,30).map(function(r){ var x=r.x, s=ST[r.st];
      return '<li class="'+s[0]+'"><div class="nr-b"><b>'+esc(x.n)+'</b><small>'+esc([x.c,x.r&&'★ '+x.r,x.m].filter(Boolean).join(' · '))+'</small>'
        +'<span class="nr-m"><i class="nst '+s[0]+'">'+s[1]+'</i>'+esc(x.o.replace('-','~'))+' 어림'+(x.a?' · '+esc(x.a)+(r.d===null?'':(r.d<0.3?(nearRef?' · 약 300m 안':' · 같은 동네'):' · 약 '+(r.d<1?Math.round(r.d*10)*100+'m':r.d.toFixed(1)+'km'))):' · 위치 확인 필요')+'</span></div>'
        +'<div class="nr-a"><a class="btn" href="'+gmap(x.q)+'" target="_blank" rel="noopener">지도</a>'+(swapFor?'<button type="button" class="btn primary" data-swapto="'+esc(x.n)+'">이걸로 바꾸기</button>':'')+'</div></li>'; }).join('')
      ||'<li class="empty">고른 종류의 후보가 없어요.</li>';
  }
  document.addEventListener('click',function(ev){
    var o=ev.target.closest('[data-open="tool-near"]'); if(o&&!o.closest('.plan-ctl')){ swapFor=null; nearRef=null; nearArea=o.dataset.area||nearArea||''; if(o.dataset.kind) setNf(o.dataset.kind); setTimeout(renderNear,0); }
    var f=ev.target.closest('[data-nf]'); if(f){ setNf(f.dataset.nf); renderNear(); }
    if(ev.target.closest('.near-gps')){ if(!navigator.geolocation){ say('이 브라우저는 위치를 쓸 수 없어요.'); return; }
      say('위치를 찾는 중이에요…');
      navigator.geolocation.getCurrentPosition(function(p){ nearRef=[p.coords.latitude,p.coords.longitude]; renderNear(); say('내 위치에서 가까운 순이에요.'); },
        function(){ say('위치를 못 가져왔어요. 권역 기준으로 보여 줄게요.'); },{enableHighAccuracy:false,timeout:10000,maximumAge:300000}); }
    var s=ev.target.closest('[data-swapto]'); if(s&&swapFor){ PL.w[swapFor]=s.dataset.swapto; delete PL.s[swapFor]; var id=swapFor; swapFor=null; savePlan();
      var d=document.getElementById('tool-near'); if(d&&d.open) d.close(); say(s.dataset.swapto+'(으)로 바꿨어요.'); setTimeout(function(){ openSheet(id); },300); }
  });
  var nd=document.getElementById('tool-near'); if(nd) nd.addEventListener('close',function(){ swapFor=null; });
  renderNear();

  // ------------------------------------------------ QR·바우처 보관함 (사진은 IndexedDB, 번호·메모는 localStorage — 둘 다 이 휴대폰에만)
  var vUl=document.querySelector('ul.vault');
  if(vUl){
    var VK='tp-vault-'+slug, V=LS.get(VK,{t:{},mine:[]}); V.t=V.t||{}; V.mine=V.mine||[];
    var pics={}, idb=null;
    var db=function(){ return idb||(idb=new Promise(function(ok,no){ if(!window.indexedDB) return no(); var r=indexedDB.open('tp-vault',1);
      r.onupgradeneeded=function(){ r.result.createObjectStore('v',{keyPath:'id'}); }; r.onsuccess=function(){ok(r.result)}; r.onerror=no; })); };
    var tx=function(mode,fn){ return db().then(function(d){ return new Promise(function(ok,no){ var t=d.transaction('v',mode), r=fn(t.objectStore('v')); t.oncomplete=function(){ok(r&&r.result)}; t.onerror=t.onabort=no; }); }); };
    var slots=function(){ return (C.vouchers||[]).concat(V.mine.map(function(x){return {id:x.id,label:x.label,hint:'직접 추가한 칸',when:'',mine:1}})); };
    function paintVault(){ var today=ymd(localNow()), n=0;
      var ss=slots().slice().sort(function(a,b){ var A=a.when===today?0:1, B=b.when===today?0:1; return A-B; });
      vUl.innerHTML=ss.map(function(s){ var p=pics[s.id], tx2=V.t[s.id]||''; if(p||tx2) n++;
        return '<li data-v="'+esc(s.id)+'"'+(s.when===today?' class="today"':'')+'><div class="v-h"><b>'+esc(s.label)+'</b>'+(s.when?'<small>'+(s.when===today?'오늘 · ':'')+esc(s.when.slice(5).replace('-','/'))+'</small>':'')+'</div>'
          +(p?'<button type="button" class="v-pic" data-vshow="'+esc(s.id)+'" aria-label="'+esc(s.label)+' 크게 보기"><img src="'+p.url+'" alt=""></button>':'')
          +'<input class="v-num" value="'+esc(tx2)+'" placeholder="'+esc(s.hint||'번호·메모')+' (번호·메모)" maxlength="80" autocomplete="off">'
          +'<div class="v-a"><label class="btn">'+(p?'사진 바꾸기':'사진 넣기')+'<input type="file" accept="image/*" hidden></label>'+(p||tx2?'<button type="button" class="btn" data-vdel>비우기</button>':'')+(s.mine?'<button type="button" class="btn" data-vrm>칸 지우기</button>':'')+'</div></li>'; }).join('');
      var mini=document.querySelector('.qr-mini'); if(mini) mini.textContent=n?n+'칸 채움 · 이 휴대폰에만':'이 휴대폰에만 저장';
    }
    tx('readonly',function(s){return s.getAll()}).then(function(rows){ (rows||[]).forEach(function(r){ if(r.trip===slug){ r.url=URL.createObjectURL(r.blob); pics[r.slot]=r; } }); paintVault(); }).catch(function(){});
    vUl.addEventListener('input',function(ev){ var i=ev.target.closest('.v-num'); if(!i) return; var id=i.closest('li').dataset.v; if(i.value) V.t[id]=i.value.slice(0,80); else delete V.t[id]; LS.set(VK,V); });
    vUl.addEventListener('change',function(ev){ var inp=ev.target.closest('input[type=file]'); if(!inp||!inp.files.length) return; var id=inp.closest('li').dataset.v, f=inp.files[0];
      // QR이 깨지지 않게 줄이지 않고 원본을 그대로 넣는다 (캡처 한 장은 보통 1MB 안팎)
      var rec={id:slug+':'+id,trip:slug,slot:id,blob:f,t:Date.now()};
      tx('readwrite',function(s){return s.put(rec)}).then(function(){ if(pics[id]) URL.revokeObjectURL(pics[id].url); rec.url=URL.createObjectURL(f); pics[id]=rec; paintVault(); say('이 휴대폰에 저장했어요.'); },function(){ say('저장하지 못했어요. 저장 공간을 확인해 주세요.'); });
      inp.value=''; });
    vUl.addEventListener('click',function(ev){ var li=ev.target.closest('li[data-v]'); if(!li) return; var id=li.dataset.v;
      if(ev.target.closest('[data-vshow]')){ var vv=document.querySelector('.vaultview'), p=pics[id]; if(!vv||!p) return; vv.querySelector('img').src=p.url;
        var sl=slots().filter(function(s){return s.id===id})[0]; vv.querySelector('.vv-t').textContent=(sl?sl.label:'')+(V.t[id]?' · '+V.t[id]:''); vv.showModal(); return; }
      if(ev.target.closest('[data-vdel]')){ if(!confirmDel()) return; delete V.t[id]; LS.set(VK,V); tx('readwrite',function(s){return s.delete(slug+':'+id)}).catch(function(){}); if(pics[id]){ URL.revokeObjectURL(pics[id].url); delete pics[id]; } paintVault(); }
      if(ev.target.closest('[data-vrm]')){ V.mine=V.mine.filter(function(x){return x.id!==id}); delete V.t[id]; LS.set(VK,V); tx('readwrite',function(s){return s.delete(slug+':'+id)}).catch(function(){}); delete pics[id]; paintVault(); } });
    // 비우기는 한 번 더 눌러야 지워진다 (실수 방지, 알림창은 쓰지 않음)
    var armed=0; function confirmDel(){ if(Date.now()-armed<3000){ armed=0; return true; } armed=Date.now(); say('한 번 더 누르면 비워져요.'); return false; }
    var vf=document.querySelector('.vault-add'); if(vf) vf.addEventListener('submit',function(ev){ ev.preventDefault(); var l=String(new FormData(vf).get('label')||'').trim(); if(!l) return;
      V.mine.push({id:'m'+Date.now().toString(36),label:l.slice(0,30)}); LS.set(VK,V); vf.reset(); paintVault(); });
    var vv=document.querySelector('.vaultview'); if(vv) vv.addEventListener('click',function(){ vv.close(); });
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
