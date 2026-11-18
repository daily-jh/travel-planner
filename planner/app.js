// 미리보기: 주소 뒤에 ?now=2027-03-01T19:30 을 붙이면 그 시각인 것처럼 보여 준다
window.TPNow=function(){var q=new URLSearchParams(location.search).get('now'); return q?new Date(q):new Date();};
// 날짜별 지도: 동선 번호를 누르면 아래 지도가 그 장소로 바뀐다
document.querySelectorAll('.route').forEach(function(card){
  var box=card.querySelector('.mapbox'), frame=card.querySelector('iframe'), cap=card.querySelector('.mapcap b');
  if(!frame) return;
  frame.addEventListener('load',function(){box.classList.remove('loading')});
  var lb=box.querySelector('.map-load');
  if(lb) lb.addEventListener('click',function(){ box.classList.remove('idle'); box.classList.add('loading'); frame.src=frame.dataset.src; lb.remove(); });
  card.querySelectorAll('li a[data-q]').forEach(function(a){
    a.addEventListener('click',function(ev){
      if(ev.metaKey||ev.ctrlKey||ev.shiftKey) return;
      if(box.classList.contains('idle')) return; // 지도를 아직 안 불러왔으면 구글 지도 앱으로 연다
      ev.preventDefault();
      box.classList.add('loading');
      frame.src='https://maps.google.com/maps?q='+encodeURIComponent(a.dataset.q)+'&z=15&hl=ko&output=embed';
      cap.textContent=a.dataset.label;
      var mo=card.querySelector('.mapopen'); if(mo) mo.href=a.href;
      card.querySelectorAll('li a').forEach(function(x){x.classList.remove('on')});
      a.classList.add('on');
    });
  });
});

// 네이버 지도: 휴대폰에서는 네이버 지도 앱으로 연다 (국내 여행). 앱이 없으면 웹 지도로.
// - map.naver.com/p/search/<검색어> 링크 → nmap://search
// - data-nmap 이 있는 링크(좌표가 있는 길찾기) → 그 nmap:// 주소, 안 되면 원래 href
(function(){
  var ua=navigator.userAgent, android=/Android/i.test(ua), ios=/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  if(!android&&!ios) return;
  var KEY='tp-nmap-missing', missing=function(){ try{return localStorage.getItem(KEY)==='1'}catch(e){return false} };
  var APP=encodeURIComponent(location.hostname||'travel-planner');
  document.addEventListener('click',function(ev){
    var a=ev.target.closest&&ev.target.closest('a[href]'); if(!a||ev.metaKey||ev.ctrlKey||a.closest('.route ol')) return; // 동선 번호는 아래 지도를 바꾼다
    var app=a.dataset.nmap||'', m=a.href.match(/^https:\/\/map\.naver\.com\/p\/search\/([^?#]+)/);
    if(!app&&m) app='nmap://search?query='+m[1];
    if(!app||(ios&&missing())) return;
    app+=(app.indexOf('?')<0?'?':'&')+'appname='+APP;
    ev.preventDefault(); ev.stopPropagation();
    var web=a.href;
    if(android){ // 안드로이드: 앱이 없으면 브라우저가 바로 웹 주소로 간다
      location.href='intent://'+app.slice(7)+'#Intent;scheme=nmap;package=com.nhn.android.nmap;S.browser_fallback_url='+encodeURIComponent(web)+';end';
      return; }
    var left=false, gone=function(){ if(document.hidden) left=true; };
    document.addEventListener('visibilitychange',gone);
    location.href=app;
    setTimeout(function(){ document.removeEventListener('visibilitychange',gone);
      if(!left&&!document.hidden){ try{localStorage.setItem(KEY,'1')}catch(e){} location.href=web; } },1400);
  },true);
})();

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
  // 움직이는 표시: 고른 탭 뒤의 둥근 배경이 미끄러져 옮겨 간다
  var ind=document.createElement('span'); ind.className='tb-ind'; ind.setAttribute('aria-hidden','true'); bar.insertBefore(ind,bar.firstChild);
  function slide(){ var b=bar.querySelector('[aria-current="page"]'); if(!b) return; ind.style.width=b.offsetWidth+'px'; ind.style.transform='translateX('+b.offsetLeft+'px)'; }
  window.addEventListener('resize',slide);
  // 화면마다 보던 위치를 기억해 다시 돌아오면 그 자리로
  var pos={};
  function view(v,keep){
    var prev=document.body.dataset.view;
    if(prev&&prev!==v) pos[prev]=window.scrollY;
    var order=tabs.map(function(b){return b.dataset.tab});
    document.body.dataset.vdir=prev&&order.indexOf(v)<order.indexOf(prev)?'back':'fwd';
    document.body.dataset.view=v;
    tabs.forEach(function(b){ if(b.dataset.tab===v) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });
    slide(); if(prev) bar.classList.add('tb-ready');
    if(!keep) window.scrollTo(0,pos[v]||0);
    try{sessionStorage.setItem('tp-view',v)}catch(e){}
  }
  function go(id){
    var el=document.getElementById(id); if(!el) return false;
    var s=el.closest('[data-view]'); if(s) view(s.dataset.view,true);
    if(/^day\d+$/.test(id)){ var t=document.querySelector('.daytabs [data-pane="'+id+'"]'); if(t) t.click(); el=document.getElementById('detail'); }
    el.scrollIntoView(); return true;
  }
  window.TPGo=go;
  bar.addEventListener('click',function(ev){ var b=ev.target.closest('[data-tab]'); if(!b) return;
    // 지금 탭을 한 번 더 누르면 맨 위로 (휴대폰 앱과 같은 약속)
    if(b.dataset.tab===document.body.dataset.view){ pos[b.dataset.tab]=0; window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}); return; }
    view(b.dataset.tab); });
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
    if(!shared){ try{saved=JSON.parse(lsGet(LS)||'{}')}catch(e){saved={}} seed(); return Promise.resolve(); }
    return fetch(sb.url+'/rest/v1/picks?select=place,person&trip=eq.'+encodeURIComponent(trip),{headers:hdr()})
      .then(function(r){if(!r.ok) throw r; return r.json();})
      .then(function(rows){saved={}; rows.forEach(function(r){(saved[r.place]=saved[r.place]||[]).push(r.person)});})
      .catch(function(){toast('픽을 불러오지 못했어요. 잠시 뒤 새로고침해 주세요.')});
  }
  // trip.json default_picks: 일정을 짠 사람의 픽을 처음 한 번만 채운다. 그 뒤 지우거나 고친 건 그대로 둔다
  function seed(){
    var dp=cfg.default_picks; if(!dp||!dp.picks) return;
    var SK=LS+'-seed'; if(lsGet(SK)===dp.version) return;
    Object.keys(dp.picks).forEach(function(n){ if(!tones[n]) return; (dp.picks[n]||[]).forEach(function(p){ var a=saved[p]=saved[p]||[]; if(a.indexOf(n)<0) a.push(n); }); });
    lsSet(LS,JSON.stringify(saved)); lsSet(SK,dp.version);
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
  window.tpRain=RAIN; // planner/comfort.js 가 '오늘 챙길 것'에 우산을 더할 때 읽는다
  function loadWx(){
    if(!wx||!C.geo||wx.dataset.done) return; wx.dataset.done=1;
    var st=new Date(C.start), en=new Date(C.end), now=new Date(), days=(st-now)/864e5, url, label;
    var p='latitude='+C.geo.lat+'&longitude='+C.geo.lon+'&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone='+encodeURIComponent(C.timezone||'Asia/Tokyo')+'';
    if(days<=15){ url='https://api.open-meteo.com/v1/forecast?'+p+',precipitation_probability_max&start_date='+C.start+'&end_date='+C.end; label='예보'; }
    else { var y=function(s){var d=new Date(s);d.setFullYear(d.getFullYear()-1);return d.toISOString().slice(0,10)}; url='https://archive-api.open-meteo.com/v1/archive?'+p+'&start_date='+y(C.start)+'&end_date='+y(C.end); label='작년 같은 날'; }
    var nowBox=document.createElement('div'); nowBox.className='wxnow'; wx.before(nowBox);
    fetch('https://api.open-meteo.com/v1/forecast?latitude='+C.geo.lat+'&longitude='+C.geo.lon+'&current=temperature_2m,apparent_temperature,weather_code,precipitation,wind_speed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone='+encodeURIComponent(C.timezone||'Asia/Tokyo')+'')
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
      wx.innerHTML=h+'</ul>'; nowMode(); document.dispatchEvent(new Event('tp-rain'));
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
  // 공금: 커플통장·트래블카드(원)와 현금(현지 돈) 두 지갑. 넣은 돈에서 '공금 카드/현금'으로 낸 지출을 뺀다
  var POOLK='tp-pool-'+slug, pool=LS.get(POOLK,{card:0,cash:0}), editing={}, POOL={'공금카드':'card','공금현금':'cash'};
  var isPool=function(w){ return !!POOL[w]; }, whoName=function(w){ return w==='공금카드'?'공금 카드':w==='공금현금'?'공금 현금':w; };
  var toKrw=function(v){ return cur.symbol&&cur.symbol!=='₩'?(rate?v*rate:0):v; };
  function renderPool(){
    var s0=cur.symbol||'₩', local=s0!=='₩', sp={card:0,cash:0}; ex.forEach(function(x){ var k=POOL[x.who]; if(k) sp[k]+=x.amt; });
    var W=[{k:'card',name:'커플통장·트래블카드',unit:'₩',put:pool.card||0,used:toKrw(sp.card),usedL:sp.card},{k:'cash',name:'현금'+(local?' ('+(cur.name||s0)+')':''),unit:s0,put:pool.cash||0,used:sp.cash,usedL:sp.cash}];
    var allPut=(pool.card||0)+toKrw(pool.cash||0), allLeft=allPut-toKrw(sp.card)-toKrw(sp.cash);
    var need=C.need&&rate&&local?[C.need[0]*rate,C.need[1]*rate]:(C.need&&!local?C.need:null);
    var h='<div class="pool-h"><h3>공금</h3><span>남은 돈 <b>₩'+fmt(allLeft)+'</b></span></div><div class="pool-w">'+W.map(function(w){ var left=w.put-w.used, pct=w.put?Math.min(100,Math.max(0,w.used/w.put*100)):0;
      var ed=editing[w.k]||!w.put, val=ed?'<label class="pw-in"><span>넣은 돈 '+w.unit+'</span><input type="number" inputmode="numeric" min="0" step="1000" enterkeyhint="done" data-pool-in="'+w.k+'" value="'+(w.put||'')+'" placeholder="0" aria-label="'+w.name+' 넣은 돈"></label><button type="button" class="btn primary pw-save" data-pool-save="'+w.k+'">저장</button>'
        :'<span class="pw-amt"><small>넣은 돈</small><b>'+w.unit+fmt(w.put)+'</b><em>✓ 저장됨</em></span><button type="button" class="btn pw-edit" data-pool-edit="'+w.k+'">수정</button>';
      return '<div class="pw pw-'+w.k+(left<0?' over':'')+'"><div class="pw-t"><b>'+w.name+'</b><div class="pw-v">'+val+'</div></div>'
        +'<div class="pw-bar"><i style="width:'+pct.toFixed(1)+'%"></i></div>'
        +'<div class="pw-n"><span>쓴 돈 '+(w.k==='card'&&local?s0+fmt(w.usedL)+' ≈ ₩'+fmt(w.used):w.unit+fmt(w.used))+'</span><b>'+(left<0?'모자람 ':'남음 ')+w.unit+fmt(Math.abs(left))+'</b></div></div>'; }).join('')+'</div>';
    if(need) h+='<p class="pool-need">총 필요 예산(식비·입장료) ₩'+fmt(need[0])+'~'+fmt(need[1])+' · 공금 '+(allPut?(allPut>=need[1]?'넉넉해요':allPut>=need[0]?'예상 범위 안이에요':'₩'+fmt(need[0]-allPut)+' 더 있으면 최소 예산이에요'):'금액을 넣으면 비교해 드려요')+'</p>';
    h+='<p class="pool-foot">함께 쓴 돈에서 \'공금 카드\'나 \'공금 현금\'으로 적으면 여기서 빠져요.'+(local?' 카드는 현지 돈으로 적어도 환율(₩'+fmt(rate*100)+'/'+s0+'100)로 바꿔 빼요.':'')+' 이 휴대폰에 저장돼요.</p>';
    document.querySelectorAll('[data-pool]').forEach(function(box){ var fo=box.contains(document.activeElement)?document.activeElement.dataset.poolIn:null; box.innerHTML=h; if(fo){ var i=box.querySelector('[data-pool-in="'+fo+'"]'); if(i){ i.focus(); var v=i.value; i.value=''; i.value=v; } } });
  }
  // 넣은 돈: 저장 버튼·완료·입력 칸 벗어나기에 저장되고, 치는 중에도 바로 기기에 써 둔다. 저장되면 금액과 '수정' 버튼만 보인다
  function poolPut(k,v,done){ pool[k]=Math.max(0,parseFloat(v)||0); pool.t=Date.now(); LS.set(POOLK,pool); if(done){ editing[k]=false; renderPool(); } }
  document.addEventListener('input',function(ev){ var i=ev.target.closest('[data-pool-in]'); if(i) poolPut(i.dataset.poolIn,i.value,false); });
  document.addEventListener('change',function(ev){ var i=ev.target.closest('[data-pool-in]'); if(i) poolPut(i.dataset.poolIn,i.value,!!(+i.value)); });
  document.addEventListener('keydown',function(ev){ var i=ev.target.closest('[data-pool-in]'); if(i&&ev.key==='Enter'){ ev.preventDefault(); poolPut(i.dataset.poolIn,i.value,true); } });
  document.addEventListener('click',function(ev){ var sv=ev.target.closest('[data-pool-save]'); if(sv){ var box=sv.closest('.pw'), i=box&&box.querySelector('[data-pool-in]'); if(i) poolPut(sv.dataset.poolSave,i.value,true); say&&say('공금을 저장했어요. 수정하기 전까지 이 휴대폰에 남아요.'); return; }
    var e=ev.target.closest('[data-pool-edit]'); if(e){ var k=e.dataset.poolEdit; editing[k]=true; renderPool(); var box=ev.target.closest('[data-pool]'); var ni=box&&box.querySelector('[data-pool-in="'+k+'"]'); if(ni){ ni.focus(); ni.select&&ni.select(); } } });
  window.addEventListener('storage',function(ev){ if(ev.key===POOLK){ pool=LS.get(POOLK,pool); renderPool(); } });
  function renderEx(){
    renderPool();
    if(!exl) return; var s0=cur.symbol||'₩', tot=0, ptot=0, paid={}, byCat={}, byDay={}; names.forEach(function(n){paid[n]=0});
    ex.forEach(function(x){ tot+=x.amt; if(isPool(x.who)) ptot+=x.amt; else paid[x.who]=(paid[x.who]||0)+x.amt; byCat[x.cat||'기타']=(byCat[x.cat||'기타']||0)+x.amt; byDay[x.date]=(byDay[x.date]||0)+x.amt; });
    var day=null, rows=[];
    ex.map(function(x,i){return [x,i]}).reverse().forEach(function(p){ var x=p[0];
      if(x.date!==day){ day=x.date; rows.push('<li class="exday"><span>'+day+'</span><b>'+s0+fmt(byDay[day])+'</b></li>'); }
      rows.push('<li'+(exf&&exf.dataset.edit===x.id?' class="editing"':'')+'><span class="w" role="button" tabindex="0" data-edit="'+x.id+'" aria-label="고치기">'+x.what.replace(/</g,'&lt;')+'<small>'+(x.cat||'기타')+' · '+whoName(x.who)+(x.tf?' · 면세':'')+'</small></span><b>'+s0+fmt(x.amt)+'</b><button type="button" class="del" data-del="'+p[1]+'" aria-label="삭제">✕</button></li>'); });
    exl.innerHTML=rows.join('');
    var share=names.length?tot/names.length:0, own=tot-ptot, oshare=names.length?own/names.length:0, line='';
    if(names.length===2&&own>0){ var a=names[0],b=names[1],d=paid[a]-oshare;
      line=Math.abs(d)<1?'딱 반반이에요':(d>0?b+' → '+a:a+' → '+b)+' <b>'+s0+fmt(Math.abs(d))+'</b>'+krw(Math.abs(d)); }
    else if(names.length===2) line='공금으로만 써서 나눌 돈이 없어요';
    exs.innerHTML=ex.length?'<div><small>총 지출</small><b>'+s0+fmt(tot)+'</b>'+krw(tot)+'</div><div><small>1인당</small><b>'+s0+fmt(share)+'</b>'+krw(share)+'</div><div class="settle"><small>개인 돈 정산'+(ptot?' (공금 '+s0+fmt(ptot)+' 제외)':'')+'</small><span>'+line+'</span></div>':'<p class="lead" style="margin:0">아직 기록이 없어요. 위에 쓴 돈을 적어 보세요.</p>';
    var cs=Object.keys(byCat).sort(function(x,y){return byCat[y]-byCat[x]});
    exc.innerHTML=cs.length?'<div class="catbar">'+cs.map(function(c,i){return '<i style="flex:'+byCat[c]+'" class="cb'+i+'"></i>'}).join('')+'</div><div class="catleg">'+cs.map(function(c,i){return '<span><i class="cb'+i+'"></i>'+c+' '+s0+fmt(byCat[c])+'</span>'}).join('')+'</div>':'';
    var tfs=ex.filter(function(x){return x.tf}), tft=0; tfs.forEach(function(x){tft+=x.amt});
    var tfBox=document.querySelector('.extf'); if(tfBox) tfBox.innerHTML=tfs.length?'<h4>면세로 산 것 '+tfs.length+'건</h4><ul>'+tfs.map(function(x){return '<li><span>'+x.date+' '+x.what.replace(/</g,'&lt;')+'</span><b>'+s0+fmt(x.amt)+'</b></li>'}).join('')+'</ul><p>합계 <b>'+s0+fmt(tft)+'</b> · 돌려받을 소비세 많아야 '+s0+fmt(tft/11)+'. 출국 날 체크인 전에 세관 확인을 받아야 돌려받아요. 가게별 기준은 <button type="button" class="linkbtn" data-open="tool-tf">면세 환급</button>에서 확인해요.</p>':'';
    if(exMini) exMini.textContent=ex.length?'총 '+s0+fmt(tot):'기록하고 나눠요';
  }
  if(exf){
    exf.addEventListener('click',function(ev){ var tfb=ev.target.closest('.exf-tf'); if(tfb) tfb.setAttribute('aria-pressed',tfb.getAttribute('aria-pressed')!=='true');
      var b=ev.target.closest('[data-payer]'); if(b) exf.querySelectorAll('[data-payer]').forEach(function(x){x.setAttribute('aria-pressed',x===b)});
      var c=ev.target.closest('[data-cat]'); if(c) exf.querySelectorAll('[data-cat]').forEach(function(x){x.setAttribute('aria-pressed',x===c)}); });
    // 기록 고치기: 목록에서 항목을 누르면 위 입력칸에 불러와 '수정'으로 바꾼다. 고친 시각(e)이 늦은 쪽이 '일행과 공유'로 합칠 때 이긴다
    var exBtn=exf.querySelector('button[type=submit]'), exHint=document.createElement('p'); exHint.className='ex-editing'; exHint.hidden=true;
    exHint.innerHTML='<span>기록을 고치는 중이에요</span><button type="button" class="btn" data-exc>취소</button>'; exf.appendChild(exHint);
    function exMode(id){ if(id) exf.dataset.edit=id; else delete exf.dataset.edit; exBtn.textContent=id?'수정':'추가'; exHint.hidden=!id; renderEx(); }
    exHint.querySelector('[data-exc]').addEventListener('click',function(){ exf.querySelector('[name=what]').value=''; exf.querySelector('[name=amt]').value=''; exMode(null); });
    function exLoad(id){ var x=ex.filter(function(y){return y.id===id})[0]; if(!x) return;
      exf.querySelector('[name=what]').value=x.what; exf.querySelector('[name=amt]').value=x.amt;
      exf.querySelectorAll('[data-payer]').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.payer===x.who)});
      exf.querySelectorAll('[data-cat]').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.cat===(x.cat||'기타'))});
      var tfb=exf.querySelector('.exf-tf'); if(tfb) tfb.setAttribute('aria-pressed',!!x.tf);
      exMode(id); exf.scrollIntoView({block:'nearest'}); exf.querySelector('[name=amt]').focus(); }
    exl.addEventListener('click',function(ev){ var w=ev.target.closest('[data-edit]'); if(w) exLoad(w.dataset.edit); });
    exl.addEventListener('keydown',function(ev){ var w=ev.target.closest('[data-edit]'); if(w&&(ev.key==='Enter'||ev.key===' ')){ ev.preventDefault(); exLoad(w.dataset.edit); } });
    exf.addEventListener('submit',function(ev){ ev.preventDefault(); var f=new FormData(exf), who=exf.querySelector('[data-payer][aria-pressed="true"]'), cat=exf.querySelector('[data-cat][aria-pressed="true"]');
      var amt=parseFloat(f.get('amt')); if(!amt) return;
      if(exf.dataset.edit){ var y=ex.filter(function(z){return z.id===exf.dataset.edit})[0];
        if(y){ var tfe=exf.querySelector('.exf-tf'); y.what=String(f.get('what')).slice(0,40); y.amt=amt; y.who=who?who.dataset.payer:y.who; y.cat=cat?cat.dataset.cat:y.cat; y.tf=(tfe&&tfe.getAttribute('aria-pressed')==='true')||undefined; y.e=Date.now(); if(tfe) tfe.setAttribute('aria-pressed','false'); }
        LS.set(EK,ex); exf.querySelector('[name=what]').value=''; exf.querySelector('[name=amt]').value=''; exMode(null); nowMode(); return; }
      var d=localNow(); var tfb=exf.querySelector('.exf-tf'), tf=tfb&&tfb.getAttribute('aria-pressed')==='true'; if(tfb) tfb.setAttribute('aria-pressed','false');
      ex.push({id:rid(),t:Date.now(),tf:tf||undefined,what:String(f.get('what')).slice(0,40),amt:amt,who:who?who.dataset.payer:'공금카드',cat:cat?cat.dataset.cat:'기타',date:(d.getMonth()+1)+'/'+d.getDate()});
      LS.set(EK,ex); exf.querySelector('[name=what]').value=''; exf.querySelector('[name=amt]').value=''; renderEx(); nowMode(); });
    exl.addEventListener('click',function(ev){ var b=ev.target.closest('[data-del]'); if(!b) return; var gone=ex.splice(+b.dataset.del,1)[0]; if(gone) LS.set(XK,LS.get(XK,[]).concat(gone.id)); if(gone&&exf.dataset.edit===gone.id){ exf.querySelector('[name=what]').value=''; exf.querySelector('[name=amt]').value=''; exMode(null); } LS.set(EK,ex); renderEx(); nowMode(); });
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
  // 예약 알림과 같은 항목(data-dlid)은 '했어요'와 한 몸: 어느 쪽을 눌러도 둘 다 바뀐다 (planner/deadlines.js)
  var DLK='tp-dl-'+slug;
  function dlSet(id,on){ var v=LS.get(DLK,{}); if(on) v[id]=true; else delete v[id]; LS.set(DLK,v); document.dispatchEvent(new CustomEvent('tp-dl')); }
  (function(){ var v=LS.get(DLK,{}), ch=false; lis.forEach(function(li){ var id=li.dataset.dlid; if(!id) return; var on=!!(ck[li.dataset.ck]||v[id]);
    if(on!==!!ck[li.dataset.ck]){ ck[li.dataset.ck]=on; ch=true; } if(on&&!v[id]) dlSet(id,true); }); if(ch) LS.set(CK,ck); })();
  document.addEventListener('tp-dl-set',function(ev){ lis.forEach(function(li){ if(li.dataset.dlid===ev.detail.id){ ck[li.dataset.ck]=ev.detail.on; LS.set(CK,ck); renderCk(); nowMode(); } }); });
  lis.forEach(function(li){ var t=function(){ ck[li.dataset.ck]=!ck[li.dataset.ck]; LS.set(CK,ck); if(li.dataset.dlid) dlSet(li.dataset.dlid,ck[li.dataset.ck]); renderCk(); nowMode(); };
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
  // 운항 상태(지연·게이트)는 항공편 번호로 Flightradar24에서 바로 확인 (트립잇의 항공편 알림 대신)
  function fst(f){ var no=String(f.no||'').replace(/^([A-Za-z]+)0+/,'$1').toLowerCase(); return no?' · <a class="nc-fst" href="https://www.flightradar24.com/data/flights/'+encodeURIComponent(no)+'" target="_blank" rel="noopener">운항 상태 ↗</a>':''; }
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
        +chip(ckLeft?'warn':'ok','출발 전 확인 '+(ckLeft?ckLeft+'개 남음':'완료')).replace('<span ','<span data-goto="before" role="button" tabindex="0" ')+chip(bagDone<bagAll?'':'ok','캐리어 '+(bagAll?Math.round(bagDone/bagAll*100):0)+'%','tool-bag')+'</div>';
      if(f){ var dep=tm(f.dep); h+='<div class="nc-row static"><small>'+f.airline+' '+f.no+' · '+f.dep+' 출발</small><b>'+f.from+'공항 '+String(Math.floor((dep-120)/60)).padStart(2,'0')+':'+String((dep-120)%60).padStart(2,'0')+'까지 도착</b><span>온라인 체크인은 항공사 앱에서 미리 해 두면 빨라요'+fst(f)+'</span></div>'; }
      nc.innerHTML=h; nc.hidden=false; return;
    }
    if(di<0){ nc.hidden=true; document.dispatchEvent(new CustomEvent('tp-now',{detail:{di:-1}})); return; }
    // 현지에서 건너뛴 줄·대안으로 바꾼 줄 (이 휴대폰에 저장, planner/live.js)
    var PL=LS.get('tp-plan-'+slug,{s:{},w:{}}), bk=function(i){return 'blk-'+(di+1)+'-'+(i+1)}, sk=function(i){return !!(PL.s||{})[bk(i)]}, sw=function(i){return (PL.w||{})[bk(i)]};
    var bl=C.days[di].blocks, ci=-1;
    bl.forEach(function(b,i){ var t=tm(b.time); if(t!==null&&t<=mins) ci=i; });
    var nx=-1; for(var k=ci+1;k<bl.length;k++){ if(tm(bl[k].time)!==null&&!sk(k)){ nx=k; break; } }
    var row=function(i,lab,d){ if(i<0) return ''; var b=C.days[d].blocks[i], w=d===di&&sw(i), al=b.alert;
      return '<button type="button" class="nc-row'+(lab==='지금'?' cur':'')+(d===di&&sk(i)?' skipped':'')+'" data-open="blk-'+(d+1)+'-'+(i+1)+'"><small>'+lab+' · '+esc(b.time)+(d===di&&sk(i)?' · 건너뜀':'')+'</small><b>'+esc(w||b.place)+(w?' <i class="swp">바꿈</i>':'')+'</b><span>'+(w?esc(b.place)+' 대신':esc(b.what))+'</span>'+(al&&!w&&lab==='다음'?'<em class="nc-al">'+esc(al.by)+' 전 도착 · '+esc(al.text.replace(/\{확인 필요\}/g,''))+'</em>':'')+'</button>'; };
    var left=nx>=0?tm(bl[nx].time)-mins:null;
    h='<div class="nc-h"><span class="live"></span>여행 '+(di+1)+'일차 · 지금'+(left!==null&&left>0?'<em>다음까지 '+hm(left)+'</em>':'')+'</div>';
    var rs=bl.filter(function(b){return b.fl.indexOf('rsv')>=0&&tm(b.time)>=mins-30}), cs=bl.filter(function(b){return b.fl.indexOf('cash')>=0&&tm(b.time)>=mins-30});
    var bg=(C.budget||[])[di], sp=spentOn(n);
    h+='<div class="bcs">'+rs.map(function(b){return chip('rsv','예약 '+esc(b.time.split(/[–-]/)[0])+' '+esc(b.place.split(' ')[0]))}).join('')
      +(RAIN[ds]>=50&&C.days[di].alt?chip('rain','비 올 확률 '+RAIN[ds]+'% · 플랜 B','alt-'+(di+1)):'')
      +(cs.length?chip('cash','현금 필요 '+cs.length+'곳'):'')
      +(bg?chip(sp>bg[1]?'warn':'','오늘 '+sym+fmt(sp)+' / 예산 '+sym+fmt(bg[0])+'~'+fmt(bg[1]),'tool-ex'):'')+'</div>';
    var f=flightFor(ds); if(f&&f.dep_tz===(C.timezone||'Asia/Tokyo')){ var fd=tm(f.dep), dl=fd-120-mins; h+='<div class="nc-row static fl"><small>'+f.airline+' '+f.no+' · '+f.dep+' 출발</small><b>'+(dl>0?'공항 도착까지 '+hm(dl):'지금 공항에 있어야 해요')+'</b><span>출발 2시간 전 도착 기준'+fst(f)+'</span></div>'; }
    h+=row(ci,'지금',di)+row(nx,'다음',di)+(ci<0&&nx<0?'<p class="lead">오늘 남은 일정이 없어요.</p>':'');
    var nb=nx>=0?bl[nx]:(ci>=0?bl[ci]:null);
    if(nb&&C.near&&C.near.length) h+='<button type="button" class="nc-near" data-open="tool-near" data-area="'+esc(nb.area||'')+'"><b>줄이 길거나 문을 닫았나요?</b><span>'+(nb.area?esc(nb.area)+' 근처 ':'')+'지금 열었을 만한 대안 보기 ›</span></button>';
    if(mins>=18*60&&C.days[di+1]){ var tb=C.days[di+1].blocks, fi=tb.findIndex(function(b){return tm(b.time)!==null}), tr=tb.filter(function(b){return b.fl.indexOf('rsv')>=0});
      h+='<div class="nc-tmr"><small>내일 브리핑</small>'+(fi>=0?'<b>'+esc(tb[fi].time.split(/[–-]/)[0])+' '+esc(tb[fi].place)+'</b>':'')+(tr.length?'<span>예약: '+tr.map(function(b){return esc(b.time.split(/[–-]/)[0])+' '+esc(b.place)}).join(', ')+'</span>':'')+'</div>'; }
    nc.innerHTML=h; nc.hidden=false;
    document.querySelectorAll('tr.now').forEach(function(tr){tr.classList.remove('now')});
    var cur_tr=ci>=0&&document.querySelector('tr[data-open="blk-'+(di+1)+'-'+(ci+1)+'"]'); if(cur_tr) cur_tr.classList.add('now');
    var go=document.querySelector('.t-go'), tgt=nx>=0?bl[nx]:(ci>=0?bl[ci]:null), tgw=nx>=0?sw(nx):(ci>=0?sw(ci):'');
    if(go&&tgt&&tgt.place){ var dest=(tgw||tgt.place.split('→').pop().trim())+' '+((C.geo||{}).city||'');
      go.href=C.map==='naver'?'https://map.naver.com/p/search/'+encodeURIComponent(dest):'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(dest)+'&travelmode=transit';
      var m=go.querySelector('.go-mini'); if(m) m.textContent=tgw||tgt.place.split('→').pop().trim(); }
    document.dispatchEvent(new CustomEvent('tp-now',{detail:{di:di,ci:ci,nx:nx,mins:mins,skip:sk,swap:sw}}));
  }
  document.addEventListener('tp-plan',nowMode);
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
      pack({v:1,trip:slug,from:me,picks:LS.get(PK,{}),ex:ex,exdel:LS.get(XK,[]),ck:ck,dl:LS.get('tp-dl-'+slug,{}),ch:LS.get('tp-ch-'+slug,{}),mem:LS.get('tp-mem-'+slug,{}),pool:LS.get('tp-pool-'+slug,null)}).then(function(code){
        var url=location.origin+location.pathname+'#sync='+code, title=me+'의 여행 기록';
        if(navigator.share){ navigator.share({title:title,text:title+' (열면 내 휴대폰 기록과 합쳐져요)',url:url}).catch(function(){}); return; }
        if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function(){ say('링크를 복사했어요. 카카오톡이나 문자에 붙여 넣어 보내세요.'); },function(){ prompt('이 링크를 복사해서 보내세요',url); });
        else prompt('이 링크를 복사해서 보내세요',url); }); }
    if(b.dataset.sync==='merge'&&incoming){ var p=incoming, me2=myName(), mine=LS.get(PK,{});
      if(p.from) Object.keys(mine).forEach(function(k){ mine[k]=mine[k].filter(function(n){return n!==p.from}); if(!mine[k].length) delete mine[k]; });
      Object.keys(p.picks||{}).forEach(function(k){ (p.picks[k]||[]).forEach(function(n){ if(n===me2&&p.from) return; var a=mine[k]=mine[k]||[]; if(a.indexOf(n)<0) a.push(n); }); });
      Object.keys(mine).forEach(function(k){ if(!mine[k].length) delete mine[k]; });
      var tomb=LS.get(XK,[]).concat(p.exdel||[]).filter(function(v,i,a){return a.indexOf(v)===i}), seen={}, all=[];
      ex.concat(p.ex||[]).forEach(function(x){ if(!x||!x.id||tomb.indexOf(x.id)>=0||!(+x.amt>0)) return;
        var y={id:String(x.id),t:+x.t||0,e:+x.e||undefined,tf:x.tf?true:undefined,what:String(x.what||'').slice(0,40),amt:+x.amt,who:String(x.who||''),cat:String(x.cat||'기타'),date:String(x.date||'')};
        if(y.id in seen){ var o=all[seen[y.id]]; if((y.e||y.t)>(o.e||o.t)) all[seen[y.id]]=y; return; } seen[y.id]=all.length; all.push(y); });
      all.sort(function(a,b){return a.t-b.t});
      Object.keys(p.ck||{}).forEach(function(k){ if(p.ck[k]) ck[k]=true; });
      var dl=LS.get('tp-dl-'+slug,{}); Object.keys(p.dl||{}).forEach(function(k){ if(p.dl[k]) dl[k]=true; }); LS.set('tp-dl-'+slug,dl); // 예약 '했어요'
      LS.set(PK,mine); LS.set(XK,tomb); LS.set(EK,all); LS.set(CK,ck);
      // 함께 고르기: 보낸 사람의 표는 그 사람 것으로, 정한 곳은 내가 아직 안 정한 줄만 / 돌아보기: 보낸 사람의 답
      var chm=LS.get('tp-ch-'+slug,{v:{},f:{},n:{}}), chi=p.ch||{}; chm.v=chm.v||{}; chm.f=chm.f||{}; chm.n=chm.n||{};
      Object.keys(chi.v||{}).forEach(function(k){ var o=chi.v[k]||{}; if(p.from&&o[p.from]!=null) (chm.v[k]=chm.v[k]||{})[p.from]=+o[p.from]; });
      Object.keys(chi.f||{}).forEach(function(k){ var f=chi.f[k]; if(f&&!chm.f[k]) chm.f[k]={i:+f.i,by:String(f.by||''),t:+f.t||0}; });
      Object.keys(chi.n||{}).forEach(function(k){ chm.n[k]=Math.max(+chm.n[k]||0,+chi.n[k]||0); }); LS.set('tp-ch-'+slug,chm);
      var mm=LS.get('tp-mem-'+slug,{a:{}}), mi=p.mem||{}; mm.a=mm.a||{};
      Object.keys(mi.a||{}).forEach(function(k){ var o=mi.a[k]||{}; if(p.from&&o[p.from]) (mm.a[k]=mm.a[k]||{})[p.from]=String(o[p.from]).slice(0,300); }); LS.set('tp-mem-'+slug,mm);
      var pm=LS.get('tp-pool-'+slug,{}), pi=p.pool; if(pi&&(+pi.t||0)>(+pm.t||0)) LS.set('tp-pool-'+slug,{card:+pi.card||0,cash:+pi.cash||0,t:+pi.t}); // 공금: 나중에 저장한 쪽
      try{sessionStorage.setItem('tp-toast',(p.from||'일행')+'의 기록과 합쳤어요.')}catch(e){}
      history.replaceState(null,'',location.pathname+location.search); location.reload(); }
  });
  var syncIn=document.getElementById('sync-in');
  if(syncIn) syncIn.addEventListener('close',function(){ if(/^#sync=/.test(location.hash)) history.replaceState(null,'',location.pathname+location.search); });
  function readSync(){ var m=location.hash.match(/^#sync=([jz][\w-]+)$/), d=syncIn; if(!m||!d) return;
    unpack(m[1]).then(function(p){ if(!p||p.trip!==slug) throw 0; incoming=p;
      var np=Object.keys(p.picks||{}).filter(function(k){return !p.from||(p.picks[k]||[]).indexOf(p.from)>=0}).length, nc2=Object.keys(p.ck||{}).filter(function(k){return p.ck[k]}).length;
      var sm=d.querySelector('.sheet-h small'); if(sm) sm.textContent=(p.from||'일행')+' 님이 보냈어요';
      d.querySelector('.sync-body').innerHTML='<ul class="sync-sum"><li><b>'+np+'</b><span>픽</span></li><li><b>'+(p.ex||[]).length+'</b><span>지출</span></li><li><b>'+nc2+'</b><span>출발 전 체크</span></li></ul><p class="lead" style="margin:12px 0 0;font-size:14px">합치면 '+esc(p.from||'일행')+' 님의 픽이 최신으로 바뀌고, 지출·체크·끝낸 예약은 양쪽 것을 모두 모아요. 내 픽은 그대로예요.</p>';
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
    var rows=[['날짜','내용','분류','낸 사람','금액('+sym+')','면세']].concat(ex.map(function(x){ return [x.date,x.what,x.cat||'기타',x.who==='공금카드'?'공금 카드':x.who==='공금현금'?'공금 현금':x.who,x.amt,x.tf?'면세':'']; }));
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
    var pv=(paid['공금카드']||0)+(paid['공금현금']||0); if(names.length>1&&tot) h+='<div><h4>누가 냈나</h4>'+hbars((pv?[{label:'공금',v:pv,c:'var(--viz-3)'}]:[]).concat(names.map(function(n,i){return {label:n,v:paid[n]||0,c:i?'var(--viz-2)':'var(--viz-1)'}})),sym)+'</div>';
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

// ---------------------------------------------------------------- 네컷 사진: 사진관 스티커 사진처럼 네 칸 프레임. 칸은 비워 두고, 아래 사진 목록에서 골라 넣고, 끌어서 위치·핀치로 크기를 맞춘다. 사진은 휴대폰 밖으로 나가지 않음
(function(){
  var root=document.querySelector('.cut'), cfgEl=document.getElementById('trip-cfg'); if(!root||!cfgEl) return;
  var C=JSON.parse(cfgEl.textContent), slug=C.trip, F=C.frame||{}, cv=root.querySelector('canvas'), ctx=cv.getContext('2d');
  var note=root.querySelector('.cut-note'), fin=root.querySelector('.cut-in'), tray=root.querySelector('.cut-tray'), bar=root.querySelector('.cut-bar');
  var frame='trip', lay='strip', stk=true, seed=0, pool=[], slots=[null,null,null,null], rects=[], cur=0, art=null, gen=0, exporting=false, loaded=false;
  var FONT='-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Pretendard Variable","Noto Sans KR",sans-serif';
  var PRI=F.pri||'#24346b', ACC=F.acc||'#c13d69', YEL='#f2c230', NAME=F.name||document.title.replace(/ 여행$/,'');
  if(F.art){ var ai=new Image(); ai.onload=function(){ art=ai; if(root.closest('dialog[open]')) draw(); }; ai.src=F.art; }
  function rng(s){ return function(){ s=(s*16807)%2147483647; return (s-1)/2147483646; }; }
  function load(){ return new Promise(function(ok){ if(!window.indexedDB) return ok([]); var r=indexedDB.open('tp-photos',1);
    r.onupgradeneeded=function(){ r.result.createObjectStore('p',{keyPath:'id'}); };
    r.onsuccess=function(){ try{ var q=r.result.transaction('p','readonly').objectStore('p').getAll(); q.onsuccess=function(){ ok((q.result||[]).filter(function(p){return p.trip===slug})); }; q.onerror=function(){ok([])}; }catch(e){ ok([]); } };
    r.onerror=function(){ok([])}; }); }
  function fileImg(b){ return new Promise(function(ok){ var i=new Image(), u=URL.createObjectURL(b); i.onload=function(){ok({img:i,url:u})}; i.onerror=function(){ok(null)}; i.src=u; }); }
  // 사진 목록(인생네컷의 '찍은 사진들'): 여행 기록 사진 + 휴대폰 앨범에서 고른 사진. 칸에는 직접 골라 넣는다
  function addPool(list){ list.filter(Boolean).forEach(function(p){ pool.push(p); }); paintTray(); }
  function used(p){ return slots.some(function(s){ return s&&s.p===p; }); }
  function paintTray(){
    tray.innerHTML='<button type="button" class="cut-add" data-cut="pick"><b>+</b><span>사진 추가</span></button>'+pool.map(function(p,i){
      return '<button type="button" class="cut-th'+(used(p)?' on':'')+'" data-pool="'+i+'" aria-label="사진 '+(i+1)+(used(p)?', 칸에 들어감':'')+'"><img src="'+p.url+'" alt=""></button>'; }).join('');
  }
  function put(p,k){ // 같은 사진이 다른 칸에 있으면 자리를 맞바꾼다
    var was=slots.map(function(s){return s&&s.p}).indexOf(p);
    if(was>=0&&was!==k){ var t=slots[k]; slots[k]=slots[was]; slots[was]=t; }
    else if(was<0) slots[k]={p:p,img:p.img,fx:.5,fy:.5,z:1};
    var nx=[0,1,2,3].map(function(d){return (k+1+d)%4}).filter(function(j){return !slots[j]})[0]; cur=nx==null?k:nx;
    paintTray(); draw(); }
  function cover(i,x,y,w,h,fx,fy,z){ var k=Math.max(w/i.width,h/i.height)*(z||1), iw=i.width*k, ih=i.height*k;
    ctx.drawImage(i,x+(w-iw)*(fx==null?.5:fx),y+(h-ih)*(fy==null?.5:fy),iw,ih); }
  // 떨리는 검정 펜선: 같은 선을 두 번, 조금씩 다르게 긋는다
  function pen(pts,close,col,lw,r){ ctx.save(); ctx.strokeStyle=col; ctx.lineWidth=lw; ctx.lineCap='round'; ctx.lineJoin='round';
    for(var pass=0;pass<2;pass++){ ctx.globalAlpha=pass?.55:.95; ctx.beginPath(); var all=close?pts.concat([pts[0]]):pts;
      for(var i=0;i<all.length-1;i++){ var a=all[i], b=all[i+1], n=Math.max(2,Math.round(Math.hypot(b[0]-a[0],b[1]-a[1])/(lw*9)));
        for(var s=0;s<=n;s++){ var t=s/n, j=lw*(pass?1.1:.6); var x=a[0]+(b[0]-a[0])*t+(r()-.5)*j, y=a[1]+(b[1]-a[1])*t+(r()-.5)*j; if(i===0&&s===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); } }
      ctx.stroke(); } ctx.restore(); }
  function box(x,y,w,h,col,lw,r){ var o=lw*.8; pen([[x-o*r(),y-o],[x+w+o,y-o*r()],[x+w+o*r(),y+h+o],[x-o,y+h+o*r()]],true,col,lw,r); }
  // 색연필 빗금 칠하기
  function hatch(path,col,lw,bare){ if(!bare){ ctx.save(); path(); ctx.strokeStyle='#fff'; ctx.lineWidth=lw*7; ctx.lineJoin='round'; ctx.stroke(); ctx.fillStyle='#fff'; ctx.fill(); ctx.restore(); } // 스티커처럼 흰 테두리
    ctx.save(); path(); ctx.clip(); ctx.fillStyle=col; ctx.globalAlpha=.4; ctx.fill(); ctx.globalAlpha=.9; ctx.strokeStyle=col; ctx.lineWidth=lw*.8;
    var b=ctx.canvas.width; ctx.beginPath(); for(var d=-b;d<b*2;d+=lw*2.6){ ctx.moveTo(d,0); ctx.lineTo(d-b*3,b*3); } ctx.stroke(); ctx.restore(); }
  // 낙서 스티커: 반짝 선, 하트, 매화 같은 꽃, 별
  function spark(x,y,s,col,lw,r){ [-.9,-.45,0].forEach(function(a){ var c=Math.cos(a-1.57), d=Math.sin(a-1.57); pen([[x+c*s*.45,y+d*s*.45],[x+c*s,y+d*s]],false,col,lw,r); }); }
  function heart(x,y,s,col,ink,lw,r){ var P=function(){ ctx.beginPath(); ctx.moveTo(x,y+s*.35); ctx.bezierCurveTo(x-s*.9,y-s*.25,x-s*.35,y-s*.85,x,y-s*.3); ctx.bezierCurveTo(x+s*.35,y-s*.85,x+s*.9,y-s*.25,x,y+s*.35); };
    hatch(P,col,lw); var pts=[]; for(var k=0;k<=24;k++){ var t=k/24*Math.PI*2, hx=16*Math.pow(Math.sin(t),3), hy=-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t)); pts.push([x+hx*s/30,y+hy*s/30-s*.05]); } pen(pts,true,ink,lw,r); }
  function flower(x,y,s,col,ink,lw,r){ ctx.save(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x,y,s*.74+lw*3,0,7); ctx.fill(); ctx.restore(); for(var k=0;k<5;k++){ var a=k/5*Math.PI*2-1.57, px=x+Math.cos(a)*s*.42, py=y+Math.sin(a)*s*.42, rr=s*.32;
      hatch(function(){ ctx.beginPath(); ctx.arc(px,py,rr,0,7); },col,lw,true); var pts=[]; for(var q=0;q<=14;q++){ var b=q/14*Math.PI*2; pts.push([px+Math.cos(b)*rr,py+Math.sin(b)*rr]); } pen(pts,true,ink,lw*.8,r); }
    ctx.save(); ctx.fillStyle=YEL; ctx.beginPath(); ctx.arc(x,y,s*.13,0,7); ctx.fill(); ctx.restore(); }
  function star(x,y,s,col,ink,lw,r){ var pts=[]; for(var k=0;k<10;k++){ var a=k/10*Math.PI*2-1.57, rr=k%2?s*.42:s; pts.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr]); }
    hatch(function(){ ctx.beginPath(); pts.forEach(function(p,i){ i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]); }); ctx.closePath(); },col,lw); pen(pts,true,ink,lw,r); }
  function line(t,x,y,size,weight,col,align,maxW){ ctx.save(); ctx.fillStyle=col; ctx.font=weight+' '+Math.round(size)+'px '+FONT; ctx.textAlign=align||'left'; ctx.textBaseline='alphabetic';
    var s=String(t); if(maxW) while(s.length>1&&ctx.measureText(s).width>maxW) s=s.slice(0,-2)+'…'; ctx.fillText(s,x,y); var w=ctx.measureText(s).width; ctx.restore(); return w; }
  function when(){ var n=Math.round((new Date(C.end)-new Date(C.start))/864e5); return C.start.replace(/-/g,'.')+' — '+C.end.slice(5).replace('-','.')+' · '+n+'박 '+(n+1)+'일'; }
  // 프레임: 사이트 디자인 토큰(테마 색·시스템 글꼴·둥근 모서리)을 그대로 쓴다. 여행지만 손그림 펜선
  var FR={
    trip:{bg:'#fffdf8',ink:'#1b1b1b',sub:PRI,empty:'#f1efe9',r:0,pen:true},
    theme:{bg:'grad',ink:'#ffffff',sub:'rgba(255,255,255,.72)',empty:'rgba(255,255,255,.1)',r:.024},
    pastel:{bg:'soft',ink:PRI,sub:'rgba(60,60,67,.78)',empty:'rgba(255,255,255,.6)',r:.024},
    white:{bg:'#ffffff',ink:'#1b1b1b',sub:'rgba(60,60,67,.78)',empty:'#f2f2f7',r:.016},
    black:{bg:'#111111',ink:'#f5f5f7',sub:'rgba(235,235,245,.62)',empty:'#1c1c1e',r:.016}
  };
  function rr(x,y,w,h,rad){ ctx.beginPath(); if(rad&&ctx.roundRect) ctx.roundRect(x,y,w,h,rad); else ctx.rect(x,y,w,h); }
  function draw(){
    var my=++gen, strip=lay==='strip', f=FR[frame], W=strip?900:1200, m=48, g=24, sw, sh=strip?520:720, r=rng(11+seed), lw=W/300;
    sw=strip?W-2*m:(W-2*m-g)/2;
    var photosH=m+(strip?4*sh+3*g:2*sh+g);
    // 아래 칸 높이: 흰색·검정 등은 이름·날짜만이라 짧게, 여행지는 손그림이 크게 보이도록 넉넉히
    var fh=frame==='trip'&&art?(strip?(sw/1.5)*.82+150:sw/1.5*.95+g):(strip?210:170);
    var H=Math.round(photosH+g+fh+m*.5); cv.width=W; cv.height=H;
    if(f.bg==='grad'){ var gr=ctx.createLinearGradient(0,0,W*.4,H); gr.addColorStop(0,PRI); gr.addColorStop(1,'#0b0f1c'); ctx.fillStyle=gr; ctx.fillRect(0,0,W,H);
      var rg=ctx.createRadialGradient(W*.9,H*.04,0,W*.9,H*.04,W*.9); rg.addColorStop(0,ACC+'88'); rg.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=rg; ctx.fillRect(0,0,W,H); }
    else if(f.bg==='soft'){ var gs=ctx.createLinearGradient(0,0,0,H); gs.addColorStop(0,F.pri_soft||'#e2e6f3'); gs.addColorStop(1,F.acc_soft||'#f7e2ea'); ctx.fillStyle=gs; ctx.fillRect(0,0,W,H); }
    else { ctx.fillStyle=f.bg; ctx.fillRect(0,0,W,H); }
    rects=[]; for(var k=0;k<4;k++) rects.push(strip?[m,m+k*(sh+g),sw,sh]:[m+(k%2)*(sw+g),m+Math.floor(k/2)*(sh+g),sw,sh]);
    var rad=W*f.r;
    rects.forEach(function(q,k){ var s=slots[k];
      if(s&&s.img){ ctx.save(); rr(q[0],q[1],q[2],q[3],rad); ctx.clip(); cover(s.img,q[0],q[1],q[2],q[3],s.fx,s.fy,s.z); ctx.restore(); }
      else { ctx.save(); ctx.fillStyle=f.empty; rr(q[0],q[1],q[2],q[3],rad); ctx.fill(); if(!exporting){ ctx.setLineDash([lw*4,lw*4]); ctx.strokeStyle=f.sub; ctx.globalAlpha=.6; ctx.lineWidth=lw; rr(q[0]+lw*6,q[1]+lw*6,q[2]-lw*12,q[3]-lw*12,Math.max(0,rad-lw*6)); ctx.stroke(); } ctx.restore();
        line(exporting?'':(k+1)+'',q[0]+q[2]/2,q[1]+q[3]/2+W*.005,W*.07,700,f.sub,'center'); if(!exporting) line('여기에 사진',q[0]+q[2]/2,q[1]+q[3]/2+W*.07,W*.034,600,f.sub,'center'); }
      if(f.pen) box(q[0],q[1],q[2],q[3],'#1b1b1b',lw,r);
    });
    var top=photosH+g;
    if(frame==='trip'&&art){
      if(strip){ var ah=fh-150, ax=m, aw=W-2*m;
        ctx.save(); ctx.beginPath(); ctx.rect(ax,top,aw,ah); ctx.clip(); cover(art,ax,top,aw,ah,.45,.55); ctx.restore(); box(ax,top,aw,ah,'#1b1b1b',lw,r);
        var ty=top+ah+W*.1, nw=line(NAME,m,ty,W*.072,800,f.ink,'left',W*.5);
        pen([[m,ty+W*.02],[m+nw*.55,ty+W*.026],[m+nw+W*.02,ty+W*.016]],false,ACC,lw*2.2,r);
        line(when(),W-m,ty,W*.03,600,f.sub,'right',W*.45); }
      else { var aw2=sw, ah2=fh-g;
        ctx.save(); ctx.beginPath(); ctx.rect(m,top,aw2,ah2); ctx.clip(); cover(art,m,top,aw2,ah2,.45,.55); ctx.restore(); box(m,top,aw2,ah2,'#1b1b1b',lw,r);
        var tx=m+sw+g, ty2=top+ah2*.45, nw2=line(NAME,tx,ty2,W*.06,800,f.ink,'left',sw);
        pen([[tx,ty2+W*.018],[tx+nw2*.55,ty2+W*.024],[tx+nw2+W*.02,ty2+W*.014]],false,ACC,lw*2.2,r);
        line(when(),tx,ty2+W*.07,W*.026,600,f.sub,'left',sw); }
    } else {
      // 사이트 표지처럼: 굵은 제목 + 작은 날짜 줄, 왼쪽 정렬
      var by=top+fh*.42;
      line(NAME,m+lw,by,W*(strip?.064:.05),800,f.ink,'left',W*.6);
      line(when(),m+lw,by+W*(strip?.058:.044),W*(strip?.03:.024),600,f.sub,'left',W-2*m);
      ctx.save(); ctx.fillStyle=frame==='white'||frame==='pastel'?PRI:ACC;
      var dot=W*(strip?.022:.017); ctx.beginPath(); ctx.arc(W-m-dot,by-dot*1.2,dot,0,7); ctx.fill(); ctx.globalAlpha=.55; ctx.beginPath(); ctx.arc(W-m-dot*3.4,by-dot*1.2,dot,0,7); ctx.fill(); ctx.restore();
    }
    if(stk){ var sc=W*(strip?.075:.06), dark=frame==='black'||frame==='theme', sink=dark?'#f5f5f7':'#1b1b1b', q0=rects[0], q1=rects[1], q2=rects[2], q3=rects[3];
      spark(q0[0]+q0[2]-sc*.4,q0[1]+sc*1.1,sc*1.1,dark?YEL:'#1b1b1b',lw,r);
      heart(q1[0]+sc*.9,q1[1]+q1[3]-sc*.5,sc,ACC,sink,lw,r);
      flower(q2[0]+q2[2]-sc*.9,q2[1]+sc*.9,sc*.9,frame==='trip'||frame==='pastel'?ACC:'#f39ab5',sink,lw,r);
      star(q3[0]+sc*.9,q3[1]+q3[3]-sc*.85,sc*.7,YEL,sink,lw,r);
      if(frame==='trip'&&art) spark(W-m-sc*.3,top+sc*.2,sc*.9,YEL,lw,r);
    }
    if(!exporting&&rects[cur]){ var q=rects[cur]; ctx.save(); ctx.strokeStyle='#0a84ff'; ctx.lineWidth=lw*3; rr(q[0]-lw*2,q[1]-lw*2,q[2]+lw*4,q[3]+lw*4,rad?rad+lw*2:0); ctx.stroke(); ctx.restore(); }
    var n=slots.filter(Boolean).length;
    note.textContent=!pool.length?'\'사진 추가\'로 사진을 고른 뒤, 칸을 고르고 아래 사진을 눌러 넣어요.':(n<4?(cur+1)+'번 칸이 골라져 있어요. 아래 사진을 누르면 이 칸에 들어가요.':'사진을 끌어서 위치를, 두 손가락으로 크기를 맞춰요. 들어간 사진을 다른 칸에서 누르면 자리가 바뀌어요.');
    var s0=slots[cur]; bar.hidden=!s0; if(s0) bar.querySelector('.cut-n').textContent=(cur+1)+'번 칸';
  }
  var name=function(){ return slug+'-네컷-'+({trip:'여행지',theme:'테마',pastel:'파스텔',white:'흰색',black:'검정'})[frame]+'.jpg'; };
  function press(sel1,b){ root.querySelectorAll(sel1).forEach(function(x){ x.setAttribute('aria-pressed',x===b); }); }
  function out(){ exporting=true; draw(); return new Promise(function(ok){ cv.toBlob(function(b){ exporting=false; draw(); ok(b); },'image/jpeg',.94); }); }
  function slotAt(ev){ var b=cv.getBoundingClientRect(), x=(ev.clientX-b.left)*cv.width/b.width, y=(ev.clientY-b.top)*cv.height/b.height, hit=-1;
    rects.forEach(function(q,k){ if(x>=q[0]&&x<=q[0]+q[2]&&y>=q[1]&&y<=q[1]+q[3]) hit=k; }); return {k:hit,x:x,y:y}; }
  function clampS(s){ s.z=Math.min(4,Math.max(1,s.z)); s.fx=Math.min(1,Math.max(0,s.fx)); s.fy=Math.min(1,Math.max(0,s.fy)); }
  // 끌기: 사진 위치, 두 손가락: 크기. 움직이지 않고 떼면 칸 고르기
  var pts={}, drag=null;
  cv.addEventListener('pointerdown',function(ev){ var h=slotAt(ev); pts[ev.pointerId]={x:ev.clientX,y:ev.clientY}; try{ cv.setPointerCapture(ev.pointerId); }catch(e){}
    if(Object.keys(pts).length===1) drag={k:h.k,x:ev.clientX,y:ev.clientY,moved:false};
    else if(drag&&slots[drag.k]){ var ids=Object.keys(pts), a=pts[ids[0]], b=pts[ids[1]]; drag.pinch=Math.hypot(a.x-b.x,a.y-b.y); drag.z0=slots[drag.k].z; drag.moved=true; } });
  cv.addEventListener('pointermove',function(ev){ if(!pts[ev.pointerId]||!drag) return; pts[ev.pointerId]={x:ev.clientX,y:ev.clientY}; var s=slots[drag.k]; if(!s) return;
    var ids=Object.keys(pts);
    if(ids.length>1&&drag.pinch){ var a=pts[ids[0]], b=pts[ids[1]]; s.z=drag.z0*Math.hypot(a.x-b.x,a.y-b.y)/drag.pinch; clampS(s); draw(); return; }
    var dx=ev.clientX-drag.x, dy=ev.clientY-drag.y; if(!drag.moved&&Math.hypot(dx,dy)<6) return; drag.moved=true; drag.x=ev.clientX; drag.y=ev.clientY;
    var bb=cv.getBoundingClientRect(), sc=cv.width/bb.width, q=rects[drag.k], k0=Math.max(q[2]/s.img.width,q[3]/s.img.height)*s.z, ex=s.img.width*k0-q[2], ey=s.img.height*k0-q[3];
    if(ex>1) s.fx-=dx*sc/ex; if(ey>1) s.fy-=dy*sc/ey; clampS(s); cur=drag.k; draw(); });
  function up(ev){ delete pts[ev.pointerId]; if(Object.keys(pts).length) return; var d=drag; drag=null; if(!d||d.moved||d.k<0) return;
    cur=d.k; draw(); if(!slots[d.k]&&!pool.length){ fin.click(); } }
  cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',function(ev){ delete pts[ev.pointerId]; drag=null; });
  cv.addEventListener('wheel',function(ev){ var h=slotAt(ev), s=slots[h.k]; if(!s) return; ev.preventDefault(); s.z*=ev.deltaY<0?1.08:1/1.08; clampS(s); cur=h.k; draw(); },{passive:false});
  root.addEventListener('click',function(ev){
    var f=ev.target.closest('[data-frame]'); if(f){ frame=f.dataset.frame; press('[data-frame]',f); draw(); return; }
    var l=ev.target.closest('[data-lay]'); if(l){ lay=l.dataset.lay; press('[data-lay]',l); draw(); return; }
    var st=ev.target.closest('[data-stk]'); if(st){ stk=!stk; st.setAttribute('aria-pressed',stk); draw(); return; }
    var pb=ev.target.closest('[data-pool]'); if(pb){ put(pool[+pb.dataset.pool],cur); return; }
    var sb=ev.target.closest('[data-slot]'); if(sb){ var s=slots[cur], op=sb.dataset.slot;
      if(op==='in'&&s){ s.z*=1.2; clampS(s); } else if(op==='outz'&&s){ s.z/=1.2; clampS(s); }
      else if(op==='fit'&&s){ s.z=1; s.fx=.5; s.fy=.5; }
      else if(op==='up'||op==='down'){ var j=(cur+(op==='up'?3:1))%4, t=slots[j]; slots[j]=slots[cur]; slots[cur]=t; cur=j; }
      else if(op==='clear'){ slots[cur]=null; paintTray(); }
      draw(); return; }
    var a=ev.target.closest('[data-cut]'); if(!a) return;
    if(a.dataset.cut==='pick'){ fin.click(); return; }
    if(a.dataset.cut==='auto'){ var free=pool.filter(function(p){return !used(p)}); [0,1,2,3].forEach(function(k){ if(!slots[k]&&free.length){ var p=free.shift(); slots[k]={p:p,img:p.img,fx:.5,fy:.5,z:1}; } }); paintTray(); draw(); return; }
    out().then(function(bb){ if(!bb) return; var file=new File([bb],name(),{type:'image/jpeg'});
      if(a.dataset.cut==='share'&&navigator.canShare&&navigator.canShare({files:[file]})) return navigator.share({files:[file],title:NAME+' 네컷'}).catch(function(){});
      var u=URL.createObjectURL(bb), k=document.createElement('a'); k.href=u; k.download=name(); document.body.appendChild(k); k.click(); k.remove(); setTimeout(function(){URL.revokeObjectURL(u)},4000); });
  });
  fin.addEventListener('change',function(){ var fs=[].slice.call(fin.files||[]); fin.value=''; if(!fs.length) return;
    Promise.all(fs.slice(0,12).map(fileImg)).then(function(ps){ var empty=!slots[cur]; addPool(ps); if(empty&&ps[0]) put(ps[0],cur); else draw(); }); });
  document.addEventListener('click',function(ev){ if(ev.target.closest('[data-open="tool-cut"]')){ paintTray(); draw();
    if(!loaded){ loaded=true; load().then(function(rs){ return Promise.all(rs.sort(function(a,b){return a.t-b.t}).map(function(r){ return fileImg(r.blob); })); }).then(function(ps){ addPool(ps); draw(); }); } } });
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
    var zm=document.querySelector('.shop-zoom'), z=ev.target.closest('[data-zoom]');
    if(z&&zm){ var im=zm.querySelector('img'); im.src=z.dataset.zoom; im.alt=z.getAttribute('aria-label')||''; zm.showModal(); return; }
    if(zm&&zm.open&&ev.target.closest('.shop-zoom')){ zm.close(); return; }
    var big=document.querySelector('.bigshow'), s=ev.target.closest('[data-big]');
    if(s&&big){ big.querySelector('b').textContent=s.dataset.big; big.querySelector('small').textContent=s.dataset.bigko+' 있나요? · これはありますか?'; big.showModal(); return; }
    if(big&&big.open&&ev.target.closest('.bigshow')) big.close();
  });
  paint();
})();

// ---------------------------------------------------------------- 디자인 2탄: 팝업 시트 다듬기
// 1) 휴대폰 뒤로 가기(안드로이드 버튼·아이폰 쓸어 넘기기)로 열린 팝업만 닫힌다
// 2) 닫힐 때도 아래로 내려가며 사라진다 (Esc·✕·바깥·뒤로 가기 모두 같은 움직임)
// 3) 휴대폰에서 팝업 윗부분을 아래로 끌어내리면 닫힌다
(function(){
  var P=window.HTMLDialogElement&&HTMLDialogElement.prototype; if(!P||!P.showModal) return;
  var still=function(){ return matchMedia('(prefers-reduced-motion: reduce)').matches; };
  var nativeClose=P.close, popping=false;
  P.close=function(rv){
    var d=this;
    if(!d.classList.contains('sheet')||!d.open||still()||d.dataset.phase==='closing') return nativeClose.call(d,rv);
    d.dataset.phase='closing';
    var done=false, fin=function(){ if(done) return; done=true; delete d.dataset.phase; d.style.transform=''; d.style.transition=''; nativeClose.call(d,rv); };
    d.addEventListener('animationend',function h(e){ if(e.target===d){ d.removeEventListener('animationend',h); fin(); } });
    setTimeout(fin,320);
  };
  function openSheets(){ return [].slice.call(document.querySelectorAll('dialog.sheet[open]')).filter(function(d){return d.dataset.phase!=='closing'}); }
  // 뒤로 가기용 기록: 팝업이 처음 열릴 때 한 칸, 모두 닫히면 그 칸을 되돌린다
  function onOpen(d){
    if(history.state&&history.state.tpSheet) return;
    if(/^#sync=/.test(location.hash)) return;
    try{ history.pushState({tpSheet:1},'',location.href); }catch(e){}
  }
  function onClose(){
    setTimeout(function(){
      if(openSheets().length||popping){ popping=false; return; }
      if(history.state&&history.state.tpSheet){ popping=true; history.back(); }
    },0);
  }
  window.addEventListener('popstate',function(){
    if(popping){ popping=false; return; }
    var o=openSheets(); if(o.length){ popping=true; o.forEach(function(d){ d.close(); }); }
  });
  var mo=new MutationObserver(function(list){ list.forEach(function(m){ var d=m.target; if(!d.classList.contains('sheet')) return; if(d.open) onOpen(d); else onClose(d); }); });
  document.querySelectorAll('dialog.sheet').forEach(function(d){
    mo.observe(d,{attributes:true,attributeFilter:['open']});
    // Esc도 닫힘 움직임을 거치도록 기본 동작 대신 close()를 부른다
    d.addEventListener('cancel',function(ev){ if(still()) return; ev.preventDefault(); d.close(); });
  });
  // 끌어내려 닫기 (손가락 화면에서만)
  if(!matchMedia('(pointer: coarse)').matches) return;
  var drag=null;
  document.addEventListener('touchstart',function(ev){
    var d=ev.target.closest&&ev.target.closest('dialog.sheet[open]'); if(!d||ev.touches.length!==1) return;
    if(ev.target.closest('input,textarea,select,canvas,.seg,[data-noswipe]')) return;
    var body=d.querySelector('.sheet-b'), inHead=!!ev.target.closest('.sheet-h');
    if(!inHead&&body&&body.scrollTop>0) return;
    drag={d:d,y0:ev.touches[0].clientY,x0:ev.touches[0].clientX,t0:Date.now(),dy:0,head:inHead,on:false};
  },{passive:true});
  document.addEventListener('touchmove',function(ev){
    if(!drag) return; var t=ev.touches[0], dy=t.clientY-drag.y0, dx=t.clientX-drag.x0;
    if(!drag.on){ if(Math.abs(dy)<8) return; if(dy<0||Math.abs(dx)>Math.abs(dy)){ drag=null; return; } drag.on=true; drag.d.style.transition='none'; }
    drag.dy=Math.max(0,dy); drag.d.style.transform='translateY('+drag.dy+'px)';
    if(ev.cancelable) ev.preventDefault();
  },{passive:false});
  document.addEventListener('touchend',function(){
    if(!drag) return; var g=drag; drag=null; if(!g.on) return;
    var v=g.dy/Math.max(1,Date.now()-g.t0);
    if(g.dy>110||v>.6){ g.d.classList.add('dragged'); g.d.close(); setTimeout(function(){g.d.classList.remove('dragged')},400); }
    else { g.d.style.transition='transform .3s var(--ease)'; g.d.style.transform=''; setTimeout(function(){ g.d.style.transition=''; },320); }
  });
})();

// 일정 탭: 휴대폰에서 날짜 화면을 옆으로 밀면 앞뒤 날로 넘어간다
(function(){
  var sec=document.getElementById('detail'); if(!sec||!matchMedia('(pointer: coarse)').matches) return;
  var tabs=[].slice.call(sec.querySelectorAll('.daytabs button')); if(tabs.length<2) return;
  var s=null;
  function scrollsX(el){ for(;el&&el!==sec;el=el.parentElement){ if(el.scrollWidth>el.clientWidth+2&&/(auto|scroll)/.test(getComputedStyle(el).overflowX)) return true; if(el.tagName==='IFRAME') return true; } return false; }
  sec.addEventListener('touchstart',function(ev){ if(ev.touches.length!==1||ev.target.closest('.daytabs')||scrollsX(ev.target)){ s=null; return; } s={x:ev.touches[0].clientX,y:ev.touches[0].clientY,t:Date.now()}; },{passive:true});
  sec.addEventListener('touchend',function(ev){
    if(!s) return; var t=ev.changedTouches[0], dx=t.clientX-s.x, dy=t.clientY-s.y, dt=Date.now()-s.t; s=null;
    if(Math.abs(dx)<70||Math.abs(dx)<Math.abs(dy)*1.8||dt>700) return;
    var i=tabs.findIndex(function(b){return b.getAttribute('aria-selected')==='true'}), j=i+(dx<0?1:-1);
    if(j<0||j>=tabs.length) return;
    sec.dataset.swipe=dx<0?'next':'prev'; tabs[j].click(); tabs[j].focus({preventScroll:true});
    var top=sec.getBoundingClientRect().top; if(top<0) sec.scrollIntoView();
    setTimeout(function(){ delete sec.dataset.swipe; },400);
  },{passive:true});
})();

// ---------------------------------------------------------------- 1인 비용 카드: 막대에 마우스를 올리거나(데스크톱) 누르면(휴대폰) 종류별 상세
(function(){
  document.querySelectorAll('.bcard').forEach(function(card){
    var tip=card.querySelector('.btip'), wrap=card.querySelector('.sbars'), cur=null, pinned=false;
    if(!tip||!wrap) return;
    var bars=[].slice.call(card.querySelectorAll('.sbar')), rows=[].slice.call(card.querySelectorAll('.bud2 li'));
    bars.forEach(function(b,i){ var s=b.querySelector('.stk'); if(s) s.style.setProperty('--i',i); });
    function place(bar){
      var c=card.getBoundingClientRect(), r=bar.getBoundingClientRect(), t=bar.querySelector('.track').getBoundingClientRect();
      var w=tip.offsetWidth, h=tip.offsetHeight, left=Math.min(Math.max(t.left-c.left,12),c.width-w-12);
      var below=r.bottom-c.top+6, above=r.top-c.top-h-6;
      // 누른 경우(휴대폰)는 다른 막대를 가리지 않게 차트 아래에, 마우스는 막대 바로 아래에
      if(pinned){ var wr=wrap.getBoundingClientRect(); tip.style.left=Math.min(Math.max(t.left-c.left,12),c.width-w-12)+'px'; tip.style.top=(wr.bottom-c.top+8)+'px'; return; }
      var room=window.innerHeight-r.bottom-80;
      tip.style.left=left+'px'; tip.style.top=(h>room&&above>0?above:below)+'px';
    }
    function show(bar){
      if(cur!==bar){ tip.innerHTML=bar.querySelector('template').innerHTML; }
      cur=bar; bars.forEach(function(x){ x.classList.toggle('on',x===bar); x.setAttribute('aria-expanded',x===bar?'true':'false'); });
      wrap.classList.add('hl'); tip.hidden=false; place(bar);
      requestAnimationFrame(function(){ tip.classList.add('on'); });
    }
    function hide(){
      cur=null; pinned=false; wrap.classList.remove('hl'); tip.classList.remove('on');
      bars.forEach(function(x){ x.classList.remove('on'); x.setAttribute('aria-expanded','false'); });
      rows.forEach(function(x){ x.classList.remove('flash'); });
      setTimeout(function(){ if(!cur) tip.hidden=true; },200);
    }
    function mark(cat){ tip.querySelectorAll('li').forEach(function(li){ li.classList.toggle('hit',!!cat&&li.dataset.cat===cat); }); }
    function flash(i){ rows.forEach(function(x){ x.classList.toggle('flash',x.dataset.row===String(i)); }); }
    bars.forEach(function(bar){
      bar.addEventListener('pointerenter',function(ev){ if(ev.pointerType==='mouse'&&!pinned){ show(bar); flash(bar.dataset.row); } });
      bar.addEventListener('pointermove',function(ev){ if(ev.pointerType!=='mouse'||cur!==bar) return; var sg=ev.target.closest('.sg'); mark(sg&&sg.dataset.cat); });
      bar.addEventListener('focus',function(){ if(!pinned) show(bar); });
      bar.addEventListener('click',function(ev){ ev.stopPropagation();
        if(pinned&&cur===bar){ hide(); return; }
        pinned=true; show(bar); flash(bar.dataset.row); });
    });
    wrap.addEventListener('pointerleave',function(ev){ if(ev.pointerType==='mouse'&&!pinned) hide(); });
    wrap.addEventListener('focusout',function(ev){ if(!pinned&&!wrap.contains(ev.relatedTarget)) hide(); });
    // 날짜별 구성 줄에 올리면 위 막대도 함께 표시
    rows.forEach(function(li){
      li.addEventListener('pointerenter',function(ev){ if(ev.pointerType==='mouse'&&!pinned){ var b=bars[+li.dataset.row]; if(b){ b.classList.add('on'); wrap.classList.add('hl'); } } });
      li.addEventListener('pointerleave',function(ev){ if(ev.pointerType==='mouse'&&!pinned&&!cur){ bars.forEach(function(x){x.classList.remove('on')}); wrap.classList.remove('hl'); } });
    });
    document.addEventListener('click',function(){ if(cur) hide(); });
    document.addEventListener('keydown',function(ev){ if(ev.key==='Escape'&&cur) hide(); });
    window.addEventListener('resize',function(){ if(cur) place(cur); });
  });
})();


// 여행 도구 묶음: 출발 전에는 '떠나기 전', 여행 중에는 '현지에서', 다녀온 뒤에는 '함께·기록'을 맨 앞에
(function(){
  var box=document.querySelector('.tgroups'), cf=document.getElementById('trip-cfg'); if(!box||!cf) return; var C=JSON.parse(cf.textContent);
  var q=new URLSearchParams(location.search).get('now'), n=q?new Date(q):new Date(), p=function(d){return String(d).padStart(2,'0')};
  var ds=n.getFullYear()+'-'+p(n.getMonth()+1)+'-'+p(n.getDate()), ph=!C.start||ds<C.start?'prep':(ds>C.end?'share':'local');
  var order={prep:['prep','local','share'],local:['local','share','prep'],share:['share','local','prep']}[ph];
  order.forEach(function(g){ var el=box.querySelector('[data-g="'+g+'"]'); if(el) box.appendChild(el); });
  var first=box.querySelector('[data-g="'+ph+'"] .tg-now'); if(first) first.hidden=false;
})();

// 이 여행에서 찾기: 팝업(장소·시간표·후보·도구)과 화면 제목을 한 번에 찾아 바로 연다
(function(){
  var dlg=document.getElementById('find'); if(!dlg) return;
  var inp=dlg.querySelector('.find-q'), out=dlg.querySelector('.find-r'), idx=null;
  var esc=function(x){ return String(x||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]}); };
  var norm=function(x){ return String(x||'').toLowerCase().replace(/\s+/g,' ').trim(); };
  var KIND={blk:'일정',pl:'장소',cg:'후보',alt:'플랜 B',tool:'도구',ov:'준비'};
  function build(){
    idx=[];
    document.querySelectorAll('dialog.sheet[id]').forEach(function(d){
      if(/^(find|welcome|sync-in|picks-all)$/.test(d.id)) return;
      var t=d.querySelector('.sheet-h b'), sub=d.querySelector('.sheet-h small'); if(!t) return;
      var k=d.id.split('-')[0];
      idx.push({open:d.id,kind:KIND[k]||'보기',t:t.textContent.trim(),s:sub?sub.textContent.trim():'',b:norm(d.querySelector('.sheet-b').textContent).slice(0,1500)});
    });
    document.querySelectorAll('main section[id] > h2, main section[id] .card > h3').forEach(function(h){
      var sec=h.closest('section[id]'); idx.push({go:sec.id,kind:'화면',t:h.textContent.trim(),s:'',b:''});
    });
    document.querySelectorAll('.daytabs button[data-pane]').forEach(function(b){ idx.push({go:b.dataset.pane,kind:'날짜',t:b.textContent.replace(/\s+/g,' ').trim(),s:'',b:''}); });
    // 팝업이 없는 도구(택시 카드·길찾기·쇼핑 리스트)는 타일을 대신 눌러 준다
    document.querySelectorAll('.tools .tool:not([data-open])').forEach(function(el,i){ var b=el.querySelector('b'), sm=el.querySelector('small'); el.dataset.fi=i; idx.push({tile:i,kind:'도구',t:b?b.textContent:'',s:sm?sm.textContent:'',b:''}); });
  }
  function run(){
    if(!idx) build();
    var q=norm(inp.value); if(!q){ out.innerHTML='<li class="find-empty">장소 이름, 음식, 도구 이름, "2일차"처럼 써 보세요.</li>'; return; }
    var ws=q.split(' '), hits=[];
    idx.forEach(function(x){ var tt=norm(x.t+' '+x.s), score=0;
      for(var i=0;i<ws.length;i++){ var w=ws[i]; if(tt.indexOf(w)>=0) score+=tt.indexOf(w)===0?3:2; else if(x.b.indexOf(w)>=0) score+=1; else return; }
      hits.push([score,x]); });
    hits.sort(function(a,b){return b[0]-a[0]});
    out.innerHTML=hits.length?hits.slice(0,40).map(function(h){ var x=h[1],
      attr=x.open?'data-open="'+esc(x.open)+'"':x.go?'data-goto="'+esc(x.go)+'"':'data-tile="'+x.tile+'"';
      return '<li><button type="button" '+attr+'><em>'+esc(x.kind)+'</em><b>'+esc(x.t)+'</b>'+(x.s?'<small>'+esc(x.s)+'</small>':'')+'</button></li>'; }).join('')
      :'<li class="find-empty">찾는 게 없어요. 다른 말로 써 보세요.</li>';
  }
  inp.addEventListener('input',run);
  out.addEventListener('click',function(ev){ var b=ev.target.closest('[data-tile]'); if(!b) return; dlg.close(); document.body.classList.remove('sheet-open');
    var el=document.querySelector('.tools .tool[data-fi="'+b.dataset.tile+'"]'); if(el) el.click(); });
  new MutationObserver(function(){ if(dlg.open){ run(); setTimeout(function(){inp.focus()},60); } }).observe(dlg,{attributes:true,attributeFilter:['open']});
})();
