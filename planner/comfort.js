// ================================================================ 여행자 편의 (planner/comfort.py 가 그린 화면을 움직인다)
// 오늘 챙길 것 · 둘이 고르기(양보 저울) · 다음 여행 메모. 모든 기록은 이 휴대폰 localStorage 에만 저장된다.
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
  // 받침에 따라 조사 고르기: j('지훈','이','가') → '지훈이'
  var j=function(w,a,b){ var c=String(w).charCodeAt(String(w).length-1); return w+((c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28)?a:b); };

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

  // ---------------------------------------------------------- 둘이 고르기 + 양보 저울
  var DK='tp-duo-'+slug, ds0=LS.get(DK,{d:{},y:{}}); ds0.d=ds0.d||{}; ds0.y=ds0.y||{};
  var duo=document.querySelector('.duo'), TR=(C.travelers||[]).slice(0,2).map(function(x){return x.name}), CH=C.choices||[];
  var chOf=function(id){ return CH.filter(function(c){return c.id===id})[0]; };
  function ylen(n){ return ds0.y[n]||0; }
  // 양보를 더 많이 한 사람의 픽이 먼저. 같으면 제비뽑기
  function favored(){ var a=ylen(TR[0]), b=ylen(TR[1]); return a>b?TR[0]:b>a?TR[1]:''; }
  function scale(){ if(!duo) return; var a=ylen(TR[0]), b=ylen(TR[1]), t=a+b, f=favored(), tilt=t?Math.max(-4,Math.min(4,(b-a)*1.5)):0;
    duo.querySelector('.duo-scale').innerHTML='<div class="sc-beam" style="--tilt:'+tilt+'deg"><span><b>'+esc(TR[0])+'</b> 양보 '+a+'</span><i aria-hidden="true">♡</i><span><b>'+esc(TR[1])+'</b> 양보 '+b+'</span></div>'
      +'<p>'+(f?'다음에 서로 다르면 <b>'+esc(f)+'</b> 픽으로 해요 (양보를 더 했으니까요)':'지금은 똑같아요. 다음에 다르면 제비뽑기')+'</p>'; }
  function decided(id){ return ds0.d[id]; }
  function listDuo(){ if(!duo) return; var by={}, h='';
    CH.forEach(function(c){ (by[c.day]=by[c.day]||[]).push(c); });
    Object.keys(by).forEach(function(di){ var d=days[+di]; h+='<h4>'+(+di+1)+'일차 · '+md(d.date)+'('+wk(d.date)+')</h4><ul class="duo-ch">';
      by[di].forEach(function(c){ var r=decided(c.id);
        h+='<li><div><small>'+esc(c.time)+' · '+esc(c.slot)+'</small><b>'+(r?'♡ '+esc(r.pick):esc(c.opts.join(' / ')))+'</b>'+(r?'<span>'+esc(how(r))+'</span>':'')+'</div>'
          +'<button type="button" class="btn'+(r?'':' primary')+'" data-duo="'+esc(c.id)+'">'+(r?'다시':'고르기')+'</button></li>'; });
      h+='</ul>'; });
    duo.querySelector('.duo-list').innerHTML=h; scale();
    var m=document.querySelector('.duo-mini'), n=CH.filter(function(c){return !decided(c.id)}).length; if(m) m.textContent=n?'고를 곳 '+n+'군데 · 양보 저울':'다 골랐어요 ♡';
  }
  function how(r){ return r.how==='same'?'둘 다 같은 곳!':r.how==='any'?'한 사람이 아무거나 좋다고 해서':r.how==='rand'?'제비뽑기로':r.who?j(r.who,'이','가')+' 양보했어요':''; }
  var st=null, stage=duo&&duo.querySelector('.duo-stage');
  function optBtns(c){ return '<div class="duo-opts">'+c.opts.map(function(o,k){return '<button type="button" class="btn" data-dpick="'+k+'">'+esc(o)+'</button>'}).join('')+'<button type="button" class="btn ghost" data-dpick="-1">아무거나 좋아</button></div>'; }
  function paintStage(){ if(!stage) return; if(!st){ stage.hidden=true; duo.querySelector('.duo-list').hidden=false; return; }
    duo.querySelector('.duo-list').hidden=true; stage.hidden=false; var c=chOf(st.id), h='<p class="duo-q"><small>'+esc(c.time)+' · '+esc(c.slot)+'</small></p>';
    if(st.step===0||st.step===2){ var me=TR[st.step/2], other=TR[1-st.step/2];
      h+='<div class="duo-turn"><b>'+esc(me)+' 차례</b><span>'+esc(j(other,'은','는'))+' 화면을 보지 말아 주세요</span></div>'+optBtns(c); }
    else if(st.step===1){ h+='<div class="duo-hand"><span aria-hidden="true">🤲</span><b>휴대폰을 '+esc(TR[1])+'에게 건네주세요</b><button type="button" class="btn primary" data-dnext>'+esc(j(TR[1],'이','가'))+' 받았어요</button></div>'; }
    else { var a=st.p[0], b=st.p[1], A=a<0?null:c.opts[a], B=b<0?null:c.opts[b];
      if(A&&B&&A===B) h+=reveal(true,A,'둘 다 '+A+'!');
      else if(!A&&!B) h+=reveal(false,'','둘 다 아무거나 좋대요')+'<div class="duo-opts"><button type="button" class="btn primary" data-dset="rand">제비뽑기</button></div>';
      else if(!A||!B) h+=reveal(true,A||B,j(A?TR[1]:TR[0],'은','는')+' 아무거나 좋대요 → '+(A||B));
      else { var f=favored();
        h+='<div class="duo-diff"><div><small>'+esc(TR[0])+'</small><b>'+esc(A)+'</b></div><i>vs</i><div><small>'+esc(TR[1])+'</small><b>'+esc(B)+'</b></div></div>'
          +'<p class="lead" style="margin:10px 0">'+(f?'양보 저울로는 <b>'+esc(f)+'</b> 차례예요.':'양보 저울이 똑같아요. 제비뽑기 어때요?')+'</p>'
          +'<div class="duo-opts">'+[0,1].map(function(k){ var by=TR[k], y=TR[1-k]; return '<button type="button" class="btn'+(f===by?' primary':'')+'" data-dset="'+k+'">'+esc(st.p[k]<0?'':c.opts[st.p[k]])+' <small>('+esc(y)+' 양보)</small></button>'; }).join('')
          +'<button type="button" class="btn'+(f?'':' primary')+'" data-dset="rand">제비뽑기</button></div>'; } }
    h+='<button type="button" class="btn ghost duo-cancel" data-dcancel>그만두기</button>';
    stage.innerHTML=h; var fb=stage.querySelector('.btn'); if(fb) fb.focus({preventScroll:true}); }
  function reveal(ok,pick,msg){ if(ok){ st.res={pick:pick,how:/아무거나/.test(msg)?'any':'same'}; }
    return '<div class="duo-reveal'+(ok?' ok':'')+'"><span aria-hidden="true">♡</span><b>'+esc(msg)+'</b></div>'+(ok?'<div class="duo-opts"><button type="button" class="btn primary" data-dsave>이걸로 정하기</button></div>':''); }
  function save(r){ ds0.d[st.id]=Object.assign({at:Date.now()},r); if(r.who) ds0.y[r.who]=(ds0.y[r.who]||0)+1; LS.set(DK,ds0); say('♡ '+r.pick+'(으)로 정했어요'); st=null; paintStage(); listDuo(); paintDecided(); }
  if(duo){
    duo.addEventListener('click',function(ev){ var b;
      if((b=ev.target.closest('[data-duo]'))){ var id=b.dataset.duo, old=ds0.d[id]; if(old&&old.who&&ds0.y[old.who]) ds0.y[old.who]--; delete ds0.d[id]; LS.set(DK,ds0); st={id:id,step:0,p:[]}; paintStage(); return; }
      if((b=ev.target.closest('[data-dpick]'))){ st.p.push(+b.dataset.dpick); st.step++; paintStage(); return; }
      if(ev.target.closest('[data-dnext]')){ st.step=2; paintStage(); return; }
      if(ev.target.closest('[data-dcancel]')){ st=null; paintStage(); listDuo(); return; }
      if(ev.target.closest('[data-dsave]')){ save(st.res); return; }
      if((b=ev.target.closest('[data-dset]'))){ var c=chOf(st.id), v=b.dataset.dset;
        if(v==='rand'){ var pool=st.p.filter(function(x){return x>=0}).map(function(x){return c.opts[x]}); if(!pool.length) pool=c.opts; var pk=pool[Math.floor(Math.random()*pool.length)];
          stage.querySelector('.duo-opts').innerHTML='<div class="duo-reveal ok spin"><span aria-hidden="true">♧</span><b>'+esc(pk)+'</b></div>';
          setTimeout(function(){ save({pick:pk,how:'rand'}); },900); return; }
        var k=+v; save({pick:c.opts[st.p[k]],how:'yield',who:TR[1-k]}); }
    });
    var dd=document.getElementById('tool-duo'); if(dd) new MutationObserver(function(){ if(!dd.open){ st=null; paintStage(); } }).observe(dd,{attributes:true,attributeFilter:['open']});
    listDuo();
  }
  // 고른 곳을 시간표·지금 카드에 표시
  function paintDecided(){ CH.forEach(function(c){ var r=decided(c.id);
    document.querySelectorAll('tr[data-open="'+c.id+'"] td.place').forEach(function(td){ var t=td.querySelector('.duo-tag'); if(!r){ if(t) t.remove(); return; }
      if(!t){ t=document.createElement('span'); t.className='fl duo-tag'; td.appendChild(t); } t.textContent='♡ '+r.pick; });
    document.querySelectorAll('.nowcard .nc-row[data-open="'+c.id+'"] b').forEach(function(b){ if(r&&!b.querySelector('.swp')) b.innerHTML=esc(c.slot)+' · '+esc(r.pick)+' <i class="swp">고름</i>'; }); }); }
  paintDecided();

  // 지금 카드에 '챙길 것' 칩
  document.addEventListener('tp-now',function(ev){ var d=ev.detail; paintDecided(); if(!d||d.di<0||!carry) return;
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
