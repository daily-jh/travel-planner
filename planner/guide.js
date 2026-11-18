// ================================================================ 여행지 안내 (planner/guide.py): 면세 환급 계산기·처리 순서, 에티켓 보기, 역사·문화
(function(){
  var cfgEl=document.getElementById('trip-cfg'); if(!cfgEl) return;
  var C=JSON.parse(cfgEl.textContent), slug=C.trip;
  var LS={get:function(k,d){ try{ var v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } }, set:function(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }};
  var fmt=function(n){ return Math.round(n).toLocaleString('ko-KR'); };
  var esc=function(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]}); };
  var press=function(group,btn){ group.querySelectorAll('button').forEach(function(b){ b.setAttribute('aria-pressed',b===btn); }); };

  // ---------------------------------------------------------- 탭 (면세·역사 팝업 안)
  function tabs(root,attr){ if(!root) return;
    root.addEventListener('click',function(ev){ var b=ev.target.closest('[role="tab"][data-'+attr+']'); if(!b) return; var k=b.dataset[attr];
      root.querySelectorAll('[role="tab"][data-'+attr+']').forEach(function(x){ x.setAttribute('aria-selected',x===b); });
      root.querySelectorAll('[data-'+attr+']:not([role="tab"])').forEach(function(p){ p.hidden=p.dataset[attr]!==k; }); }); }

  // ---------------------------------------------------------- 면세 환급 계산기
  var TF=C.taxfree, tf=document.querySelector('.tf');
  if(TF&&tf){
    tabs(tf,'tfp');
    var K='tp-tf-'+slug, st=LS.get(K,{items:[],fee:0,steps:{}}), sym=TF.sym;
    st.items=st.items||[]; st.steps=st.steps||{};
    var fx={krw:(C.currency&&C.currency.fallback_krw_per_100||0)/100, usd:TF.usdk||0, live:false};
    var form=tf.querySelector('.tf-form'), amt=tf.querySelector('.tf-amt'), store=tf.querySelector('.tf-store'), day=tf.querySelector('.tf-day'), live=tf.querySelector('.tf-live');
    var kind='in', rate=TF.rates[0].r, list=tf.querySelector('.tf-list'), sum=tf.querySelector('.tf-sum'), fee=tf.querySelector('.tf-fee input'), mini=document.querySelector('.tf-mini');
    fee.value=st.fee||0;
    var won=function(y){ return fx.krw?'₩'+fmt(y*fx.krw):''; };
    var today=function(){ var d=new Date(), tz=C.timezone||'Asia/Tokyo'; try{ return new Intl.DateTimeFormat('en-CA',{timeZone:tz}).format(d); }catch(e){ return d.toISOString().slice(0,10); } };
    // 여행 중이면 오늘 날짜를 고른다
    (function(){ var t=today(); if(day.querySelector('option[value="'+t+'"]')) day.value=t; })();
    function split(v,k,r){ v=+v||0; if(k==='ex') return {ex:v,tax:v*r/100,paid:v*(1+r/100)}; var tax=v*r/(100+r); return {ex:v-tax,tax:tax,paid:v}; }
    function preview(){ var v=+amt.value||0; if(!v){ live.innerHTML='금액을 넣으면 세금 뺀 값과 돌려받을 돈이 바로 보여요.'; return; }
      var s=split(v,kind,rate), key=(store.value.trim()||'?')+'|'+(day.value||today()), same=0;
      st.items.forEach(function(x){ if(x.store+'|'+x.date===key) same+=x.ex; });
      var tot=same+s.ex, gap=TF.min-tot;
      live.innerHTML='세금 빼고 <b>'+sym+fmt(s.ex)+'</b> · 소비세 <b>'+sym+fmt(s.tax)+'</b>'+(fx.krw?' <small>('+won(s.tax)+')</small>':'')
        +'<br>'+(gap>0?'<span class="no">'+(same?'같은 가게 오늘 합계 '+sym+fmt(tot)+' · ':'')+'기준까지 '+sym+fmt(gap)+' 더 사야 해요</span>':'<span class="ok">면세 기준을 넘어요'+(same?' (같은 가게 오늘 합계 '+sym+fmt(tot)+')':'')+'</span>'); }
    function groups(){ var g={}, order=[];
      st.items.forEach(function(x){ var k=x.store+'|'+x.date; if(!g[k]){ g[k]={store:x.store,date:x.date,ex:0,tax:0,paid:0,items:[]}; order.push(k); } var o=g[k]; o.ex+=x.ex; o.tax+=x.tax; o.paid+=x.paid; o.items.push(x); });
      return order.map(function(k){return g[k]}).sort(function(a,b){ return a.date<b.date?-1:a.date>b.date?1:0; }); }
    function md(ds){ var p=ds.split('-'); return (+p[1])+'/'+(+p[2]); }
    function render(){
      var gs=groups(), f=Math.max(0,Math.min(30,+fee.value||0))/100, back=0, ok=0, paid=0, near=null;
      list.innerHTML=gs.map(function(g){ var pass=g.ex>=TF.min, pct=Math.min(100,g.ex/TF.min*100), r=g.tax*(1-f); paid+=g.paid; if(pass){ back+=r; ok++; } else if(!near||g.ex>near.ex) near=g;
        return '<li class="'+(pass?'pass':'')+'"><div class="tf-gh"><b>'+esc(g.store)+'</b><small>'+md(g.date)+' · 영수증 '+g.items.length+'장</small><em>'+(pass?'돌려받을 돈 '+sym+fmt(r):sym+fmt(TF.min-g.ex)+' 더')+'</em></div>'
          +'<div class="tf-bar" role="progressbar" aria-valuemin="0" aria-valuemax="'+TF.min+'" aria-valuenow="'+Math.round(g.ex)+'" aria-label="면세 기준까지"><i style="width:'+pct.toFixed(1)+'%"></i></div>'
          +'<ul>'+g.items.map(function(x){ return '<li><span>'+sym+fmt(x.paid)+' <small>'+x.r+'% · 세금 빼고 '+sym+fmt(x.ex)+(x.src?' · 함께 쓴 돈':'')+'</small></span><button type="button" class="del" data-tfdel="'+x.id+'" aria-label="지우기">✕</button></li>'; }).join('')+'</ul></li>'; }).join('');
      var home=TF.usd&&fx.usd?TF.usd*fx.usd:0, hp=home?Math.min(100,paid*fx.krw/home*100):0;
      sum.innerHTML=st.items.length?'<div class="tf-big"><small>돌려받을 돈 (예상)</small><b>'+sym+fmt(back)+'</b><span>'+won(back)+'</span></div>'
        +'<div class="tf-kv"><span>면세 되는 가게 <b>'+ok+' / '+gs.length+'</b></span><span>쓴 돈 <b>'+sym+fmt(paid)+'</b> '+won(paid)+'</span></div>'
        +(near?'<p class="tf-hint">'+esc(near.store)+'에서 '+sym+fmt(TF.min-near.ex)+'만 더 사면 '+sym+fmt(split(TF.min,'ex',10).tax*(1-f))+' 안팎을 돌려받아요. 같은 날 사야 해요.</p>':'')
        +(home?'<div class="tf-home"><div><small>한국 1인 면세 한도 $'+TF.usd+' (둘이면 각자)'+(fx.live?'':' · 환율 어림')+'</small><b>'+Math.round(hp)+'%</b></div><div class="tf-bar'+(hp>=100?' over':'')+'"><i style="width:'+hp.toFixed(1)+'%"></i></div>'
          +(hp>=100?'<p>한 사람 한도를 넘었어요. 나눠 들거나 입국할 때 자진 신고해요.</p>':'')+'</div>':'')
        :'<p class="lead tf-empty">영수증을 담으면 가게·날짜별로 모아 면세 기준을 넘었는지, 얼마를 돌려받을지 보여 줘요.</p>';
      if(mini) mini.textContent=st.items.length?'돌려받을 돈 '+sym+fmt(back):sym+fmt(TF.min)+' 넘는지·돌려받을 돈';
      preview();
    }
    function save(){ LS.set(K,st); render(); }
    form.addEventListener('click',function(ev){ var b=ev.target.closest('[data-k]'); if(b){ kind=b.dataset.k; press(b.parentNode,b); preview(); return; }
      var r=ev.target.closest('[data-r]'); if(r){ rate=+r.dataset.r; press(r.parentNode,r); preview(); } });
    [amt,store,day].forEach(function(x){ x.addEventListener('input',preview); x.addEventListener('change',preview); });
    form.addEventListener('submit',function(ev){ ev.preventDefault(); var v=+amt.value||0; if(v<=0){ amt.focus(); return; }
      var s=split(v,kind,rate); st.items.push({id:Date.now().toString(36),store:store.value.trim()||'가게',date:day.value||today(),r:rate,ex:s.ex,tax:s.tax,paid:s.paid});
      amt.value=''; save(); amt.focus(); });
    fee.addEventListener('input',function(){ st.fee=+fee.value||0; save(); });
    tf.addEventListener('click',function(ev){
      var d=ev.target.closest('[data-tfdel]'); if(d){ st.items=st.items.filter(function(x){return x.id!==d.dataset.tfdel}); save(); return; }
      var a=ev.target.closest('[data-tf]'); if(!a) return;
      if(a.dataset.tf==='clear'){ if(!st.items.length) return; a.textContent==='정말 지울까요?'?(st.items=[],save(),a.textContent='모두 지우기'):(a.textContent='정말 지울까요?',setTimeout(function(){a.textContent='모두 지우기'},3000)); return; }
      if(a.dataset.tf==='import'){ var ex=LS.get('tp-exp-'+slug,[]), have={}, n=0; st.items.forEach(function(x){ if(x.src) have[x.src]=1; });
        ex.forEach(function(x){ if(!x.tf||have[x.id]) return; var s=split(x.amt,'in',10); st.items.push({id:'e'+x.id,src:x.id,store:x.what||'가게',date:x.date,r:10,ex:s.ex,tax:s.tax,paid:s.paid}); n++; });
        save(); a.textContent=n?n+'건 불러왔어요':'새로 불러올 면세 기록이 없어요'; setTimeout(function(){a.textContent='함께 쓴 돈의 면세 기록 불러오기'},2600); }
    });
    // 처리 순서 체크
    var prog=tf.querySelector('.tf-prog'), cks=tf.querySelectorAll('.tf-ck');
    function steps(){ var n=0; cks.forEach(function(b){ var on=!!st.steps[b.dataset.st]; b.setAttribute('aria-pressed',on); b.closest('li').classList.toggle('done',on); if(on) n++; }); prog.textContent=n?n+'/'+cks.length:''; }
    tf.addEventListener('click',function(ev){ var b=ev.target.closest('.tf-ck'); if(!b) return; st.steps[b.dataset.st]=!st.steps[b.dataset.st]; LS.set(K,st); steps(); });
    steps(); render();
    // 환율: 원화와 달러(한국 면세 한도) 한 번에. 안 되면 기본값으로 어림
    fetch('https://open.er-api.com/v6/latest/USD').then(function(r){return r.json()}).then(function(j){
      if(j&&j.rates&&j.rates.KRW&&j.rates[TF.code]){ fx.usd=j.rates.KRW; fx.krw=j.rates.KRW/j.rates[TF.code]; fx.live=true; render(); } }).catch(function(){});
  }

  // ---------------------------------------------------------- 에티켓: 단계 거르기
  var ef=document.querySelector('.etq-f');
  if(ef) ef.addEventListener('click',function(ev){ var b=ev.target.closest('[data-lv]'); if(!b) return; press(ef,b); var lv=b.dataset.lv, sh=document.getElementById('tool-etq');
    sh.querySelectorAll('.etq li').forEach(function(li){ li.hidden=lv!=='all'&&!li.classList.contains('lv-'+lv); });
    sh.querySelectorAll('.etq-c').forEach(function(s){ s.hidden=!s.querySelector('.etq li:not([hidden])'); }); });

  // ---------------------------------------------------------- 역사·문화: 탭, 장면으로 바로 가기
  var his=document.querySelector('.his'); tabs(his,'hp');
  function scene(k){ if(!his) return; var t=his.querySelector('[role="tab"][data-hp="h"]'); if(t) t.click(); var li=document.getElementById('his-'+k); if(!li) return;
    li.classList.remove('flash'); void li.offsetWidth; li.classList.add('flash'); setTimeout(function(){ li.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}); },60); }
  document.addEventListener('click',function(ev){ var a=ev.target.closest('[data-his]'); if(!a) return;
    if(a.tagName==='A') ev.preventDefault();
    setTimeout(function(){ scene(a.dataset.his); }, a.dataset.open?380:0); });
})();
