// 날짜별 지도: 동선 번호를 누르면 아래 지도가 그 장소로 바뀐다
document.querySelectorAll('.route').forEach(function(card){
  var box=card.querySelector('.mapbox'), frame=card.querySelector('iframe'), cap=card.querySelector('.mapcap b');
  if(!frame) return;
  frame.addEventListener('load',function(){box.classList.remove('loading')});
  card.querySelectorAll('li a[data-q]').forEach(function(a){
    a.addEventListener('click',function(ev){
      if(ev.metaKey||ev.ctrlKey||ev.shiftKey) return;
      ev.preventDefault();
      box.classList.add('loading');
      frame.src='https://maps.google.com/maps?q='+encodeURIComponent(a.dataset.q)+'&z=15&hl=ko&output=embed';
      cap.textContent=a.dataset.label;
      card.querySelectorAll('li a').forEach(function(x){x.classList.remove('on')});
      a.classList.add('on');
    });
  });
});

// 여행 목록: D-day, 여행 중, 다녀온 여행
(function(){
  var today=new Date(); today.setHours(0,0,0,0);
  document.querySelectorAll('.dday[data-start]').forEach(function(el){
    var s=new Date(el.dataset.start+'T00:00:00'), e=new Date(el.dataset.end+'T00:00:00');
    var d=Math.round((s-today)/864e5);
    if(today>e){el.textContent='다녀온 여행';el.classList.add('past');}
    else if(d>0){el.textContent='D-'+d;}
    else {el.textContent='여행 중';}
  });
})();

// 여행 중이면 오늘 날짜를 표시
(function(){
  var t=new Date(), iso=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');
  document.querySelectorAll('[data-date="'+iso+'"]').forEach(function(el){
    el.classList.add(el.tagName==='A'||el.tagName==='BUTTON'?'is-today':'today');
  });
})();

// 지금 보고 있는 구역을 위쪽 메뉴에 표시
(function(){
  var links=[].slice.call(document.querySelectorAll('nav.chips a[href^="#"]'));
  if(!links.length||!('IntersectionObserver' in window)) return;
  var map={};
  links.forEach(function(a){var el=document.getElementById(a.getAttribute('href').slice(1)); if(el) map[el.id]=a;});
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(en.isIntersecting){
        links.forEach(function(a){a.classList.remove('active')});
        var a=map[en.target.id]; if(a){a.classList.add('active'); var bar=a.parentNode; bar.scrollTo({left:a.offsetLeft-bar.clientWidth/2+a.clientWidth/2,behavior:'smooth'});}
      }
    });
  },{rootMargin:'-45% 0px -50% 0px'});
  Object.keys(map).forEach(function(id){io.observe(document.getElementById(id))});
})();

// 맨 위로 버튼
(function(){
  var b=document.querySelector('.totop'); if(!b) return;
  var on=function(){b.classList.toggle('show',window.scrollY>800)};
  window.addEventListener('scroll',on,{passive:true}); on();
  b.addEventListener('click',function(ev){ev.preventDefault();window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})});
})();

// 일행에게 공유: 휴대폰 공유 시트(문자·카카오톡), 없으면 링크 복사
(function(){
  var toast=document.querySelector('.toast'), timer;
  function say(msg){ if(!toast) return; toast.textContent=msg; toast.hidden=false; clearTimeout(timer); timer=setTimeout(function(){toast.hidden=true},2600); }
  document.querySelectorAll('button.share').forEach(function(b){
    b.addEventListener('click',function(){
      var url=location.href.split('#')[0], title=b.dataset.title||document.title;
      if(navigator.share){
        navigator.share({title:title,text:title,url:url}).catch(function(){});
        return;
      }
      var done=function(){say('링크를 복사했어요. 문자나 카카오톡에 붙여 넣어 보내세요.')};
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(url).then(done,function(){prompt('이 링크를 복사해서 보내세요',url)});
      } else { prompt('이 링크를 복사해서 보내세요',url); }
    });
  });
})();

// 의견 보내기: 장소 이름과 링크를 적은 문자 창을 연다 (받는 사람은 보내는 사람이 연락처에서 고름)
(function(){
  if(!document.querySelector('meta[name="feedback"]')) return;
  var ios=/iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
  document.querySelectorAll('button.fb').forEach(function(b){
    b.addEventListener('click',function(){
      var body='['+b.dataset.subject+'] 의견: \n'+location.href.split('#')[0];
      location.href='sms:'+(ios?'&':'?')+'body='+encodeURIComponent(body);
    });
  });
})();

// 날짜 탭: 한 번에 하루만 보여서 스크롤을 줄인다 (오늘 → 주소의 #dayN → 1일차 순으로 첫 탭을 고름)
(function(){
  var sec=document.getElementById('detail'); if(!sec) return;
  var tabs=[].slice.call(sec.querySelectorAll('.daytabs button')); if(!tabs.length) return;
  sec.classList.add('tabs-on');
  function show(id,scroll){
    tabs.forEach(function(b){var on=b.dataset.pane===id; b.setAttribute('aria-selected',on); b.tabIndex=on?0:-1; var p=document.getElementById(b.dataset.pane); if(p) p.hidden=!on; if(on){var bar=b.parentNode; bar.scrollLeft=b.offsetLeft-bar.clientWidth/2+b.clientWidth/2;}});
    if(scroll) sec.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }
  tabs.forEach(function(b){b.addEventListener('click',function(){show(b.dataset.pane,false); history.replaceState(null,'','#'+b.dataset.pane);});});
  document.querySelectorAll('nav.chips a[href^="#day"]').forEach(function(a){
    a.addEventListener('click',function(ev){ev.preventDefault(); show(a.getAttribute('href').slice(1),true); history.replaceState(null,'',a.getAttribute('href'));});
  });
  var today=document.querySelector('.daytabs button.is-today');
  var h=location.hash.slice(1);
  show(/^day\d+$/.test(h)&&document.getElementById(h)?h:(today?today.dataset.pane:tabs[0].dataset.pane), /^day\d+$/.test(h));
})();

// 팝업 시트: data-open 버튼으로 열고, ✕·바깥 누르기·Esc로 닫는다
(function(){
  function close(d){ d.close(); document.body.classList.remove('sheet-open'); }
  document.addEventListener('click',function(ev){
    var o=ev.target.closest('[data-open]');
    if(o){ var d=document.getElementById(o.dataset.open); if(d&&d.showModal){ var cur=o.closest('dialog[open]'); if(cur&&cur!==d) cur.close(); var acc=o.closest('[class*="c-"]'); if(acc) d.style.setProperty('--accent',getComputedStyle(acc).getPropertyValue('--accent')); d.showModal(); document.body.classList.add('sheet-open'); } return; }
    if(ev.target.closest('[data-close]')){ close(ev.target.closest('dialog')); return; }
    if(ev.target.tagName==='DIALOG'&&ev.target.classList.contains('sheet')){ close(ev.target); }
  });
  document.querySelectorAll('dialog.sheet').forEach(function(d){ d.addEventListener('close',function(){ if(!document.querySelector('dialog.sheet[open]')) document.body.classList.remove('sheet-open'); }); });
  // 시간표 줄은 키보드 Enter로도 연다
  document.addEventListener('keydown',function(ev){ if(ev.key==='Enter'&&ev.target.matches&&ev.target.matches('tr[data-open]')){ ev.preventDefault(); ev.target.click(); } });
  // 첫 방문 안내: 한 번 보면 다시 뜨지 않는다 (? 버튼으로 다시 볼 수 있음)
  var w=document.querySelector('dialog[data-auto]');
  if(w&&w.showModal){
    var k=w.dataset.auto, seen=false;
    try{ seen=!!localStorage.getItem(k); }catch(e){ seen=true; }
    w.addEventListener('close',function(){ try{ localStorage.setItem(k,'1'); }catch(e){} });
    if(!seen) setTimeout(function(){ if(!document.querySelector('dialog[open]')){ w.showModal(); document.body.classList.add('sheet-open'); } },900);
  }
})();

// ---------------------------------------------------------------- 우리의 픽
// 저장소: site.json 에 Supabase 주소·키가 있으면 모두가 함께 보는 DB, 없으면 이 휴대폰(localStorage)
(function(){
  var el=document.getElementById('trip-cfg'); if(!el) return;
  var cfg=JSON.parse(el.textContent), trip=cfg.trip, sb=cfg.supabase||{};
  var shared=!!(sb.url&&sb.key);
  var tones={}; cfg.travelers.forEach(function(x){tones[x.name]=x.tone||'pri'});
  var LS='tp-picks-'+trip, ME='tp-me';
  var saved={}, draft=null, me=null;
  function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
  function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  function toast(m){var t=document.querySelector('.toast'); if(!t) return; t.textContent=m; t.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(function(){t.hidden=true},2600);}
  function hdr(){return {'apikey':sb.key,'Authorization':'Bearer '+sb.key,'Content-Type':'application/json'};}

  // saved: { 장소이름: [이름, ...] }
  function load(){
    if(!shared){ try{saved=JSON.parse(lsGet(LS)||'{}')}catch(e){saved={}} return Promise.resolve(); }
    return fetch(sb.url+'/rest/v1/picks?select=place,person&trip=eq.'+encodeURIComponent(trip),{headers:hdr()})
      .then(function(r){if(!r.ok) throw r; return r.json();})
      .then(function(rows){saved={}; rows.forEach(function(r){(saved[r.place]=saved[r.place]||[]).push(r.person)});})
      .catch(function(){toast('픽을 불러오지 못했어요. 잠시 뒤 새로고침해 주세요.')});
  }
  function mine(){var s={}; Object.keys(saved).forEach(function(p){if(saved[p].indexOf(me)>=0) s[p]=1}); return s;}
  function persist(next){
    var before=mine(), add=[], del=[];
    Object.keys(next).forEach(function(p){if(!before[p]) add.push(p)});
    Object.keys(before).forEach(function(p){if(!next[p]) del.push(p)});
    if(!shared){
      add.forEach(function(p){(saved[p]=saved[p]||[]).push(me)});
      del.forEach(function(p){saved[p]=saved[p].filter(function(x){return x!==me}); if(!saved[p].length) delete saved[p];});
      lsSet(LS,JSON.stringify(saved)); return Promise.resolve(add.length+del.length);
    }
    var jobs=[];
    if(add.length) jobs.push(fetch(sb.url+'/rest/v1/picks',{method:'POST',headers:Object.assign(hdr(),{'Prefer':'resolution=merge-duplicates'}),body:JSON.stringify(add.map(function(p){return {trip:trip,place:p,person:me}}))}));
    del.forEach(function(p){jobs.push(fetch(sb.url+'/rest/v1/picks?trip=eq.'+encodeURIComponent(trip)+'&person=eq.'+encodeURIComponent(me)+'&place=eq.'+encodeURIComponent(p),{method:'DELETE',headers:hdr()}))});
    return Promise.all(jobs).then(function(rs){rs.forEach(function(r){if(!r.ok) throw r}); return load();}).then(function(){return add.length+del.length});
  }

  function badge(name,both){var b=document.createElement('span'); b.className='pk-badge tone-'+(tones[name]||'pri')+(both?' both':''); b.textContent=both?'둘 다 픽':name+' 픽'; return b;}
  function render(){
    document.querySelectorAll('.pickbar').forEach(function(bar){
      var key=bar.dataset.pick, who=bar.querySelector('.who'), ed=bar.querySelector('.pk-edit');
      var people=(saved[key]||[]).slice();
      if(draft){ people=people.filter(function(x){return x!==me}); if(draft[key]) people.push(me); }
      who.textContent='';
      if(people.length>1&&people.length===cfg.travelers.length) who.appendChild(badge(people[0],true));
      else people.forEach(function(n){who.appendChild(badge(n,false))});
      ed.textContent='';
      if(draft){
        var h=document.createElement('button'); h.type='button'; h.className='pk-heart tone-'+(tones[me]||'pri');
        h.setAttribute('aria-pressed',draft[key]?'true':'false'); h.textContent=draft[key]?me+' 픽':'가고 싶어요';
        h.addEventListener('click',function(ev){ev.stopPropagation(); if(draft[key]) delete draft[key]; else draft[key]=1; render();});
        ed.appendChild(h);
      }
    });
    summary(); dock();
  }
  function summary(){
    var box=document.querySelector('.pp-sum'), counts={}, both=[];
    cfg.travelers.forEach(function(x){counts[x.name]=0});
    Object.keys(saved).forEach(function(p){saved[p].forEach(function(n){counts[n]=(counts[n]||0)+1}); if(saved[p].length===cfg.travelers.length) both.push(p);});
    if(box) box.innerHTML=cfg.travelers.map(function(x){return x.name+' <b>'+counts[x.name]+'</b>곳'}).join(' · ')+(cfg.travelers.length>1?' · 둘 다 <b>'+both.length+'</b>곳':'');
    var list=document.querySelector('.pk-list'); if(!list) return;
    var html='';
    function sec(title,arr){html+='<h4>'+title+'</h4>'+(arr.length?'<ul>'+arr.map(function(p){return '<li>'+p.replace(/[<>&]/g,'')+'</li>'}).join('')+'</ul>':'<p class="empty">아직 없어요</p>');}
    if(cfg.travelers.length>1) sec('둘 다 가고 싶은 곳',both);
    cfg.travelers.forEach(function(x){sec(x.name+' 픽',Object.keys(saved).filter(function(p){return saved[p].indexOf(x.name)>=0&&both.indexOf(p)<0}))});
    list.innerHTML=html;
  }
  var dockEl=null;
  function dock(){
    if(!draft){ if(dockEl){dockEl.remove(); dockEl=null;} document.body.classList.remove('picking'); return; }
    document.body.classList.add('picking');
    if(!dockEl){
      dockEl=document.createElement('div'); dockEl.className='pickdock';
      dockEl.innerHTML='<span></span><button type="button" class="ghost" data-pk="cancel">취소</button><button type="button" data-pk="save">저장</button>';
      document.body.appendChild(dockEl);
    }
    dockEl.querySelector('span').textContent=me+' · '+Object.keys(draft).length+'곳 선택';
  }
  function setMe(n){me=n; lsSet(ME,n); document.querySelectorAll('.pp-who button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.me===n?'true':'false')});}
  function buttons(){
    var start=document.querySelector('[data-pk="start"]');
    document.querySelectorAll('.pp-actions [data-pk="save"],.pp-actions [data-pk="cancel"]').forEach(function(b){b.hidden=!draft});
    if(start){ start.hidden=!!draft; start.textContent=Object.keys(mine()).length?'픽 수정':'픽 고르기'; }
  }
  document.querySelectorAll('.pp-who button').forEach(function(b){
    b.addEventListener('click',function(){ if(draft&&me!==b.dataset.me){ toast('먼저 저장하거나 취소해 주세요.'); return; } setMe(b.dataset.me); buttons(); });
  });
  document.addEventListener('click',function(ev){
    var b=ev.target.closest('[data-pk]'); if(!b) return;
    var a=b.dataset.pk;
    if(a==='start'){ if(!me){ toast('먼저 "나는" 옆에서 이름을 눌러 주세요.'); return; } draft=mine(); render(); buttons(); toast('가고 싶은 곳의 하트를 누른 뒤 저장하세요.'); }
    if(a==='cancel'){ draft=null; render(); buttons(); }
    if(a==='save'){ var d=draft; b.disabled=true;
      persist(d).then(function(n){ draft=null; render(); buttons(); toast(n?'픽을 저장했어요.':'바뀐 픽이 없어요.'); })
        .catch(function(){ toast('저장하지 못했어요. 인터넷 연결을 확인하고 다시 저장해 주세요.'); })
        .then(function(){ b.disabled=false; }); }
  });
  var st=document.querySelector('.pp-store'); if(st) st.textContent=shared?'모두와 함께 저장돼요':'지금은 이 휴대폰에만 저장돼요';
  var m=lsGet(ME); if(m&&tones[m]) setMe(m);
  load().then(function(){render(); buttons();});
})();

// ---------------------------------------------------------------- 머리 장식: 테마별로 꽃잎·눈·물방울이 천천히 떨어진다
(function(){
  var c=document.querySelector('canvas.petals'); if(!c||!c.getContext) return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var th=(document.body.className.match(/theme-(\w+)/)||[])[1]||'hakata';
  var kind={hakata:'petal',temple:'petal',snow:'snow',ocean:'bubble',citrus:'leaf',forest:'leaf'}[th]||'petal';
  var ctx=c.getContext('2d'), W=0, H=0, dpr=Math.min(2,window.devicePixelRatio||1), parts=[], run=true;
  var cs=getComputedStyle(document.body), col=(kind==='snow'?cs.getPropertyValue('--pri-soft'):cs.getPropertyValue('--acc')).trim()||'#c13d69';
  function size(){var r=c.getBoundingClientRect(); W=r.width; H=r.height; c.width=W*dpr; c.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);}
  function spawn(y){return {x:Math.random()*W,y:y==null?-10:y,r:3+Math.random()*4,vy:.25+Math.random()*.45,vx:-.2+Math.random()*.4,a:Math.random()*6.28,va:-.02+Math.random()*.04,o:.25+Math.random()*.35};}
  size(); for(var i=0;i<Math.round(W/28);i++) parts.push(spawn(Math.random()*H));
  window.addEventListener('resize',size);
  if('IntersectionObserver' in window) new IntersectionObserver(function(e){run=e[0].isIntersecting; if(run) requestAnimationFrame(tick);}).observe(c);
  function draw(p){
    ctx.save(); ctx.globalAlpha=p.o; ctx.fillStyle=col; ctx.translate(p.x,p.y); ctx.rotate(p.a);
    ctx.beginPath();
    if(kind==='petal'){ ctx.ellipse(0,0,p.r*1.3,p.r*.75,0,0,6.283); }
    else if(kind==='leaf'){ ctx.ellipse(0,0,p.r*1.5,p.r*.55,0,0,6.283); }
    else if(kind==='bubble'){ ctx.globalAlpha=p.o*.8; ctx.lineWidth=1.2; ctx.strokeStyle=col; ctx.arc(0,0,p.r,0,6.283); ctx.stroke(); ctx.restore(); return; }
    else { ctx.arc(0,0,p.r*.6,0,6.283); }
    ctx.fill(); ctx.restore();
  }
  function tick(){
    if(!run) return;
    ctx.clearRect(0,0,W,H);
    parts.forEach(function(p,i){ p.y+=kind==='bubble'?-p.vy:p.vy; p.x+=p.vx+Math.sin(p.y/30)*.25; p.a+=p.va;
      if(p.y>H+10||p.y<-12){ parts[i]=spawn(kind==='bubble'?H+8:-8); } draw(p); });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

// 출발 카운트다운: 남은 일·시간·분 (여행 중이면 n일차, 끝나면 숨김)
(function(){
  var el=document.querySelector('.countdown'); if(!el) return;
  var st=new Date(el.dataset.start+'T00:00:00+09:00'), en=new Date(el.dataset.end+'T23:59:59+09:00');
  var pad=function(n){return (n<10?'0':'')+n};
  function tick(){
    var now=new Date();
    if(now>en){ el.hidden=true; return; }
    if(now>=st){ el.querySelector('.cd-l').textContent='여행 중'; var d=Math.floor((now-st)/864e5)+1; el.querySelector('.cd-tiles').innerHTML='<span><b>'+d+'</b><small>일차</small></span>'; return; }
    var ms=st-now, d=Math.floor(ms/864e5), h=Math.floor(ms%864e5/36e5), m=Math.floor(ms%36e5/6e4);
    var set=function(u,v){ var b=el.querySelector('[data-u="'+u+'"]'); if(b&&b.textContent!==v){ b.textContent=v; b.classList.remove('flip'); void b.offsetWidth; b.classList.add('flip'); } };
    set('d',String(d)); set('h',pad(h)); set('m',pad(m));
  }
  tick(); setInterval(tick,30000);
})();

// ---------------------------------------------------------------- 여행 도구
(function(){
  var cfgEl=document.getElementById('trip-cfg'); if(!cfgEl) return;
  var C=JSON.parse(cfgEl.textContent), slug=C.trip;
  var LS={get:function(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set:function(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
  var fmt=function(n){return Math.round(n).toLocaleString('ko-KR')};
  var tzNow=function(tz){return new Date(new Date().toLocaleString('en-US',{timeZone:tz}))};
  var q=new URLSearchParams(location.search).get('now'); // 미리보기: ?now=2027-02-27T13:30
  var localNow=function(){ return q?new Date(q):tzNow('Asia/Tokyo'); };

  // 환율 (양방향)
  var cur=C.currency||{}, rate=(cur.fallback_krw_per_100||0)/100, dir='f', sym=cur.symbol||'';
  var fxIn=document.querySelector('.fx-in'), fxOut=document.querySelector('.fx-out b'), fxRate=document.querySelector('.fx-rate'), fxMini=document.querySelector('.fx-mini');
  var fxQ=document.querySelector('.fx-quick'), fxFrom=document.querySelector('.fx-from'), fxTo=document.querySelector('.fx-to');
  var QV={f:[500,1000,3000,5000,10000],k:[10000,30000,50000,100000]};
  function fx(){ if(!fxIn||!fxOut) return; var v=parseFloat(fxIn.value)||0; fxOut.textContent=dir==='f'?fmt(v*rate):fmt(v/(rate||1)); }
  function fxDir(d){ dir=d; if(!fxQ) return;
    document.querySelectorAll('[data-dir]').forEach(function(b){ b.setAttribute('aria-pressed',b.dataset.dir===d); });
    fxFrom.textContent=d==='f'?sym:'₩'; fxTo.textContent=d==='f'?'₩':sym;
    fxQ.innerHTML=QV[d].map(function(v){ return '<button type="button" class="btn" data-fx="'+v+'">'+(d==='f'?sym:'₩')+fmt(v)+'</button>'; }).join('');
    fxIn.value=QV[d][1]; fx(); }
  if(fxIn){ fxIn.addEventListener('input',fx);
    document.addEventListener('click',function(ev){ var b=ev.target.closest('[data-fx]'); if(b){ fxIn.value=b.dataset.fx; fx(); } var d=ev.target.closest('[data-dir]'); if(d) fxDir(d.dataset.dir); });
    fxDir('f');
    if(cur.code) fetch('https://open.er-api.com/v6/latest/'+cur.code).then(function(r){return r.json()}).then(function(j){
      if(j&&j.rates&&j.rates.KRW){ rate=j.rates.KRW; fx();
        var t=(j.time_last_update_utc||'').slice(5,16);
        fxRate.textContent=sym+'100 ≈ ₩'+fmt(rate*100)+' · '+t+' 기준 환율';
        if(fxMini) fxMini.textContent=sym+'100 ≈ ₩'+fmt(rate*100); }
    }).catch(function(){ fxRate.textContent=sym+'100 ≈ ₩'+(cur.fallback_krw_per_100||'')+' (기본값, 인터넷 연결 시 실시간으로 바뀌어요)'; });
  }

  // 날씨: 16일 안이면 예보, 아니면 작년 같은 날짜 실측
  var wx=document.querySelector('.wx'), wxMini=document.querySelector('.wx-mini');
  var WMO=function(c){ return c<=1?'맑음':c<=3?'구름':c<=48?'안개':c<=67?'비':c<=77?'눈':c<=82?'소나기':'뇌우'; };
  function loadWx(){
    if(!wx||!C.geo||wx.dataset.done) return; wx.dataset.done=1;
    var st=new Date(C.start), en=new Date(C.end), now=new Date(), days=(st-now)/864e5, url, label;
    var p='latitude='+C.geo.lat+'&longitude='+C.geo.lon+'&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FTokyo';
    if(days<=15){ url='https://api.open-meteo.com/v1/forecast?'+p+'&start_date='+C.start+'&end_date='+C.end; label='예보'; }
    else { var y=function(s){var d=new Date(s);d.setFullYear(d.getFullYear()-1);return d.toISOString().slice(0,10)}; url='https://archive-api.open-meteo.com/v1/archive?'+p+'&start_date='+y(C.start)+'&end_date='+y(C.end); label='작년 같은 날'; }
    var nowBox=document.createElement('div'); nowBox.className='wxnow'; wx.before(nowBox);
    fetch('https://api.open-meteo.com/v1/forecast?latitude='+C.geo.lat+'&longitude='+C.geo.lon+'&current=temperature_2m,apparent_temperature,weather_code,precipitation,wind_speed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=Asia%2FTokyo')
      .then(function(r){return r.json()}).then(function(j){ var c=j.current; if(!c) throw 0;
        nowBox.innerHTML='<div class="wn-l"><small>지금 '+(C.geo.city||'')+' · '+c.time.slice(11,16)+'</small><b>'+Math.round(c.temperature_2m)+'°</b><span>'+WMO(c.weather_code)+' · 체감 '+Math.round(c.apparent_temperature)+'°</span></div>'
          +'<div class="wn-r"><span>최고 '+Math.round(j.daily.temperature_2m_max[0])+'° / 최저 '+Math.round(j.daily.temperature_2m_min[0])+'°</span><span>바람 '+Math.round(c.wind_speed_10m/3.6)+'m/s · 습도 '+c.relative_humidity_2m+'%</span>'+(c.precipitation>0?'<span>☂ '+c.precipitation+'mm</span>':'')+'</div>';
        if(wxMini) wxMini.textContent='지금 '+Math.round(c.temperature_2m)+'° '+WMO(c.weather_code);
      }).catch(function(){ nowBox.remove(); });
    fetch(url).then(function(r){return r.json()}).then(function(j){
      var d=j.daily; if(!d) throw 0;
      var h='<h4 class="wxh">여행 날짜 날씨</h4><p class="lead" style="margin:0 0 10px">'+label+' 기준이에요.</p><ul class="wxl">';
      for(var i=0;i<d.time.length;i++){ var dd=new Date(C.start); dd.setDate(dd.getDate()+i);
        h+='<li><span class="d">'+(i+1)+'일차 '+(dd.getMonth()+1)+'/'+dd.getDate()+'</span><span class="c">'+WMO(d.weather_code[i])+'</span><span class="tmp"><b>'+Math.round(d.temperature_2m_max[i])+'°</b> / '+Math.round(d.temperature_2m_min[i])+'°</span><span class="r">'+(d.precipitation_sum[i]>0.2?'☂ '+d.precipitation_sum[i].toFixed(1)+'mm':'')+'</span></li>'; }
      wx.innerHTML=h+'</ul>';
      var mx=Math.max.apply(null,d.temperature_2m_max), mn=Math.min.apply(null,d.temperature_2m_min);
      if(wxMini&&!/지금/.test(wxMini.textContent)) wxMini.textContent=Math.round(mn)+'°~'+Math.round(mx)+'° ('+label+')';
    }).catch(function(){ wx.innerHTML='<p class="lead">날씨를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>'; });
  }
  loadWx();

  // 현지 한마디: 일본어 음성
  document.addEventListener('click',function(ev){ var b=ev.target.closest('[data-say]'); if(!b||!window.speechSynthesis) return;
    var u=new SpeechSynthesisUtterance(b.dataset.say); u.lang='ja-JP'; u.rate=.9; speechSynthesis.cancel(); speechSynthesis.speak(u);
    b.classList.remove('said'); void b.offsetWidth; b.classList.add('said'); });

  // 현지 시각
  var tl=document.querySelector('.tz-local'), th=document.querySelector('.tz-home');
  function clock(){ var o={hour:'2-digit',minute:'2-digit',hour12:false};
    if(tl) tl.textContent=new Date().toLocaleTimeString('ko-KR',Object.assign({timeZone:'Asia/Tokyo'},o));
    if(th) th.textContent=new Date().toLocaleTimeString('ko-KR',Object.assign({timeZone:'Asia/Seoul'},o)); }
  clock(); setInterval(clock,30000);

  // 함께 쓴 돈 (분류·원화·날짜별)
  var EK='tp-exp-'+slug, ex=LS.get(EK,[]), names=(C.travelers||[]).map(function(x){return x.name});
  var exf=document.querySelector('.exf'), exl=document.querySelector('.exlist'), exs=document.querySelector('.exsum'), exc=document.querySelector('.excat'), exMini=document.querySelector('.ex-mini');
  var krw=function(v){ return rate&&cur.symbol?' <small>₩'+fmt(v*rate)+'</small>':''; };
  function renderEx(){
    if(!exl) return; var s0=cur.symbol||'₩', tot=0, paid={}, byCat={}, byDay={}; names.forEach(function(n){paid[n]=0});
    ex.forEach(function(x){ tot+=x.amt; paid[x.who]=(paid[x.who]||0)+x.amt; byCat[x.cat||'기타']=(byCat[x.cat||'기타']||0)+x.amt; byDay[x.date]=(byDay[x.date]||0)+x.amt; });
    var day=null, rows=[];
    ex.map(function(x,i){return [x,i]}).reverse().forEach(function(p){ var x=p[0];
      if(x.date!==day){ day=x.date; rows.push('<li class="exday"><span>'+day+'</span><b>'+s0+fmt(byDay[day])+'</b></li>'); }
      rows.push('<li><span class="w">'+x.what.replace(/</g,'&lt;')+'<small>'+(x.cat||'기타')+' · '+x.who+'</small></span><b>'+s0+fmt(x.amt)+'</b><button type="button" class="del" data-del="'+p[1]+'" aria-label="삭제">✕</button></li>'); });
    exl.innerHTML=rows.join('');
    var share=names.length?tot/names.length:0, line='';
    if(names.length===2&&tot>0){ var a=names[0],b=names[1],d=paid[a]-share;
      line=Math.abs(d)<1?'딱 반반이에요':(d>0?b+' → '+a:a+' → '+b)+' <b>'+s0+fmt(Math.abs(d))+'</b>'+krw(Math.abs(d)); }
    exs.innerHTML=ex.length?'<div><small>총 지출</small><b>'+s0+fmt(tot)+'</b>'+krw(tot)+'</div><div><small>1인당</small><b>'+s0+fmt(share)+'</b>'+krw(share)+'</div><div class="settle"><small>정산</small><span>'+line+'</span></div>':'<p class="lead" style="margin:0">아직 기록이 없어요. 위에 쓴 돈을 적어 보세요.</p>';
    var cs=Object.keys(byCat).sort(function(x,y){return byCat[y]-byCat[x]});
    exc.innerHTML=cs.length?'<div class="catbar">'+cs.map(function(c,i){return '<i style="flex:'+byCat[c]+'" class="cb'+i+'"></i>'}).join('')+'</div><div class="catleg">'+cs.map(function(c,i){return '<span><i class="cb'+i+'"></i>'+c+' '+s0+fmt(byCat[c])+'</span>'}).join('')+'</div>':'';
    if(exMini) exMini.textContent=ex.length?'총 '+s0+fmt(tot):'기록하고 나눠요';
  }
  if(exf){
    exf.addEventListener('click',function(ev){ var b=ev.target.closest('[data-payer]'); if(b) exf.querySelectorAll('[data-payer]').forEach(function(x){x.setAttribute('aria-pressed',x===b)});
      var c=ev.target.closest('[data-cat]'); if(c) exf.querySelectorAll('[data-cat]').forEach(function(x){x.setAttribute('aria-pressed',x===c)}); });
    exf.addEventListener('submit',function(ev){ ev.preventDefault(); var f=new FormData(exf), who=exf.querySelector('[data-payer][aria-pressed="true"]'), cat=exf.querySelector('[data-cat][aria-pressed="true"]');
      var amt=parseFloat(f.get('amt')); if(!amt) return;
      var d=localNow(); ex.push({what:String(f.get('what')).slice(0,40),amt:amt,who:who?who.dataset.payer:names[0],cat:cat?cat.dataset.cat:'기타',date:(d.getMonth()+1)+'/'+d.getDate()});
      LS.set(EK,ex); exf.querySelector('[name=what]').value=''; exf.querySelector('[name=amt]').value=''; renderEx(); });
    exl.addEventListener('click',function(ev){ var b=ev.target.closest('[data-del]'); if(!b) return; ex.splice(+b.dataset.del,1); LS.set(EK,ex); renderEx(); });
    renderEx();
  }

  // 일본어 회화: 분류 탭, 크게 보여주기
  var ph=document.getElementById('tool-ph');
  if(ph){ ph.addEventListener('click',function(ev){ var t=ev.target.closest('[data-cat]'); if(!t||!t.closest('.seg')) return;
      ph.querySelectorAll('.seg [data-cat]').forEach(function(x){x.setAttribute('aria-selected',x===t)});
      ph.querySelectorAll('ul.phr').forEach(function(u){u.hidden=u.dataset.cat!==t.dataset.cat}); }); }
  var big=document.querySelector('.bigshow');
  document.addEventListener('click',function(ev){ var b=ev.target.closest('[data-big]'); if(b&&big){ big.querySelector('b').textContent=b.dataset.big; big.querySelector('small').textContent=b.dataset.bigko; if(big.showModal) big.showModal(); return; }
    if(big&&big.open&&ev.target.closest('.bigshow')) big.close(); });

  // 캐리어 짐
  var BK='tp-bag-'+slug, bag=LS.get(BK,{c:{},mine:[]}), bf='all';
  var bagRoot=document.getElementById('tool-bag'), bagMini=document.querySelector('.bag-mini');
  function bagItems(){ return bagRoot?bagRoot.querySelectorAll('li[data-bag]'):[]; }
  function renderBag(){
    if(!bagRoot) return;
    var mine=bagRoot.querySelector('.bag-mine');
    mine.innerHTML=bag.mine.length?'<h4>직접 추가</h4><ul class="bag">'+bag.mine.map(function(x,i){ return '<li data-bag="m-'+x.id+'" data-where="'+x.wh+'" tabindex="0" role="checkbox"><span class="box"></span><span class="nm">'+x.it.replace(/</g,'&lt;')+'</span><span class="wh '+(x.wh==='기내'?'cab':'chk')+'">'+x.wh+'</span><button type="button" class="del" data-bdel="'+i+'" aria-label="삭제">✕</button></li>'; }).join('')+'</ul>':'';
    var all=bagItems(), n=0;
    all.forEach(function(li){ var on=!!bag.c[li.dataset.bag]; li.setAttribute('aria-checked',on); li.classList.toggle('done',on); if(on) n++;
      li.hidden=(bf==='left'&&on)||(bf!=='all'&&bf!=='left'&&li.dataset.where!==bf); });
    bagRoot.querySelectorAll('.bag-cat').forEach(function(c){ c.hidden=![].some.call(c.querySelectorAll('li'),function(li){return !li.hidden}); });
    var pct=all.length?Math.round(n/all.length*100):0;
    bagRoot.querySelector('.ring .fg').style.strokeDasharray=pct+' 100';
    bagRoot.querySelector('.bag-pct').textContent=pct+'%';
    if(bagMini) bagMini.textContent=n+' / '+all.length+' 챙김';
  }
  if(bagRoot){
    bagRoot.addEventListener('click',function(ev){
      var d=ev.target.closest('[data-bdel]'); if(d){ var it=bag.mine.splice(+d.dataset.bdel,1)[0]; if(it) delete bag.c['m-'+it.id]; LS.set(BK,bag); renderBag(); return; }
      var f=ev.target.closest('[data-bf]'); if(f){ bf=f.dataset.bf; bagRoot.querySelectorAll('[data-bf]').forEach(function(x){x.setAttribute('aria-pressed',x===f)}); renderBag(); return; }
      if(ev.target.closest('.bag-reset')){ bag.c={}; LS.set(BK,bag); renderBag(); return; }
      var li=ev.target.closest('li[data-bag]'); if(li){ bag.c[li.dataset.bag]=!bag.c[li.dataset.bag]; LS.set(BK,bag); renderBag(); } });
    bagRoot.addEventListener('keydown',function(ev){ var li=ev.target.closest('li[data-bag]'); if(li&&(ev.key===' '||ev.key==='Enter')){ ev.preventDefault(); li.click(); } });
    bagRoot.querySelector('.bag-add').addEventListener('submit',function(ev){ ev.preventDefault(); var f=new FormData(ev.target);
      bag.mine.push({id:Date.now().toString(36),it:String(f.get('it')).slice(0,40),wh:f.get('wh')}); LS.set(BK,bag); ev.target.reset(); renderBag(); });
    renderBag();
  }

  // 준비물 체크 (이 휴대폰에 저장)
  var CK='tp-ck-'+slug, ck=LS.get(CK,{}), lis=document.querySelectorAll('ul.todo li[data-ck]'), pkMini=document.querySelector('.pk-mini');
  function renderCk(){ var n=0; lis.forEach(function(li){ var on=!!ck[li.dataset.ck]; li.setAttribute('aria-checked',on); li.classList.toggle('done',on); if(on) n++; });
    if(pkMini) pkMini.textContent=n+' / '+lis.length+' 완료'; }
  lis.forEach(function(li){ var t=function(){ ck[li.dataset.ck]=!ck[li.dataset.ck]; LS.set(CK,ck); renderCk(); };
    li.addEventListener('click',t); li.addEventListener('keydown',function(e){ if(e.key===' '||e.key==='Enter'){e.preventDefault();t();} }); });
  renderCk();

  // 여행 중 모드: 지금·다음 일정
  var nc=document.querySelector('.nowcard');
  function nowMode(){
    if(!nc) return; var n=localNow(), ds=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');
    var di=-1; (C.days||[]).forEach(function(d,i){ if(d.date===ds) di=i; }); if(di<0){ nc.hidden=true; return; }
    var mins=n.getHours()*60+n.getMinutes(), bl=C.days[di].blocks, ci=-1;
    var tm=function(s){ var m=(s||'').match(/(\d{1,2}):(\d{2})/); return m?(+m[1])*60+(+m[2]):null; };
    bl.forEach(function(b,i){ var t=tm(b.time); if(t!==null&&t<=mins) ci=i; });
    var nx=bl.slice(ci+1).findIndex(function(b){return tm(b.time)!==null}); nx=nx<0?-1:ci+1+nx;
    var row=function(i,lab){ if(i<0) return ''; var b=bl[i]; return '<button type="button" class="nc-row" data-open="blk-'+(di+1)+'-'+(i+1)+'"><small>'+lab+' · '+b.time+'</small><b>'+b.place+'</b><span>'+b.what+'</span></button>'; };
    var left=nx>=0?tm(bl[nx].time)-mins:null;
    nc.innerHTML='<div class="nc-h"><span class="live"></span>여행 '+(di+1)+'일차 · 지금'+(left!==null&&left>0?'<em>다음 일정까지 '+(left>=60?Math.floor(left/60)+'시간 ':'')+(left%60)+'분</em>':'')+'</div>'+row(ci,'지금')+row(nx,'다음')+(ci<0&&nx<0?'<p class="lead">오늘 남은 일정이 없어요.</p>':'');
    nc.hidden=false;
    var go=document.querySelector('.t-go'), tgt=nx>=0?bl[nx]:(ci>=0?bl[ci]:null);
    if(go&&tgt&&tgt.place){ var dest=tgt.place.split('→').pop().trim()+' '+((C.geo||{}).city||'');
      go.href='https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(dest)+'&travelmode=transit';
      var m=go.querySelector('.go-mini'); if(m) m.textContent=tgt.place.split('→').pop().trim(); }
  }
  nowMode(); setInterval(nowMode,60000);
})();

// 오프라인: 한 번 열어 본 페이지는 인터넷이 없어도 열린다
(function(){
  if(!('serviceWorker' in navigator)) return;
  var m=document.querySelector('link[rel=manifest]'); if(!m) return;
  var sw=m.href.replace(/assets\/manifest\.webmanifest$/,'sw.js');
  window.addEventListener('load',function(){ navigator.serviceWorker.register(sw).catch(function(){}); });
})();
