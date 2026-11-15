// 미리보기: 주소 뒤에 ?now=2027-03-01T19:30 을 붙이면 그 시각인 것처럼 보여 준다
window.TPNow=function(){var q=new URLSearchParams(location.search).get('now'); return q?new Date(q):new Date();};
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
  var today=window.TPNow(); today.setHours(0,0,0,0);
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
  var t=window.TPNow(), iso=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');
  document.querySelectorAll('[data-date="'+iso+'"]').forEach(function(el){
    el.classList.add(el.tagName==='A'||el.tagName==='BUTTON'?'is-today':'today');
    if(el.tagName==='DETAILS'){ document.querySelectorAll('details.day').forEach(function(d){d.open=d===el}); }
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

// 아래 탭 바: 홈·일정·장소·준비 중 한 화면만 보여서 스크롤을 줄인다
(function(){
  var bar=document.querySelector('.tabbar'); if(!bar) return;
  // 팝업은 자기 화면이 숨겨져 있어도 열리도록 body 바로 아래로 옮긴다 (날짜 색은 미리 적어 둔다)
  document.querySelectorAll('main dialog').forEach(function(d){
    var a=d.closest('[class*="c-"]'); if(a) d.style.setProperty('--accent',getComputedStyle(a).getPropertyValue('--accent'));
    document.body.appendChild(d);
  });
  document.body.classList.add('views');
  var tabs=[].slice.call(bar.querySelectorAll('[data-tab]'));
  function view(v,keep){
    document.body.dataset.view=v;
    tabs.forEach(function(b){ if(b.dataset.tab===v) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });
    if(!keep) window.scrollTo(0,0);
    try{sessionStorage.setItem('tp-view',v)}catch(e){}
  }
  function go(id){
    var el=document.getElementById(id); if(!el) return false;
    var s=el.closest('[data-view]'); if(s) view(s.dataset.view,true);
    if(/^day\d+$/.test(id)){ var t=document.querySelector('.daytabs [data-pane="'+id+'"]'); if(t) t.click(); el=document.getElementById('detail'); }
    el.scrollIntoView(); return true;
  }
  window.TPGo=go;
  bar.addEventListener('click',function(ev){ var b=ev.target.closest('[data-tab]'); if(b) view(b.dataset.tab); });
  document.addEventListener('click',function(ev){
    var g=ev.target.closest('[data-goto]'); if(g){ var dl=g.closest('dialog[open]'); if(dl) dl.close(); go(g.dataset.goto); return; }
    var a=ev.target.closest('a[href^="#"]');
    if(a&&a.getAttribute('href').length>1&&go(a.getAttribute('href').slice(1))) ev.preventDefault();
  });
  var h=location.hash.slice(1), sv=null; try{sv=sessionStorage.getItem('tp-view')}catch(e){}
  if(!(h&&h.indexOf('=')<0&&go(h))) view(sv||'home',true);
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
  document.addEventListener('tp-picks',function(){render()});
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
    var now=window.TPNow();
    if(now>en){ el.hidden=true; return; }
    if(now>=st){ document.body.classList.add('in-trip'); el.querySelector('.cd-l').textContent='여행 중'; var d=Math.floor((now-st)/864e5)+1; el.querySelector('.cd-tiles').innerHTML='<span><b>'+d+'</b><small>일차</small></span>'; return; }
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
  var say=function(m){var t=document.querySelector('.toast'); if(!t) return; t.textContent=m; t.hidden=false; clearTimeout(say.t); say.t=setTimeout(function(){t.hidden=true},3200);};
  var tzNow=function(tz){return new Date(new Date().toLocaleString('en-US',{timeZone:tz}))};
  var q=new URLSearchParams(location.search).get('now'); // 미리보기: ?now=2027-02-27T13:30
  var localNow=function(){ return q?new Date(q):tzNow(C.timezone||'Asia/Tokyo'); };

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
  var RAIN={}, rq=+new URLSearchParams(location.search).get('rain'); // 미리보기: ?rain=70
  if(rq) (C.days||[]).forEach(function(d){RAIN[d.date]=rq});
  function loadWx(){
    if(!wx||!C.geo||wx.dataset.done) return; wx.dataset.done=1;
    var st=new Date(C.start), en=new Date(C.end), now=new Date(), days=(st-now)/864e5, url, label;
    var p='latitude='+C.geo.lat+'&longitude='+C.geo.lon+'&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FTokyo';
    if(days<=15){ url='https://api.open-meteo.com/v1/forecast?'+p+',precipitation_probability_max&start_date='+C.start+'&end_date='+C.end; label='예보'; }
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
        var pm=d.precipitation_probability_max; if(pm&&pm[i]!=null&&!rq&&C.days[i]) RAIN[C.days[i].date]=pm[i]; var pr=(C.days[i]&&RAIN[C.days[i].date])||0;
        h+='<li><span class="d">'+(i+1)+'일차 '+(dd.getMonth()+1)+'/'+dd.getDate()+'</span><span class="c">'+WMO(d.weather_code[i])+'</span><span class="tmp"><b>'+Math.round(d.temperature_2m_max[i])+'°</b> / '+Math.round(d.temperature_2m_min[i])+'°</span><span class="r">'+(pr>=30?'☂ 비 올 확률 '+pr+'% ':'')+(d.precipitation_sum[i]>0.2?d.precipitation_sum[i].toFixed(1)+'mm':'')+(pr>=50&&C.days[i]&&C.days[i].alt?' <button type="button" class="planb-btn" data-open="alt-'+(i+1)+'">플랜 B 보기</button>':'')+'</span></li>'; }
      wx.innerHTML=h+'</ul>'; nowMode();
      var mx=Math.max.apply(null,d.temperature_2m_max), mn=Math.min.apply(null,d.temperature_2m_min);
      if(wxMini&&!/지금/.test(wxMini.textContent)) wxMini.textContent=Math.round(mn)+'°~'+Math.round(mx)+'° ('+label+')';
    }).catch(function(){ wx.innerHTML='<p class="lead">날씨를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>'; });
  }
  loadWx();

  // 현지 한마디: 현지어 음성 (trip.json lang.code)
  document.addEventListener('click',function(ev){ var b=ev.target.closest('[data-say]'); if(!b||!window.speechSynthesis) return;
    var u=new SpeechSynthesisUtterance(b.dataset.say); u.lang=(C.lang||'ja-JP'); u.rate=.9; speechSynthesis.cancel(); speechSynthesis.speak(u);
    b.classList.remove('said'); void b.offsetWidth; b.classList.add('said'); });

  // 현지 시각
  var tl=document.querySelector('.tz-local'), th=document.querySelector('.tz-home');
  function clock(){ var o={hour:'2-digit',minute:'2-digit',hour12:false};
    if(tl) tl.textContent=new Date().toLocaleTimeString('ko-KR',Object.assign({timeZone:C.timezone||'Asia/Tokyo'},o));
    if(th) th.textContent=new Date().toLocaleTimeString('ko-KR',Object.assign({timeZone:'Asia/Seoul'},o)); }
  clock(); setInterval(clock,30000);

  // 함께 쓴 돈 (분류·원화·날짜별)
  var rid=function(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)};
  var EK='tp-exp-'+slug, XK='tp-exdel-'+slug, ex=LS.get(EK,[]), names=(C.travelers||[]).map(function(x){return x.name});
  var exf=document.querySelector('.exf'), exl=document.querySelector('.exlist'), exs=document.querySelector('.exsum'), exc=document.querySelector('.excat'), exMini=document.querySelector('.ex-mini');
  var krw=function(v){ return rate&&cur.symbol?' <small>₩'+fmt(v*rate)+'</small>':''; };
  ex.forEach(function(x){ if(!x.id) x.id=rid(); });
  function renderEx(){
    if(!exl) return; var s0=cur.symbol||'₩', tot=0, paid={}, byCat={}, byDay={}; names.forEach(function(n){paid[n]=0});
    ex.forEach(function(x){ tot+=x.amt; paid[x.who]=(paid[x.who]||0)+x.amt; byCat[x.cat||'기타']=(byCat[x.cat||'기타']||0)+x.amt; byDay[x.date]=(byDay[x.date]||0)+x.amt; });
    var day=null, rows=[];
    ex.map(function(x,i){return [x,i]}).reverse().forEach(function(p){ var x=p[0];
      if(x.date!==day){ day=x.date; rows.push('<li class="exday"><span>'+day+'</span><b>'+s0+fmt(byDay[day])+'</b></li>'); }
      rows.push('<li><span class="w">'+x.what.replace(/</g,'&lt;')+'<small>'+(x.cat||'기타')+' · '+x.who+(x.tf?' · 면세':'')+'</small></span><b>'+s0+fmt(x.amt)+'</b><button type="button" class="del" data-del="'+p[1]+'" aria-label="삭제">✕</button></li>'); });
    exl.innerHTML=rows.join('');
    var share=names.length?tot/names.length:0, line='';
    if(names.length===2&&tot>0){ var a=names[0],b=names[1],d=paid[a]-share;
      line=Math.abs(d)<1?'딱 반반이에요':(d>0?b+' → '+a:a+' → '+b)+' <b>'+s0+fmt(Math.abs(d))+'</b>'+krw(Math.abs(d)); }
    exs.innerHTML=ex.length?'<div><small>총 지출</small><b>'+s0+fmt(tot)+'</b>'+krw(tot)+'</div><div><small>1인당</small><b>'+s0+fmt(share)+'</b>'+krw(share)+'</div><div class="settle"><small>정산</small><span>'+line+'</span></div>':'<p class="lead" style="margin:0">아직 기록이 없어요. 위에 쓴 돈을 적어 보세요.</p>';
    var cs=Object.keys(byCat).sort(function(x,y){return byCat[y]-byCat[x]});
    exc.innerHTML=cs.length?'<div class="catbar">'+cs.map(function(c,i){return '<i style="flex:'+byCat[c]+'" class="cb'+i+'"></i>'}).join('')+'</div><div class="catleg">'+cs.map(function(c,i){return '<span><i class="cb'+i+'"></i>'+c+' '+s0+fmt(byCat[c])+'</span>'}).join('')+'</div>':'';
    var tfs=ex.filter(function(x){return x.tf}), tft=0; tfs.forEach(function(x){tft+=x.amt});
    var tfBox=document.querySelector('.extf'); if(tfBox) tfBox.innerHTML=tfs.length?'<h4>면세로 산 것 '+tfs.length+'건</h4><ul>'+tfs.map(function(x){return '<li><span>'+x.date+' '+x.what.replace(/</g,'&lt;')+'</span><b>'+s0+fmt(x.amt)+'</b></li>'}).join('')+'</ul><p>합계 <b>'+s0+fmt(tft)+'</b> · 아낀 소비세 약 '+s0+fmt(tft*.1)+'. 면세 봉투는 출국할 때까지 뜯지 않고, 영수증과 여권을 함께 챙겨요.</p>':'';
    if(exMini) exMini.textContent=ex.length?'총 '+s0+fmt(tot):'기록하고 나눠요';
  }
  if(exf){
    exf.addEventListener('click',function(ev){ var tfb=ev.target.closest('.exf-tf'); if(tfb) tfb.setAttribute('aria-pressed',tfb.getAttribute('aria-pressed')!=='true');
      var b=ev.target.closest('[data-payer]'); if(b) exf.querySelectorAll('[data-payer]').forEach(function(x){x.setAttribute('aria-pressed',x===b)});
      var c=ev.target.closest('[data-cat]'); if(c) exf.querySelectorAll('[data-cat]').forEach(function(x){x.setAttribute('aria-pressed',x===c)}); });
    exf.addEventListener('submit',function(ev){ ev.preventDefault(); var f=new FormData(exf), who=exf.querySelector('[data-payer][aria-pressed="true"]'), cat=exf.querySelector('[data-cat][aria-pressed="true"]');
      var amt=parseFloat(f.get('amt')); if(!amt) return;
      var d=localNow(); var tfb=exf.querySelector('.exf-tf'), tf=tfb&&tfb.getAttribute('aria-pressed')==='true'; if(tfb) tfb.setAttribute('aria-pressed','false');
      ex.push({id:rid(),t:Date.now(),tf:tf||undefined,what:String(f.get('what')).slice(0,40),amt:amt,who:who?who.dataset.payer:names[0],cat:cat?cat.dataset.cat:'기타',date:(d.getMonth()+1)+'/'+d.getDate()});
      LS.set(EK,ex); exf.querySelector('[name=what]').value=''; exf.querySelector('[name=amt]').value=''; renderEx(); });
    exl.addEventListener('click',function(ev){ var b=ev.target.closest('[data-del]'); if(!b) return; var gone=ex.splice(+b.dataset.del,1)[0]; if(gone) LS.set(XK,LS.get(XK,[]).concat(gone.id)); LS.set(EK,ex); renderEx(); nowMode(); });
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
      var li=ev.target.closest('li[data-bag]'); if(li){ bag.c[li.dataset.bag]=!bag.c[li.dataset.bag]; LS.set(BK,bag); renderBag(); nowMode(); } });
    bagRoot.addEventListener('keydown',function(ev){ var li=ev.target.closest('li[data-bag]'); if(li&&(ev.key===' '||ev.key==='Enter')){ ev.preventDefault(); li.click(); } });
    bagRoot.querySelector('.bag-add').addEventListener('submit',function(ev){ ev.preventDefault(); var f=new FormData(ev.target);
      bag.mine.push({id:Date.now().toString(36),it:String(f.get('it')).slice(0,40),wh:f.get('wh')}); LS.set(BK,bag); ev.target.reset(); renderBag(); });
    renderBag();
  }

  // 준비물 체크 (이 휴대폰에 저장)
  var CK='tp-ck-'+slug, ck=LS.get(CK,{}), lis=document.querySelectorAll('ul.todo li[data-ck]'), pkMini=document.querySelector('.pk-mini');
  function renderCk(){ var n=0; lis.forEach(function(li){ var on=!!ck[li.dataset.ck]; li.setAttribute('aria-checked',on); li.classList.toggle('done',on); if(on) n++; });
    if(pkMini) pkMini.textContent=n+' / '+lis.length+' 완료'; }
  lis.forEach(function(li){ var t=function(){ ck[li.dataset.ck]=!ck[li.dataset.ck]; LS.set(CK,ck); renderCk(); nowMode(); };
    li.addEventListener('click',t); li.addEventListener('keydown',function(e){ if(e.key===' '||e.key==='Enter'){e.preventDefault();t();} }); });
  renderCk();

  // 브리핑 카드: 출발 전(30일 안) · 여행 중(오늘·지금·다음·내일) — 여행자가 그날 꼭 알아야 할 것만
  var nc=document.querySelector('.nowcard');
  var tm=function(s){ var m=(s||'').match(/(\d{1,2}):(\d{2})/); return m?(+m[1])*60+(+m[2]):null; };
  var ymd=function(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  var esc=function(x){ return String(x||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]}); };
  var hm=function(m){ return (m>=60?Math.floor(m/60)+'시간 ':'')+(m%60)+'분'; };
  function spentOn(d){ var k=(d.getMonth()+1)+'/'+d.getDate(), t=0; ex.forEach(function(x){ if(x.date===k) t+=x.amt; }); return t; }
  function chip(cls,txt,open){ return '<span class="bc '+cls+'"'+(open?' data-open="'+open+'" role="button" tabindex="0"':'')+'>'+txt+'</span>'; }
  function flightFor(ds){ return (C.flights||[]).filter(function(f){return f.date===ds})[0]; }
  function nowMode(){
    if(!nc) return; var n=localNow(), ds=ymd(n), today0=new Date(ds+'T00:00:00'), st=new Date(C.start+'T00:00:00'), en=new Date(C.end+'T00:00:00');
    var mins=n.getHours()*60+n.getMinutes(), h='', sym=cur.symbol||'';
    var di=-1; (C.days||[]).forEach(function(d,i){ if(d.date===ds) di=i; });
    if(di<0 && today0<st){
      var left=Math.round((st-today0)/864e5); if(left>30){ nc.hidden=true; return; }
      var ck=document.querySelectorAll('ul.todo li[data-ck]'), ckLeft=[].filter.call(ck,function(li){return li.getAttribute('aria-checked')!=='true'}).length;
      var bagAll=bagItems().length, bagDone=[].filter.call(bagItems(),function(li){return li.classList.contains('done')}).length;
      var f=(C.flights||[])[0];
      h='<div class="nc-h"><span class="live off"></span>'+(left===1?'내일 출발해요':'출발 D-'+left+' 준비')+'</div><div class="bcs">'
        +chip(ckLeft?'warn':'ok','출발 전 확인 '+(ckLeft?ckLeft+'개 남음':'완료'))+chip(bagDone<bagAll?'':'ok','캐리어 '+(bagAll?Math.round(bagDone/bagAll*100):0)+'%','tool-bag')+'</div>';
      if(f){ var dep=tm(f.dep); h+='<div class="nc-row static"><small>'+f.airline+' '+f.no+' · '+f.dep+' 출발</small><b>'+f.from+'공항 '+String(Math.floor((dep-120)/60)).padStart(2,'0')+':'+String((dep-120)%60).padStart(2,'0')+'까지 도착</b><span>온라인 체크인은 항공사 앱에서 미리 해 두면 빨라요</span></div>'; }
      nc.innerHTML=h; nc.hidden=false; return;
    }
    if(di<0){ nc.hidden=true; return; }
    var bl=C.days[di].blocks, ci=-1;
    bl.forEach(function(b,i){ var t=tm(b.time); if(t!==null&&t<=mins) ci=i; });
    var nx=bl.slice(ci+1).findIndex(function(b){return tm(b.time)!==null}); nx=nx<0?-1:ci+1+nx;
    var row=function(i,lab,d){ if(i<0) return ''; var b=C.days[d].blocks[i];
      return '<button type="button" class="nc-row'+(lab==='지금'?' cur':'')+'" data-open="blk-'+(d+1)+'-'+(i+1)+'"><small>'+lab+' · '+esc(b.time)+'</small><b>'+esc(b.place)+'</b><span>'+esc(b.what)+'</span></button>'; };
    var left=nx>=0?tm(bl[nx].time)-mins:null;
    h='<div class="nc-h"><span class="live"></span>여행 '+(di+1)+'일차 · 지금'+(left!==null&&left>0?'<em>다음까지 '+hm(left)+'</em>':'')+'</div>';
    var rs=bl.filter(function(b){return b.fl.indexOf('rsv')>=0&&tm(b.time)>=mins-30}), cs=bl.filter(function(b){return b.fl.indexOf('cash')>=0&&tm(b.time)>=mins-30});
    var bg=(C.budget||[])[di], sp=spentOn(n);
    h+='<div class="bcs">'+rs.map(function(b){return chip('rsv','예약 '+esc(b.time.split(/[–-]/)[0])+' '+esc(b.place.split(' ')[0]))}).join('')
      +(RAIN[ds]>=50&&C.days[di].alt?chip('rain','비 올 확률 '+RAIN[ds]+'% · 플랜 B','alt-'+(di+1)):'')
      +(cs.length?chip('cash','현금 필요 '+cs.length+'곳'):'')
      +(bg?chip(sp>bg[1]?'warn':'','오늘 '+sym+fmt(sp)+' / 예산 '+sym+fmt(bg[0])+'~'+fmt(bg[1]),'tool-ex'):'')+'</div>';
    var f=flightFor(ds); if(f&&f.dep_tz===(C.timezone||'Asia/Tokyo')){ var fd=tm(f.dep), dl=fd-120-mins; h+='<div class="nc-row static fl"><small>'+f.airline+' '+f.no+' · '+f.dep+' 출발</small><b>'+(dl>0?'공항 도착까지 '+hm(dl):'지금 공항에 있어야 해요')+'</b><span>출발 2시간 전 도착 기준</span></div>'; }
    h+=row(ci,'지금',di)+row(nx,'다음',di)+(ci<0&&nx<0?'<p class="lead">오늘 남은 일정이 없어요.</p>':'');
    if(mins>=18*60&&C.days[di+1]){ var tb=C.days[di+1].blocks, fi=tb.findIndex(function(b){return tm(b.time)!==null}), tr=tb.filter(function(b){return b.fl.indexOf('rsv')>=0});
      h+='<div class="nc-tmr"><small>내일 브리핑</small>'+(fi>=0?'<b>'+esc(tb[fi].time.split(/[–-]/)[0])+' '+esc(tb[fi].place)+'</b>':'')+(tr.length?'<span>예약: '+tr.map(function(b){return esc(b.time.split(/[–-]/)[0])+' '+esc(b.place)}).join(', ')+'</span>':'')+'</div>'; }
    nc.innerHTML=h; nc.hidden=false;
    document.querySelectorAll('tr.now').forEach(function(tr){tr.classList.remove('now')});
    var cur_tr=ci>=0&&document.querySelector('tr[data-open="blk-'+(di+1)+'-'+(ci+1)+'"]'); if(cur_tr) cur_tr.classList.add('now');
    var go=document.querySelector('.t-go'), tgt=nx>=0?bl[nx]:(ci>=0?bl[ci]:null);
    if(go&&tgt&&tgt.place){ var dest=tgt.place.split('→').pop().trim()+' '+((C.geo||{}).city||'');
      go.href='https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(dest)+'&travelmode=transit';
      var m=go.querySelector('.go-mini'); if(m) m.textContent=tgt.place.split('→').pop().trim(); }
  }
  nowMode(); setInterval(nowMode,60000);

  // 여행 기록: 다녀온 곳 체크, 별점, 한 줄 메모
  var JK='tp-log-'+slug, jr=LS.get(JK,{d:{},s:{},m:{}}), logBox=document.querySelector('.log'), logMini=document.querySelector('.log-mini');
  // 사진은 휴대폰 안 저장소(IndexedDB)에 줄여서 넣는다. 서버로 올라가지 않는다
  var photos=[], thumb=function(p){ return '<button type="button" class="pic" data-pid="'+p.id+'" aria-label="사진 크게 보기"><img src="'+p.url+'" alt="" loading="lazy"></button>'; };
  var idb=null, db=function(){ return idb||(idb=new Promise(function(ok,no){ if(!window.indexedDB) return no();
    var r=indexedDB.open('tp-photos',1); r.onupgradeneeded=function(){ r.result.createObjectStore('p',{keyPath:'id'}); };
    r.onsuccess=function(){ok(r.result)}; r.onerror=no; })); };
  var tx=function(mode,fn){ return db().then(function(d){ return new Promise(function(ok,no){ var t=d.transaction('p',mode), q=fn(t.objectStore('p')); t.oncomplete=function(){ok(q&&q.result)}; t.onerror=t.onabort=no; }); }); };
  function shrink(file){ return new Promise(function(ok,no){ var img=new Image(), u=URL.createObjectURL(file);
    img.onload=function(){ var k=Math.min(1,1280/Math.max(img.width,img.height)), c=document.createElement('canvas'); c.width=Math.round(img.width*k); c.height=Math.round(img.height*k);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height); URL.revokeObjectURL(u); c.toBlob(function(b){ b?ok(b):no(); },'image/jpeg',.82); };
    img.onerror=no; img.src=u; }); }
  tx('readonly',function(s){return s.getAll()}).then(function(rows){ photos=(rows||[]).filter(function(p){return p.trip===slug}); photos.forEach(function(p){p.url=URL.createObjectURL(p.blob)}); paintJr(); }).catch(function(){});
  document.addEventListener('change',function(ev){ var inp=ev.target.closest('.jr-add input'); if(!inp||!inp.files.length) return; var id=inp.closest('.jr').dataset.jr, files=[].slice.call(inp.files,0,8);
    Promise.all(files.map(function(f){ return shrink(f).then(function(b){ var rec={id:rid(),trip:slug,blk:id,blob:b,t:Date.now()}; return tx('readwrite',function(s){return s.put(rec)}).then(function(){ rec.url=URL.createObjectURL(b); photos.push(rec); }); }); }))
      .then(function(){ jr.d[id]=true; LS.set(JK,jr); paintJr(); say('사진을 이 휴대폰에 저장했어요.'); }, function(){ paintJr(); say('사진을 저장하지 못했어요. 저장 공간을 확인해 주세요.'); });
    inp.value=''; });
  var pv=document.querySelector('.photoview'), pvId=null;
  document.addEventListener('click',function(ev){ var b=ev.target.closest('[data-pid]');
    if(b&&pv){ ev.stopPropagation(); var p=photos.filter(function(x){return x.id===b.dataset.pid})[0]; if(!p) return; pvId=p.id; pv.querySelector('img').src=p.url; if(pv.showModal) pv.showModal(); return; }
    var a=ev.target.closest('[data-pv]'); if(!a) return;
    if(a.dataset.pv==='del'&&pvId){ var gone=pvId; tx('readwrite',function(s){return s.delete(gone)}).then(function(){ photos=photos.filter(function(x){return x.id!==gone}); paintJr(); }).catch(function(){}); }
    pv.close(); },true);
  function paintJr(){
    document.querySelectorAll('.jr').forEach(function(x){ var id=x.dataset.jr;
      x.querySelector('.jr-done').setAttribute('aria-pressed',!!jr.d[id]); x.querySelector('.jr-done').textContent=jr.d[id]?'다녀왔어요 ✓':'다녀왔어요';
      x.querySelectorAll('[data-star]').forEach(function(b){ b.classList.toggle('on',+b.dataset.star<=(jr.s[id]||0)); });
      var ta=x.querySelector('textarea'); if(document.activeElement!==ta) ta.value=jr.m[id]||''; });
    document.querySelectorAll('tr[data-open^="blk-"]').forEach(function(tr){ tr.classList.toggle('visited',!!jr.d[tr.dataset.open]); });
    document.querySelectorAll('.jr').forEach(function(x){ var ps=photos.filter(function(p){return p.blk===x.dataset.jr}); x.querySelector('.jr-pics').innerHTML=ps.map(thumb).join(''); });
    var ids=Object.keys(jr.d).filter(function(k){return jr.d[k]});
    if(logMini) logMini.textContent=ids.length||photos.length?ids.length+'곳 다녀옴'+(photos.length?' · 사진 '+photos.length:''):'다녀온 곳·사진·한 줄';
    if(logBox){ var html=''; (C.days||[]).forEach(function(d,i){ var items=d.blocks.map(function(b,j){return [b,'blk-'+(i+1)+'-'+(j+1)]}).filter(function(p){return jr.d[p[1]]||jr.m[p[1]]||photos.some(function(x){return x.blk===p[1]})});
        if(!items.length) return; html+='<h4>'+(i+1)+'일차 · '+d.date.slice(5).replace('-','/')+'</h4><ul class="logl">'+items.map(function(p){ var sc=jr.s[p[1]]||0;
          return '<li data-open="'+p[1]+'" role="button" tabindex="0"><b>'+esc(p[0].place)+'</b>'+(sc?'<span class="st5">'+'★'.repeat(sc)+'<i>'+'★'.repeat(5-sc)+'</i></span>':'')+(jr.m[p[1]]?'<p>'+esc(jr.m[p[1]])+'</p>':'')+'<div class="jr-pics">'+photos.filter(function(x){return x.blk===p[1]}).map(thumb).join('')+'</div></li>'; }).join('')+'</ul>'; });
      logBox.innerHTML=html||'<p class="lead" style="margin:0">아직 기록이 없어요. 시간표에서 한 줄을 누르고 \'다녀왔어요\'를 눌러 보세요. 별점, 한 줄 메모, 사진도 남길 수 있어요.</p>'; }
  }
  document.addEventListener('click',function(ev){ var x=ev.target.closest('.jr'); if(!x) return; var id=x.dataset.jr;
    if(ev.target.closest('.jr-done')){ jr.d[id]=!jr.d[id]; LS.set(JK,jr); paintJr(); }
    var sb=ev.target.closest('[data-star]'); if(sb){ var v=+sb.dataset.star; jr.s[id]=jr.s[id]===v?0:v; if(v) jr.d[id]=true; LS.set(JK,jr); paintJr(); } });
  document.addEventListener('input',function(ev){ var ta=ev.target.closest('.jr textarea'); if(!ta) return; var id=ta.closest('.jr').dataset.jr; jr.m[id]=ta.value.slice(0,200); LS.set(JK,jr); });
  document.addEventListener('change',function(ev){ if(ev.target.closest('.jr textarea')) paintJr(); });
  paintJr();

  // 일행과 맞추기: 픽·지출·체크를 링크(# 뒤)에 담아 보낸다. 서버에는 아무것도 올라가지 않는다
  var PK='tp-picks-'+slug, myName=function(){ try{return localStorage.getItem('tp-me')||''}catch(e){return ''} };
  var b64e=function(a){ var s=''; for(var i=0;i<a.length;i++) s+=String.fromCharCode(a[i]); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); };
  var b64d=function(x){ var s=atob(x.replace(/-/g,'+').replace(/_/g,'/')), a=new Uint8Array(s.length); for(var i=0;i<s.length;i++) a[i]=s.charCodeAt(i); return a; };
  function pack(o){ var raw=new TextEncoder().encode(JSON.stringify(o)); if(!window.CompressionStream) return Promise.resolve('j'+b64e(raw));
    return new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer().then(function(b){return 'z'+b64e(new Uint8Array(b))}).catch(function(){return 'j'+b64e(raw)}); }
  function unpack(x){ var a=b64d(x.slice(1)); if(x[0]==='j') return Promise.resolve(JSON.parse(new TextDecoder().decode(a)));
    return new Response(new Blob([a]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text().then(JSON.parse); }
  var syncMe=document.querySelector('.sync-me');
  function paintSync(){ if(!syncMe) return; var me=myName();
    syncMe.innerHTML='<small>보내는 사람</small><div class="exf-who">'+(C.travelers||[]).map(function(x){ return '<button type="button" class="tone-'+(x.tone||'pri')+'" data-syncme="'+esc(x.name)+'" aria-pressed="'+(x.name===me)+'">'+esc(x.name)+'</button>'; }).join('')+'</div>'; }
  paintSync();
  var incoming=null;
  document.addEventListener('click',function(ev){
    var w=ev.target.closest('[data-syncme]'); if(w){ var pb=document.querySelector('.pp-who [data-me="'+w.dataset.syncme+'"]'); if(pb) pb.click(); paintSync(); return; }
    var b=ev.target.closest('[data-sync]'); if(!b) return;
    if(b.dataset.sync==='send'){ var me=myName(); if(!me){ say('먼저 보내는 사람을 골라 주세요.'); return; }
      pack({v:1,trip:slug,from:me,picks:LS.get(PK,{}),ex:ex,exdel:LS.get(XK,[]),ck:ck}).then(function(code){
        var url=location.origin+location.pathname+'#sync='+code, title=me+'의 여행 기록';
        if(navigator.share){ navigator.share({title:title,text:title+' (열면 내 휴대폰 기록과 합쳐져요)',url:url}).catch(function(){}); return; }
        if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function(){ say('링크를 복사했어요. 카카오톡이나 문자에 붙여 넣어 보내세요.'); },function(){ prompt('이 링크를 복사해서 보내세요',url); });
        else prompt('이 링크를 복사해서 보내세요',url); }); }
    if(b.dataset.sync==='merge'&&incoming){ var p=incoming, me2=myName(), mine=LS.get(PK,{});
      if(p.from) Object.keys(mine).forEach(function(k){ mine[k]=mine[k].filter(function(n){return n!==p.from}); if(!mine[k].length) delete mine[k]; });
      Object.keys(p.picks||{}).forEach(function(k){ (p.picks[k]||[]).forEach(function(n){ if(n===me2&&p.from) return; var a=mine[k]=mine[k]||[]; if(a.indexOf(n)<0) a.push(n); }); });
      Object.keys(mine).forEach(function(k){ if(!mine[k].length) delete mine[k]; });
      var tomb=LS.get(XK,[]).concat(p.exdel||[]).filter(function(v,i,a){return a.indexOf(v)===i}), seen={}, all=[];
      ex.concat(p.ex||[]).forEach(function(x){ if(!x||!x.id||seen[x.id]||tomb.indexOf(x.id)>=0||!(+x.amt>0)) return; seen[x.id]=1;
        all.push({id:String(x.id),t:+x.t||0,tf:x.tf?true:undefined,what:String(x.what||'').slice(0,40),amt:+x.amt,who:String(x.who||''),cat:String(x.cat||'기타'),date:String(x.date||'')}); });
      all.sort(function(a,b){return a.t-b.t});
      Object.keys(p.ck||{}).forEach(function(k){ if(p.ck[k]) ck[k]=true; });
      LS.set(PK,mine); LS.set(XK,tomb); LS.set(EK,all); LS.set(CK,ck);
      try{sessionStorage.setItem('tp-toast',(p.from||'일행')+'의 기록과 합쳤어요.')}catch(e){}
      history.replaceState(null,'',location.pathname+location.search); location.reload(); }
  });
  var syncIn=document.getElementById('sync-in');
  if(syncIn) syncIn.addEventListener('close',function(){ if(/^#sync=/.test(location.hash)) history.replaceState(null,'',location.pathname+location.search); });
  function readSync(){ var m=location.hash.match(/^#sync=([jz][\w-]+)$/), d=syncIn; if(!m||!d) return;
    unpack(m[1]).then(function(p){ if(!p||p.trip!==slug) throw 0; incoming=p;
      var np=Object.keys(p.picks||{}).filter(function(k){return !p.from||(p.picks[k]||[]).indexOf(p.from)>=0}).length, nc2=Object.keys(p.ck||{}).filter(function(k){return p.ck[k]}).length;
      var sm=d.querySelector('.sheet-h small'); if(sm) sm.textContent=(p.from||'일행')+' 님이 보냈어요';
      d.querySelector('.sync-body').innerHTML='<ul class="sync-sum"><li><b>'+np+'</b><span>픽</span></li><li><b>'+(p.ex||[]).length+'</b><span>지출</span></li><li><b>'+nc2+'</b><span>출발 전 체크</span></li></ul><p class="lead" style="margin:12px 0 0;font-size:14px">합치면 '+esc(p.from||'일행')+' 님의 픽이 최신으로 바뀌고, 지출과 체크는 양쪽 것을 모두 모아요. 내 픽은 그대로예요.</p>';
      if(d.showModal){ d.showModal(); document.body.classList.add('sheet-open'); }
    }).catch(function(){ say('이 링크는 열 수 없어요. 링크가 잘렸거나 다른 여행의 기록이에요.'); history.replaceState(null,'',location.pathname+location.search); });
   }
  readSync(); window.addEventListener('hashchange',readSync);
  try{ var tmsg=sessionStorage.getItem('tp-toast'); if(tmsg){ sessionStorage.removeItem('tp-toast'); setTimeout(function(){say(tmsg)},400); } }catch(e){}

  // 장소 찾기: 후보 전체에서 이름·종류·메모로 찾는다
  var cq=document.querySelector('.cand-q'), cres=document.querySelector('.cand-res');
  if(cq&&cres){ var cands=[].slice.call(document.querySelectorAll('dialog[id^="cg-"] .cand'));
    cq.addEventListener('input',function(){ var v=cq.value.trim().toLowerCase(); cres.textContent='';
      if(!v){ cres.hidden=true; return; }
      var hit=cands.filter(function(c){return c.textContent.toLowerCase().indexOf(v)>=0});
      hit.slice(0,40).forEach(function(c){cres.appendChild(c.cloneNode(true))});
      var note=document.createElement('p'); note.className='empty'; note.textContent=hit.length?(hit.length>40?hit.length+'곳 중 40곳만 보여요':hit.length+'곳을 찾았어요'):'찾는 곳이 없어요'; cres.prepend(note);
      cres.hidden=false; document.dispatchEvent(new Event('tp-picks')); }); }
})();

// 오프라인: 한 번 열어 본 페이지는 인터넷이 없어도 열린다
(function(){
  if(!('serviceWorker' in navigator)) return;
  var m=document.querySelector('link[rel=manifest]'); if(!m) return;
  var sw=m.href.replace(/assets\/manifest\.webmanifest$/,'sw.js');
  window.addEventListener('load',function(){ navigator.serviceWorker.register(sw).catch(function(){}); });
})();

// ---------------------------------------------------------------- 내려받기·연동: 수식 복사, 내 지출 CSV
(function(){
  var say=function(m){var t=document.querySelector('.toast'); if(!t) return; t.textContent=m; t.hidden=false; clearTimeout(say.t); say.t=setTimeout(function(){t.hidden=true},3600);};
  document.addEventListener('click',function(ev){
    var c=ev.target.closest('[data-copy]');
    if(c){ var txt=c.dataset.copy, then=c.dataset.then, win=then?window.open('about:blank','_blank'):null;
      var done=function(){ say('수식을 복사했어요. 새 시트의 A1 칸에 붙여 넣으세요.'); if(win){ try{ win.opener=null; win.location.href=then; }catch(e){} } };
      if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done,function(){ prompt('아래 수식을 복사하세요',txt); });
      else { prompt('아래 수식을 복사하세요',txt); }
      return; }
    var a=ev.target.closest('[data-act="ex-csv"]'); if(!a) return;
    var cfg=document.getElementById('trip-cfg'); if(!cfg) return; var C=JSON.parse(cfg.textContent), ex=[];
    try{ ex=JSON.parse(localStorage.getItem('tp-exp-'+C.trip)||'[]'); }catch(e){}
    if(!ex.length){ say('아직 함께 쓴 돈 기록이 없어요. 여행 도구의 \'함께 쓴 돈\'에서 적어 보세요.'); return; }
    var q=function(v){ v=String(v==null?'':v); if(/^[=+\-@\t\r]/.test(v)) v="'"+v; return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; };
    var sym=(C.currency&&C.currency.symbol)||'';
    var rows=[['날짜','내용','분류','낸 사람','금액('+sym+')','면세']].concat(ex.map(function(x){ return [x.date,x.what,x.cat||'기타',x.who,x.amt,x.tf?'면세':'']; }));
    var blob=new Blob(['﻿'+rows.map(function(r){return r.map(q).join(',')}).join('\r\n')],{type:'text/csv;charset=utf-8'});
    var u=URL.createObjectURL(blob), l=document.createElement('a'); l.href=u; l.download=C.trip+'-지출.csv'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function(){URL.revokeObjectURL(u)},4000);
    say('지출 '+ex.length+'건을 CSV로 저장했어요. 엑셀 일정표의 정산 시트에 붙여 넣어도 돼요.');
  });
})();

// ---------------------------------------------------------------- 여행 리포트: 이 휴대폰의 지출·픽·기록으로 차트를 그린다
(function(){
  var box=document.querySelector('.rep'), cfgEl=document.getElementById('trip-cfg'); if(!box||!cfgEl) return;
  var C=JSON.parse(cfgEl.textContent), slug=C.trip, sym=(C.currency&&C.currency.symbol)||'₩', rate=((C.currency||{}).fallback_krw_per_100||0)/100;
  var names=(C.travelers||[]).map(function(x){return x.name});
  var get=function(k,d){ try{ var v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } };
  var fmt=function(n){ return Math.round(n).toLocaleString('ko-KR'); };
  var esc=function(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]}); };
  var md=function(ds){ var p=ds.split('-'); return (+p[1])+'/'+(+p[2]); };
  var NS='http://www.w3.org/2000/svg';
  function tipOn(viz){ var tip=viz.querySelector('.tip');
    viz.addEventListener('pointerover',function(ev){ var h=ev.target.closest('[data-tip]'); if(!h) return; var r=viz.getBoundingClientRect(), b=h.getBoundingClientRect();
      tip.textContent=''; h.dataset.tip.split('|').forEach(function(t,i){ if(i) tip.appendChild(document.createElement('br')); tip.appendChild(document.createTextNode(t)); }); tip.style.left=Math.min(Math.max(b.left-r.left+b.width/2,70),r.width-70)+'px'; tip.style.top=(b.top-r.top)+'px'; tip.classList.add('on'); });
    viz.addEventListener('pointerout',function(ev){ if(ev.target.closest('[data-tip]')) tip.classList.remove('on'); }); }
  // 세로 막대 + 예상 범위(회색 띠). 1인 기준
  function dayChart(rows){
    var W=340,H=170,L=34,B=22,T=10, n=rows.length, max=1;
    rows.forEach(function(r){ max=Math.max(max,r.v,r.hi||0); });
    var step=Math.pow(10,Math.floor(Math.log10(max))), top=Math.ceil(max/step)*step; if(top/step<3) { step/=2; top=Math.ceil(max/step)*step; }
    var y=function(v){ return T+(H-T-B)*(1-v/top); }, bw=(W-L)/n, s='';
    for(var g=0; g<=top+1e-9; g+=step){ s+='<line class="grid" x1="'+L+'" x2="'+W+'" y1="'+y(g)+'" y2="'+y(g)+'"/><text x="'+(L-6)+'" y="'+(y(g)+4)+'" text-anchor="end">'+(g>=1000?(g/1000)+'k':g)+'</text>'; }
    rows.forEach(function(r,i){ var cx=L+bw*i+bw/2, w=Math.min(26,bw*.46);
      if(r.hi) s+='<rect x="'+(cx-w*.9)+'" y="'+y(r.hi)+'" width="'+(w*1.8)+'" height="'+Math.max(2,y(r.lo)-y(r.hi))+'" rx="4" fill="var(--fill)" stroke="var(--label3)" stroke-dasharray="3 2"/>';
      if(r.v>0) s+='<path d="M'+(cx-w/2)+','+y(0)+'V'+(y(r.v)+4)+'q0,-4 4,-4h'+(w-8)+'q4,0 4,4V'+y(0)+'z" fill="var(--viz-1)"/>';
      s+='<text x="'+cx+'" y="'+(H-6)+'" text-anchor="middle">'+r.label+'</text>';
      s+='<rect class="hit" x="'+(L+bw*i)+'" y="0" width="'+bw+'" height="'+(H-B)+'" data-tip="'+esc(r.label)+'|실제 1인 '+sym+fmt(r.v)+(r.hi?'|예상 '+sym+fmt(r.lo)+'~'+fmt(r.hi):'')+'"/>'; });
    return '<div class="viz"><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="날짜별 1인 지출과 예상 범위">'+s+'</svg><div class="tip"></div></div>'
      +'<div class="viz-leg"><span><i style="background:var(--viz-1)"></i>실제 지출 (1인)</span><span><i class="rng"></i>예상 범위</span></div>';
  }
  // 가로 막대 (한 가지 색, 값은 막대 끝에)
  function hbars(rows,unit){
    var W=340,rh=28,L=78,max=1; rows.forEach(function(r){max=Math.max(max,r.v)}); var H=rows.length*rh, s='';
    rows.forEach(function(r,i){ var w=r.v>0?Math.max(8,(W-L-70)*r.v/max):0, yy=i*rh+6;
      s+='<text class="lab" x="0" y="'+(yy+12)+'">'+esc(r.label)+'</text>'+(w?'<path d="M'+L+','+yy+'h'+(w-4)+'q4,0 4,4v8q0,4 -4,4h-'+(w-4)+'z" fill="'+(r.c||'var(--viz-1)')+'"/>':'')
        +'<text x="'+(L+w+6)+'" y="'+(yy+12)+'">'+unit+fmt(r.v)+'</text><rect class="hit" x="0" y="'+(i*rh)+'" width="'+W+'" height="'+rh+'" data-tip="'+esc(r.label)+' '+unit+fmt(r.v)+(r.sub?'|'+esc(r.sub):'')+'"/>'; });
    return '<div class="viz"><svg viewBox="0 0 '+W+' '+H+'" role="img">'+s+'</svg><div class="tip"></div></div>';
  }
  // 100% 가로 띠 (3칸까지, 칸 사이 2px 틈)
  function stack(parts){
    var tot=0; parts.forEach(function(p){tot+=p.v}); if(!tot) return '';
    var W=340,x=0,s='';
    parts.forEach(function(p){ if(!p.v) return; var w=(W-2*(parts.length-1))*p.v/tot;
      s+='<rect x="'+x+'" y="0" width="'+Math.max(w,2)+'" height="22" rx="4" fill="'+p.c+'" data-tip="'+esc(p.label)+' '+p.v+'곳"/>'; x+=w+2; });
    return '<div class="viz"><svg viewBox="0 0 '+W+' 22" role="img" aria-label="픽 나눔">'+s+'</svg><div class="tip"></div></div>'
      +'<div class="viz-leg">'+parts.map(function(p){return '<span><i style="background:'+p.c+'"></i>'+esc(p.label)+' '+p.v+'곳</span>'}).join('')+'</div>';
  }
  function render(){
    var ex=get('tp-exp-'+slug,[]), picks=get('tp-picks-'+slug,{}), jr=get('tp-log-'+slug,{d:{},s:{},m:{}});
    var tot=0, byDay={}, byCat={}, paid={}; names.forEach(function(n){paid[n]=0});
    ex.forEach(function(x){ tot+=x.amt; byDay[x.date]=(byDay[x.date]||0)+x.amt; byCat[x.cat||'기타']=(byCat[x.cat||'기타']||0)+x.amt; paid[x.who]=(paid[x.who]||0)+x.amt; });
    var per=names.length?tot/names.length:tot;
    var visited=Object.keys(jr.d||{}).filter(function(k){return jr.d[k]}), stars=Object.keys(jr.s||{}).map(function(k){return jr.s[k]}).filter(Boolean);
    var avg=stars.length?stars.reduce(function(a,b){return a+b},0)/stars.length:0, nblk=0; (C.days||[]).forEach(function(d){nblk+=d.blocks.length});
    var both=0, solo={}; names.forEach(function(n){solo[n]=0});
    Object.keys(picks).forEach(function(p){ var w=picks[p]||[]; if(w.length>1) both++; else if(w.length===1) solo[w[0]]=(solo[w[0]]||0)+1; });
    var npick=Object.keys(picks).filter(function(p){return (picks[p]||[]).length}).length;
    var aiHit=0; document.querySelectorAll('.pickbar[data-pick]').forEach(function(b){ if(b.querySelector('.ai')&&(picks[b.dataset.pick]||[]).length) aiHit++; });
    var h='<div class="rep-tiles">'
      +'<div class="rep-tile"><small>함께 쓴 돈</small><b>'+sym+fmt(tot)+'</b><span>'+(rate&&tot?'₩'+fmt(tot*rate):ex.length+'건')+'</span></div>'
      +'<div class="rep-tile"><small>1인당</small><b>'+sym+fmt(per)+'</b><span>'+(rate&&per?'₩'+fmt(per*rate):names.length+'명 기준')+'</span></div>'
      +'<div class="rep-tile"><small>다녀온 곳</small><b>'+visited.length+'<span> / '+nblk+'</span></b><span>'+(avg?'평균 ★'+avg.toFixed(1):'별점 없음')+'</span></div>'
      +'<div class="rep-tile"><small>우리의 픽</small><b>'+npick+'곳</b><span>둘 다 '+both+' · AI 추천과 겹침 '+aiHit+'</span></div></div>';
    // 날짜별
    var rows=(C.days||[]).map(function(d,i){ var k=md(d.date), b=(C.budget||[])[i]||[]; return {label:k, v:(byDay[k]||0)/(names.length||1), lo:b[0]||0, hi:b[1]||0}; });
    h+='<div><h4>날짜별 1인 지출</h4><p class="cap">회색 띠는 계획한 1인 식비·입장료 범위예요. 막대를 누르면 금액이 보여요.</p>'+dayChart(rows)+'</div>';
    var cats=Object.keys(byCat).sort(function(a,b){return byCat[b]-byCat[a]});
    h+='<div><h4>어디에 썼나</h4>'+(cats.length?hbars(cats.map(function(c){return {label:c,v:byCat[c],sub:Math.round(byCat[c]/tot*100)+'%'}}),sym):'<p class="empty">함께 쓴 돈을 기록하면 분류별로 보여요.</p>')+'</div>';
    if(names.length>1&&tot) h+='<div><h4>누가 냈나</h4>'+hbars(names.map(function(n,i){return {label:n,v:paid[n]||0,c:i?'var(--viz-2)':'var(--viz-1)'}}),sym)+'</div>';
    var tones=['var(--viz-3)','var(--viz-1)','var(--viz-2)'];
    var parts=[{label:'둘 다',v:both,c:tones[0]}].concat(names.slice(0,2).map(function(n,i){return {label:n+'만',v:solo[n]||0,c:tones[i+1]}}));
    h+='<div><h4>픽 나눔</h4>'+(npick?stack(parts):'<p class="empty">장소 탭에서 하트를 누르면 누가 고른 곳인지 나뉘어 보여요.</p>')+'</div>';
    var dv=(C.days||[]).map(function(d,i){ var n=0; d.blocks.forEach(function(_,j){ if(jr.d['blk-'+(i+1)+'-'+(j+1)]) n++; }); return {label:(i+1)+'일차 '+md(d.date), v:n, sub:d.blocks.length+'줄 중'}; });
    h+='<div><h4>날짜별 다녀온 곳</h4>'+(visited.length?hbars(dv,''):'<p class="empty">시간표 한 줄을 누르고 \'다녀왔어요\'를 누르면 쌓여요.</p>')+'</div>';
    h+='<details><summary>표로 보기</summary><table><thead><tr><th>날짜</th><th>1인 실제</th><th>1인 예상</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td>'+r.label+'</td><td class="n">'+sym+fmt(r.v)+'</td><td class="n">'+(r.hi?sym+fmt(r.lo)+'~'+fmt(r.hi):'-')+'</td></tr>'}).join('')+'</tbody></table></details>';
    box.innerHTML=h; box.querySelectorAll('.viz').forEach(tipOn);
  }
  document.addEventListener('click',function(ev){ if(ev.target.closest('[data-open="tool-rep"]')) render(); });
  if(location.hash==='#report') render();
})();

// ---------------------------------------------------------------- 앨범 카드: 여행 기록 사진으로 SNS·포토북 카드를 그린다 (사진은 휴대폰 밖으로 나가지 않음)
(function(){
  var root=document.querySelector('.alb'), cfgEl=document.getElementById('trip-cfg'); if(!root||!cfgEl) return;
  var C=JSON.parse(cfgEl.textContent), slug=C.trip, cv=root.querySelector('canvas'), ctx=cv.getContext('2d'), sel=root.querySelector('select'), note=root.querySelector('.alb-note');
  var FMT={post:[1080,1350],story:[1080,1920],cover:[1500,1500]}, fmt='post', photos=[], imgs={}, seed=0;
  var title=(document.querySelector('.hero h1')||{}).textContent||'', short=document.title.replace(/ 여행$/,'');
  var FONT='-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Pretendard Variable","Noto Sans KR",sans-serif';
  var md=function(ds){ var p=ds.split('-'), w='일월화수목금토'[new Date(ds+'T12:00:00').getDay()]; return (+p[1])+'.'+(+p[2])+' '+w; };
  sel.innerHTML='<option value="all">여행 전체</option>'+(C.days||[]).map(function(d,i){return '<option value="'+(i+1)+'">'+(i+1)+'일차 · '+md(d.date)+'</option>'}).join('');
  function load(){ return new Promise(function(ok){ if(!window.indexedDB) return ok([]); var r=indexedDB.open('tp-photos',1);
    r.onupgradeneeded=function(){ r.result.createObjectStore('p',{keyPath:'id'}); };
    r.onsuccess=function(){ try{ var q=r.result.transaction('p','readonly').objectStore('p').getAll(); q.onsuccess=function(){ ok((q.result||[]).filter(function(p){return p.trip===slug})); }; q.onerror=function(){ok([])}; }catch(e){ ok([]); } };
    r.onerror=function(){ok([])}; }); }
  function img(p){ if(imgs[p.id]) return imgs[p.id]; return imgs[p.id]=new Promise(function(ok){ var i=new Image(); i.onload=function(){ok(i)}; i.onerror=function(){ok(null)}; i.src=URL.createObjectURL(p.blob); }); }
  function cover(i,x,y,w,h,r){ ctx.save(); ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.clip(); var k=Math.max(w/i.width,h/i.height), iw=i.width*k, ih=i.height*k; ctx.drawImage(i,x+(w-iw)/2,y+(h-ih)/2,iw,ih); ctx.restore(); }
  function css(v){ return getComputedStyle(document.body).getPropertyValue(v).trim(); }
  var gen=0;
  function draw(){
    var my=++gen;
    var wh=FMT[fmt], W=wh[0], H=wh[1];
    var day=sel.value, jr={d:{},s:{}}; try{ jr=JSON.parse(localStorage.getItem('tp-log-'+slug)||'{"d":{},"s":{}}'); }catch(e){}
    var ps=photos.filter(function(p){ return day==='all'||p.blk.indexOf('blk-'+day+'-')===0; });
    if(ps.length>1){ var s=seed; ps=ps.slice().sort(function(a,b){ return ((a.t*9301+s*49297)%233280)-((b.t*9301+s*49297)%233280); }); }
    return Promise.all(ps.slice(0,Math.min(ps.length,fmt==='story'?5:4)).map(img)).then(function(is0){ if(my!==gen) return; cv.width=W; cv.height=H;
    var pri=css('--pri')||'#24346b', acc=css('--acc')||'#c13d69';
    if(matchMedia('(prefers-color-scheme: dark)').matches){ pri='#24346b'; } // 카드 색은 늘 짙은 쪽
    var g=ctx.createLinearGradient(0,0,W*.4,H); g.addColorStop(0,pri); g.addColorStop(1,'#0b0f1c'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    var rg=ctx.createRadialGradient(W*.9,H*.05,0,W*.9,H*.05,W*.7); rg.addColorStop(0,acc+'88'); rg.addColorStop(1,'transparent'); ctx.fillStyle=rg; ctx.fillRect(0,0,W,H);
    var P=Math.round(W*.07), y=P, d=day==='all'?null:C.days[+day-1];
    ctx.fillStyle='rgba(255,255,255,.72)'; ctx.font='600 '+Math.round(W*.028)+'px '+FONT; ctx.textBaseline='top';
    ctx.fillText((d?day+'일차 · '+md(d.date):C.start.replace(/-/g,'.')+' — '+C.end.slice(5).replace('-','.')).toUpperCase(),P,y); y+=W*.05;
    ctx.fillStyle='#fff'; ctx.font='800 '+Math.round(W*(fmt==='cover'?.085:.075))+'px '+FONT;
    var head=d?(document.querySelector('[data-pane="day'+day+'"]')?(document.getElementById('day'+day).querySelector('.dayhead .t')||{}).textContent.replace(/^.*?\)\s*/,''):short):title;
    wrap(head||short,P,y,W-2*P,W*.088).forEach(function(l){ ctx.fillText(l.t,P,l.y); y=l.y+W*.088; }); y+=W*.025;
    var areaH=H-y-P-W*(fmt==='story'?.36:.2), n=Math.min(ps.length,fmt==='story'?5:4), gap=Math.round(W*.014);
    return Promise.resolve(is0).then(function(is){ is=is.filter(Boolean);
      if(!is.length){ ctx.fillStyle='rgba(255,255,255,.08)'; ctx.beginPath(); ctx.roundRect(P,y,W-2*P,areaH,W*.03); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.55)'; ctx.font='500 '+Math.round(W*.03)+'px '+FONT; ctx.fillText('여행 기록에 사진을 넣으면 여기에 담겨요',P+W*.04,y+areaH/2-W*.02); }
      else layout(is,P,y,W-2*P,areaH,gap,W*.03);
      y+=areaH+W*.04;
      // 다녀온 곳 목록
      var list=[]; (C.days||[]).forEach(function(dd,i){ if(d&&dd!==d) return; dd.blocks.forEach(function(b,j){ var id='blk-'+(i+1)+'-'+(j+1); if(jr.d&&jr.d[id]&&b.place&&b.place!=='미정') list.push([b.place,(jr.s||{})[id]||0]); }); });
      if(!list.length) (d?d.blocks:[]).forEach(function(b){ if(/식사|아침|점심|저녁|활동|카페/.test(b.type)&&list.length<6) list.push([b.place,0]); });
      ctx.font='600 '+Math.round(W*.03)+'px '+FONT; ctx.fillStyle='#fff';
      var line=list.slice(0,fmt==='story'?8:5).map(function(x){return x[0]+(x[1]?' '+'★'.repeat(x[1]):'')});
      wrap(line.join('  ·  '),P,y,W-2*P,W*.044).slice(0,fmt==='story'?6:3).forEach(function(l){ ctx.fillText(l.t,P,l.y); });
      ctx.fillStyle='rgba(255,255,255,.6)'; ctx.font='600 '+Math.round(W*.024)+'px '+FONT; ctx.textBaseline='bottom'; ctx.fillText('여행 플래너 · '+short,P,H-P*.7);
      note.textContent=photos.length?'사진 '+photos.length+'장 중 '+Math.min(is.length,n)+'장을 담았어요. \'사진 섞기\'로 바꿀 수 있어요.':'아직 사진이 없어요. 시간표 한 줄을 눌러 \'사진 추가\'로 넣으면 카드에 담겨요.';
    });
  }); }
  function layout(is,x,y,w,h,g,r){
    if(is.length===1) return cover(is[0],x,y,w,h,r);
    if(is.length===2){ var hw=(w-g)/2; cover(is[0],x,y,hw,h,r); cover(is[1],x+hw+g,y,hw,h,r); return; }
    var big=h*.62; cover(is[0],x,y,w,big,r); var rest=is.slice(1), cw=(w-g*(rest.length-1))/rest.length;
    rest.forEach(function(i,k){ cover(i,x+k*(cw+g),y+big+g,cw,h-big-g,r); });
  }
  function wrap(text,x,y,maxW,lh){ var out=[], cur=''; String(text).split('').forEach(function(ch){ if(ctx.measureText(cur+ch).width>maxW&&cur){ out.push({t:cur,y:y}); y+=lh; cur=ch.trim()?ch:''; } else cur+=ch; }); if(cur) out.push({t:cur,y:y}); return out; }
  function blob(){ return new Promise(function(ok){ cv.toBlob(ok,'image/jpeg',.92); }); }
  var name=function(){ return slug+'-'+(sel.value==='all'?'전체':sel.value+'일차')+'-'+fmt+'.jpg'; };
  root.addEventListener('click',function(ev){
    var f=ev.target.closest('[data-fmt]'); if(f){ fmt=f.dataset.fmt; root.querySelectorAll('[data-fmt]').forEach(function(b){b.setAttribute('aria-pressed',b===f)}); draw(); return; }
    var a=ev.target.closest('[data-alb]'); if(!a) return;
    if(a.dataset.alb==='shuffle'){ seed++; draw(); return; }
    blob().then(function(b){ if(!b) return; var file=new File([b],name(),{type:'image/jpeg'});
      if(a.dataset.alb==='share'&&navigator.canShare&&navigator.canShare({files:[file]})) return navigator.share({files:[file],title:short+' 여행'}).catch(function(){});
      var u=URL.createObjectURL(b), l=document.createElement('a'); l.href=u; l.download=name(); document.body.appendChild(l); l.click(); l.remove(); setTimeout(function(){URL.revokeObjectURL(u)},4000); });
  });
  sel.addEventListener('change',draw);
  document.addEventListener('click',function(ev){ if(ev.target.closest('[data-open="tool-alb"]')) load().then(function(p){ photos=p; draw(); }); });
})();

// ---------------------------------------------------------------- 쇼핑 리스트: 분류 걸러 보기, 담기·합계 (이 휴대폰에 저장)
(function(){
  var cfgEl=document.getElementById('shop-cfg'); if(!cfgEl) return;
  var C=JSON.parse(cfgEl.textContent), K='tp-shop-'+C.trip, mine={};
  try{ mine=JSON.parse(localStorage.getItem(K)||'{}'); }catch(e){}
  var cards=[].slice.call(document.querySelectorAll('.shop')), f='all';
  var fmt=function(n){ return Math.round(n).toLocaleString('ko-KR'); };
  function paint(){ var n=0, y=0;
    cards.forEach(function(c){ var on=!!mine[c.dataset.id], b=c.querySelector('.shop-add'); b.setAttribute('aria-pressed',on); b.textContent=on?'담았어요 ✓':'담기';
      if(on){ n++; y+=+c.dataset.yen||0; } c.hidden=!(f==='all'||(f==='mine'?on:c.dataset.cat===f)); });
    document.querySelector('.ss-n').textContent=n+'개'; document.querySelector('.ss-y').textContent='¥'+fmt(y);
    document.querySelector('.ss-w').textContent=C.rate&&y?'≈ ₩'+fmt(y*C.rate):''; }
  document.addEventListener('click',function(ev){
    var b=ev.target.closest('[data-f]'); if(b){ f=b.dataset.f; document.querySelectorAll('[data-f]').forEach(function(x){x.setAttribute('aria-pressed',x===b)}); paint(); return; }
    var a=ev.target.closest('.shop-add'); if(a){ var id=a.closest('.shop').dataset.id; if(mine[id]) delete mine[id]; else mine[id]=1; try{localStorage.setItem(K,JSON.stringify(mine))}catch(e){} paint(); return; }
    var big=document.querySelector('.bigshow'), s=ev.target.closest('[data-big]');
    if(s&&big){ big.querySelector('b').textContent=s.dataset.big; big.querySelector('small').textContent=s.dataset.bigko+' 있나요? · これはありますか?'; big.showModal(); return; }
    if(big&&big.open&&ev.target.closest('.bigshow')) big.close();
  });
  paint();
})();
