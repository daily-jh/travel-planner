// ================================================================ 여행자 편의 (planner/comfort.py 가 그린 화면을 움직인다)
// 오늘 챙길 것 · 쉼표(쉬어 갈 때) · 다음 여행 메모. ('택1' 함께 고르기는 planner/together.js) 모든 기록은 이 휴대폰 localStorage 에만 저장된다.
(function(){
  var cfgEl=document.getElementById('trip-cfg'); if(!cfgEl) return;
  var C=JSON.parse(cfgEl.textContent), slug=C.trip;
  var LS={get:function(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set:function(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
  var esc=function(x){ return String(x==null?'':x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]}); };
  var say=function(m){var t=document.querySelector('.toast'); if(!t) return; t.textContent=m; t.hidden=false; clearTimeout(say.t); say.t=setTimeout(function(){t.hidden=true},3200);};
  var q=new URLSearchParams(location.search).get('now');
  var localNow=function(){ return q?new Date(q):new Date(new Date().toLocaleString('en-US',{timeZone:C.timezone||'Asia/Tokyo'})); };
  var ymd=function(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  var md=function(ds){ var p=ds.split('-'); return (+p[1])+'/'+(+p[2]); };
  var WK='일월화수목금토';
  var wk=function(ds){ return WK[new Date(ds+'T12:00:00').getDay()]; };
  var days=C.days||[];

  // ---------------------------------------------------------- 오늘 챙길 것
  var CK='tp-carry-'+slug, cs=LS.get(CK,{c:{},a:{}}); cs.c=cs.c||{}; cs.a=cs.a||{};
  var carry=document.querySelector('.carry'), cmini=document.querySelector('.carry-mini'), cdi=null;
  // 여행 중이면 오늘, 저녁 6시 넘으면 내일, 여행 전이면 첫날
  function pickDay(){ var n=localNow(), ds=ymd(n), di=-1; days.forEach(function(d,i){ if(d.date===ds) di=i; });
    if(di>=0&&n.getHours()>=18&&days[di+1]) return {di:di+1,tmr:true};
    if(di>=0) return {di:di,tmr:false};
    return {di:ds>C.end?days.length-1:0,tmr:false}; }
  function itemsOf(di){ var d=days[di], ds=d.date, out=(C.carry&&C.carry[di]||[]).slice(), r=(window.tpRain||{})[ds];
    if(r>=40) out.splice(3,0,{id:'rain',t:'우산',why:'비 올 확률 '+r+'%',open:''});
    (cs.a[ds]||[]).forEach(function(x,k){ out.push({id:'a-'+k,t:x,why:'직접 추가',open:'',mine:true}); });
    return out; }
  function coOf(di){ return di===days.length-1?(C.checkout||[]):[]; }
  function left(di){ var ds=days[di].date, c=cs.c[ds]||{}, all=itemsOf(di).concat(coOf(di));
    return {all:all.length,left:all.filter(function(x){return !c[x.id]}).length}; }
  function li(x,on){ return '<li data-cid="'+esc(x.id)+'" tabindex="0" role="checkbox" aria-checked="'+!!on+'"'+(on?' class="done"':'')+'><span class="box"></span><span class="nm">'+esc(x.t)+(x.why?'<small>'+esc(x.why)+'</small>':'')+'</span>'
      +(x.open?'<button type="button" class="wh cab" data-open="'+esc(x.open)+'">보관함</button>':'')+(x.mine?'<button type="button" class="del" data-cdel="'+esc(x.id)+'" aria-label="지우기">✕</button>':'')+'</li>'; }
  function renderCarry(){
    if(!carry||!days.length) return; var p=pickDay(); if(cdi===null) cdi=p.di;
    var d=days[cdi], ds=d.date, c=cs.c[ds]||{};
    carry.querySelector('.carry-days').innerHTML=days.map(function(x,i){ return '<button type="button" role="tab" data-cd="'+i+'" aria-selected="'+(i===cdi)+'">'+(i+1)+'일차 '+md(x.date)+'</button>'; }).join('');
    var L=left(cdi);
    carry.querySelector('.carry-head').innerHTML='<b>'+md(ds)+'('+wk(ds)+') '+esc((C.day_theme||[])[cdi]||'')+'</b>'+(p.tmr&&cdi===p.di?' <em class="carry-tmr">내일</em>':'')
      +'<span>'+(L.left?L.left+'개 남았어요':'다 챙겼어요 ✓')+'</span>';
    carry.querySelector('.carry-list').innerHTML=itemsOf(cdi).map(function(x){ return li(x,c[x.id]); }).join('');
    var co=coOf(cdi), cob=carry.querySelector('.carry-co'); cob.hidden=!co.length; carry.querySelector('.carry-out').innerHTML=co.map(function(x){ return li(x,c[x.id]); }).join('');
    paintMini();
  }
  function paintMini(){ if(!cmini||!days.length) return; var p=pickDay(), ds=ymd(localNow()), pre=new Date(C.start+'T00:00:00'); pre.setDate(pre.getDate()-1);
    if(ds>C.end||ds<ymd(pre)){ cmini.textContent='나가기 전 한 번 보기'; return; }
    var L=left(p.di); cmini.textContent=(p.tmr||ds<C.start?'내일 ':'오늘 ')+(L.left?L.left+'개 남음':'다 챙김 ✓'); }
  if(carry){
    carry.addEventListener('click',function(ev){
      var tb=ev.target.closest('[data-cd]'); if(tb){ cdi=+tb.dataset.cd; renderCarry(); return; }
      var del=ev.target.closest('[data-cdel]'); if(del){ var ds=days[cdi].date, k=+del.dataset.cdel.slice(2); (cs.a[ds]||[]).splice(k,1); if(cs.c[ds]) Object.keys(cs.c[ds]).forEach(function(id){ if(/^a-/.test(id)) delete cs.c[ds][id]; }); LS.set(CK,cs); renderCarry(); return; }
      if(ev.target.closest('[data-open]')) return;
      var l=ev.target.closest('li[data-cid]'); if(!l) return; var ds2=days[cdi].date, id=l.dataset.cid; cs.c[ds2]=cs.c[ds2]||{};
      if(cs.c[ds2][id]) delete cs.c[ds2][id]; else cs.c[ds2][id]=1; LS.set(CK,cs);
      l.classList.toggle('done'); l.setAttribute('aria-checked',l.classList.contains('done'));
      var L=left(cdi); carry.querySelector('.carry-head span').textContent=L.left?L.left+'개 남았어요':'다 챙겼어요 ✓';
      if(!L.left) say('다 챙겼어요. 즐거운 하루 보내요!'); paintMini(); document.dispatchEvent(new Event('tp-carry'));
    });
    carry.addEventListener('keydown',function(ev){ if((ev.key==='Enter'||ev.key===' ')&&ev.target.matches('li[data-cid]')){ ev.preventDefault(); ev.target.click(); } });
    carry.querySelector('.carry-add').addEventListener('submit',function(ev){ ev.preventDefault(); var v=this.it.value.trim(); if(!v) return; var ds=days[cdi].date; (cs.a[ds]=cs.a[ds]||[]).push(v); LS.set(CK,cs); this.reset(); renderCarry(); });
    var dlg=document.getElementById('tool-carry'); if(dlg) new MutationObserver(function(){ if(dlg.open){ cdi=null; renderCarry(); } }).observe(dlg,{attributes:true,attributeFilter:['open']});
    document.addEventListener('tp-rain',renderCarry);
    renderCarry();
  }

  // ---------------------------------------------------------- 쉼표: 쉬는 줄 없이 오래 움직이면 근처 카페를 권한다
  // 피곤하면 다투기 쉽다는 조사에서. 카페·식사·숙소 줄을 쉼으로 보고, 마지막 쉼 뒤 150분이 넘었는데 다음 쉼이 45분 넘게 남았을 때만
  var tm=function(s){ var m=(s||'').match(/(\d{1,2}):(\d{2})/); return m?(+m[1])*60+(+m[2]):null; };
  var endOf=function(s){ var m=(s||'').match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/); return m?(+m[3])*60+(+m[4]):tm(s); };
  var REST=C.rest_types||[], RK='tp-rest-'+slug, rested=LS.get(RK,{});
  // 시각 없는 줄('점심', '오후')이 끼어 있으면 언제 쉬었는지 알 수 없으니 알리지 않는다
  function restInfo(di,mins){ var bl=days[di].blocks, ci=-1, next=null;
    bl.forEach(function(b,i){ var st=tm(b.time); if(st!==null&&st<=mins) ci=i; });
    if(ci<0) return null;
    for(var k=ci+1;k<bl.length;k++){ var s2=tm(bl[k].time); if(s2===null) return null; if(REST.indexOf(bl[k].type)>=0){ next=s2-mins; break; } }
    var last=null; for(var j=ci;j>=0;j--){ var b=bl[j], s1=tm(b.time); if(s1===null) return null; if(REST.indexOf(b.type)>=0){ last=Math.min(mins,endOf(b.time)||s1); break; } }
    if(last===null) last=tm(bl[0].time);
    var mine=rested[days[di].date]; if(mine&&mine<=mins&&mine>last) last=mine;
    return {since:mins-last,next:next,cur:bl[ci]}; }
  function hm(m){ return (m>=60?Math.floor(m/60)+'시간 ':'')+(m%60?m%60+'분':''); }
  function paintRest(d){ var nc=document.querySelector('.nowcard'); if(!nc||nc.hidden||nc.querySelector('.nc-rest')) return;
    if(d.mins<9*60||d.mins>21*60) return;
    var r=restInfo(d.di,d.mins); if(!r||r.since<150||(r.next!==null&&r.next<=45)||REST.indexOf(r.cur.type)>=0||r.cur.type==='이동') return;
    var area=r.cur&&r.cur.area||'', box=document.createElement('div'); box.className='nc-rest';
    box.innerHTML='<span class="nc-rest-i" aria-hidden="true">☕︎</span><div><b>쉼표 · '+hm(r.since)+' 동안 쉬지 않았어요</b><span>'+(r.next!==null?'다음 쉬는 곳까지 '+hm(r.next)+' · ':'')+'다리 쉬고 물 한 잔 하고 가요</span>'
      +'<div class="nc-rest-b"><button type="button" class="btn primary" data-open="tool-near" data-area="'+esc(area)+'" data-kind="cafe">'+(area?esc(area)+' 근처 ':'근처 ')+'카페</button><button type="button" class="btn ghost" data-rested>쉬었어요</button></div></div>';
    var near=nc.querySelector('.nc-near'); nc.insertBefore(box,near||null); }
  document.addEventListener('click',function(ev){ if(!ev.target.closest('[data-rested]')) return; var n=localNow(), ds=ymd(n); rested[ds]=n.getHours()*60+n.getMinutes(); LS.set(RK,rested);
    var x=document.querySelector('.nc-rest'); if(x) x.remove(); say('좋아요. 다시 힘내서 가요!'); });

  // 지금 카드에 '챙길 것' 칩
  document.addEventListener('tp-now',function(ev){ var d=ev.detail; if(!d||d.di<0) return; paintRest(d); if(!carry) return;
    var nc=document.querySelector('.nowcard .bcs'); if(!nc||nc.querySelector('.bc.carry-chip')) return;
    var p=pickDay(), L=left(p.di), s=document.createElement('span');
    s.className='bc carry-chip'+(L.left?' warn':' ok'); s.dataset.open='tool-carry'; s.setAttribute('role','button'); s.tabIndex=0;
    s.textContent=(p.tmr?'내일 ':'')+'챙길 것 '+(L.left?L.left+'개 남음':'다 챙김'); nc.insertBefore(s,nc.firstChild); });
  document.addEventListener('tp-carry',function(){ var x=document.querySelector('.nowcard .carry-chip'); if(x){ var p=pickDay(), L=left(p.di); x.className='bc carry-chip'+(L.left?' warn':' ok'); x.textContent=(p.tmr?'내일 ':'')+'챙길 것 '+(L.left?L.left+'개 남음':'다 챙김'); } });

  // ---------------------------------------------------------- 다음 여행 메모 (모든 여행이 같이 쓰는 기록)
  var LK='tp-lessons', les=document.querySelector('.les'), cat=(C.lesson_cats||['기타'])[0];
  function all(){ return LS.get(LK,[]); }
  function item(x,mine){ return '<li><span class="lc">'+esc(x.cat)+'</span><span class="nm">'+esc(x.t)+(mine?'':'<small>'+esc(x.name)+'</small>')+'</span>'+(mine?'<button type="button" class="del" data-ldel="'+esc(x.id)+'" aria-label="지우기">✕</button>':'')+'</li>'; }
  function renderLes(){ var A=all(), here=A.filter(function(x){return x.trip===slug}), past=A.filter(function(x){return x.trip!==slug});
    var m=document.querySelector('.les-mini'); if(m) m.textContent=here.length||past.length?('이번 '+here.length+'개'+(past.length?' · 지난 여행 '+past.length+'개':'')):'이번에 배운 것 남기기';
    if(les){
      les.querySelector('.les-cat').innerHTML=(C.lesson_cats||[]).map(function(c){return '<button type="button" data-lc="'+esc(c)+'" aria-pressed="'+(c===cat)+'">'+esc(c)+'</button>'}).join('');
      les.querySelector('.les-here').innerHTML=here.length?'<h4>이번 여행에서</h4><ul class="bag les-list">'+here.slice().reverse().map(function(x){return item(x,true)}).join('')+'</ul>':'<p class="lead" style="margin:14px 0 0">여행하면서 "다음엔 이렇게 하자" 싶은 게 생기면 바로 적어 두세요. 다음 여행의 짐 싸기·출발 준비 때 다시 보여 드려요.</p>';
      les.querySelector('.les-past').innerHTML=past.length?'<h4>지난 여행에서 배운 것</h4><ul class="bag les-list">'+past.slice().reverse().map(function(x){return item(x,false)}).join('')+'</ul>':''; }
    // 캐리어 짐 팝업 맨 위에 지난 여행의 '짐' 메모
    var bag=document.querySelector('#tool-bag .sheet-b'), box=bag&&bag.querySelector('.les-bag'), pk=past.filter(function(x){return x.cat==='짐'});
    if(bag){ if(!pk.length){ if(box) box.remove(); }
      else { if(!box){ box=document.createElement('div'); box.className='les-bag'; bag.insertBefore(box,bag.firstChild); }
        box.innerHTML='<b>지난 여행에서 배운 것</b><ul>'+pk.slice(-5).reverse().map(function(x){return '<li>'+esc(x.t)+' <small>'+esc(x.name)+'</small></li>'}).join('')+'</ul>'; } }
  }
  if(les){
    les.addEventListener('click',function(ev){ var b=ev.target.closest('[data-lc]'); if(b){ cat=b.dataset.lc; renderLes(); return; }
      var d=ev.target.closest('[data-ldel]'); if(d){ LS.set(LK,all().filter(function(x){return x.id!==d.dataset.ldel})); renderLes(); } });
    les.querySelector('.les-add').addEventListener('submit',function(ev){ ev.preventDefault(); var v=this.it.value.trim(); if(!v) return;
      var A=all(); A.push({id:Date.now().toString(36),trip:slug,name:C.short||slug,cat:cat,t:v,at:Date.now()}); LS.set(LK,A); this.reset(); renderLes(); say('다음 여행 준비 때 다시 보여 드릴게요'); });
  }
  renderLes();
})();
