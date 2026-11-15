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
  document.querySelectorAll('[data-start]').forEach(function(el){
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
    if(o){ var d=document.getElementById(o.dataset.open); if(d&&d.showModal){ var acc=o.closest('[class*="c-"]'); if(acc) d.style.setProperty('--accent',getComputedStyle(acc).getPropertyValue('--accent')); d.showModal(); document.body.classList.add('sheet-open'); } return; }
    if(ev.target.closest('[data-close]')){ close(ev.target.closest('dialog')); return; }
    if(ev.target.tagName==='DIALOG'&&ev.target.classList.contains('sheet')){ close(ev.target); }
  });
  document.querySelectorAll('dialog.sheet').forEach(function(d){ d.addEventListener('close',function(){document.body.classList.remove('sheet-open')}); });
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
