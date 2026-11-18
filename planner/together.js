// ================================================================ 둘이 함께 (planner/together.py): 택1 함께 고르기 · 오늘의 질문 · 돌아보기
(function(){
  var cfgEl=document.getElementById('trip-cfg'); if(!cfgEl) return;
  var C=JSON.parse(cfgEl.textContent), slug=C.trip, names=(C.travelers||[]).map(function(x){return x.name});
  var LS={get:function(k,d){ try{ var v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } }, set:function(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }};
  var esc=function(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]}); };
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var josa=function(w,a,b){ var c=String(w).charCodeAt(String(w).length-1); return w+((c>=0xac00&&c<=0xd7a3&&(c-0xac00)%28)?a:b); };

  // ---------------------------------------------------------- 함께 고르기
  var CK='tp-ch-'+slug, st=LS.get(CK,{v:{},f:{},n:{}}); st.v=st.v||{}; st.f=st.f||{}; st.n=st.n||{};
  var opts=function(id){ var el=document.querySelector('.ch[data-ch="'+id+'"]'); return el?el.dataset.names.split('|'):[]; };
  function plan(id){ if(!window.TPPlan) return; var f=st.f[id]; window.TPPlan.set(id,f?opts(id)[f.i]:''); }
  function save(){ LS.set(CK,st); paint(); }
  function decide(id,i,by){ st.f[id]={i:i,by:by,ap:1,t:Date.now()}; if(names.indexOf(by)>=0){ st.n[by]=(st.n[by]||0)+1; st.last=by; } plan(id); save(); }
  // 갈렸을 때 차례: 지금까지 덜 정한 사람, 같으면 지난번에 안 정한 사람
  function turn(){ var ns=names.slice().sort(function(a,b){ var d=(st.n[a]||0)-(st.n[b]||0); return d||(a===st.last?1:b===st.last?-1:0); }); return ns[0]; }
  function paint(){
    var done=0, total=0;
    document.querySelectorAll('.ch[data-ch]').forEach(function(box){ var id=box.dataset.ch, v=st.v[id]||{}, f=st.f[id], os=opts(id), res=box.querySelector('.ch-res');
      box.querySelectorAll('.ch-o').forEach(function(o){ var i=+o.dataset.i; o.classList.toggle('won',!!f&&f.i===i); o.classList.toggle('lost',!!f&&f.i!==i);
        o.querySelectorAll('[data-vote]').forEach(function(b){ b.setAttribute('aria-pressed',v[b.dataset.vote]===i); }); });
      var voted=names.filter(function(n){return v[n]!=null}), h='';
      if(f) h='<p class="ch-done"><b>'+esc(os[f.i])+'</b>(으)로 정했어요 <small>'+(f.by==='둘 다'?'둘이 같은 곳을 골랐어요':f.by==='운'?'운에 맡겼어요':esc(f.by)+' 차례로 정했어요')+'</small></p><button type="button" class="btn" data-chx="reset">다시 고르기</button>';
      else if(names.length>1&&voted.length===names.length){ var w=turn();
        h='<p>의견이 갈렸어요. '+voted.map(function(n){return esc(n)+' '+esc(os[v[n]])}).join(' · ')+'</p><div class="row"><button type="button" class="btn primary" data-chx="turn">'+esc(w)+' 차례로 정하기</button><button type="button" class="btn" data-chx="luck">운에 맡기기</button></div>'
          +'<p class="ch-n">지금까지 '+names.map(function(n){return esc(n)+' '+(st.n[n]||0)+'번'}).join(', ')+' 정했어요</p>'; }
      else if(voted.length){ var left=names.filter(function(n){return v[n]==null}); h='<p>'+voted.map(function(n){return esc(josa(n,'이','가'))+' '+esc(os[v[n]])}).join(', ')+'을(를) 골랐어요. '+left.map(esc).join(', ')+' 차례예요.</p>'; }
      res.innerHTML=h; });
    // 목록 팝업·타일
    document.querySelectorAll('[data-chrow]').forEach(function(b){ var id=b.dataset.chrow, f=st.f[id], v=st.v[id]||{}, s=b.querySelector('.ch-st'), os=opts(id); total++;
      if(f){ done++; s.textContent=os[f.i]; s.className='ch-st ok'; } else if(Object.keys(v).length){ s.textContent='고르는 중'; s.className='ch-st mid'; } else { s.textContent='아직'; s.className='ch-st'; } });
    var sum=document.querySelector('.chl-sum'); if(sum) sum.innerHTML='<b>'+total+'곳 중 '+done+'곳 정했어요</b><div class="tf-bar"><i style="width:'+(total?done/total*100:0).toFixed(0)+'%"></i></div>'+(names.length>1?'<small>'+names.map(function(n){return esc(n)+' '+(st.n[n]||0)+'번'}).join(' · ')+' 차례로 정함</small>':'');
    var mini=document.querySelector('.ch-mini'); if(mini&&total) mini.textContent=done?total+'곳 중 '+done+'곳 정함':'택1 '+total+'곳 · 각자 고르기';
  }
  document.addEventListener('click',function(ev){
    var vb=ev.target.closest('[data-vote]'); if(vb){ var box=vb.closest('.ch'), id=box.dataset.ch, i=+vb.closest('.ch-o').dataset.i, n=vb.dataset.vote, v=st.v[id]=st.v[id]||{};
      if(st.f[id]) delete st.f[id];
      if(v[n]===i) delete v[n]; else v[n]=i;
      var vs=names.map(function(x){return v[x]}); if(vs.every(function(x){return x!=null})&&vs.every(function(x){return x===vs[0]})) return decide(id,vs[0],names.length>1?'둘 다':names[0]);
      plan(id); save(); return; }
    var x=ev.target.closest('[data-chx]'); if(!x) return; var bx=x.closest('.ch'), cid=bx.dataset.ch, cv=st.v[cid]||{};
    if(x.dataset.chx==='reset'){ var f=st.f[cid]; if(f&&names.indexOf(f.by)>=0&&st.n[f.by]) st.n[f.by]--; delete st.f[cid]; delete st.v[cid]; plan(cid); save(); return; }
    if(x.dataset.chx==='turn'){ var w=turn(); decide(cid,cv[w],w); return; }
    if(x.dataset.chx==='luck'){ var pool=names.map(function(n){return cv[n]}).filter(function(v,i,a){return v!=null&&a.indexOf(v)===i}), pick=pool[Math.floor(Math.random()*pool.length)];
      if(reduce) return decide(cid,pick,'운');
      var cards=bx.querySelectorAll('.ch-o'), k=0, steps=10+pool.indexOf(pick); x.disabled=true;
      (function spin(){ cards.forEach(function(c){ c.classList.toggle('spin',+c.dataset.i===pool[k%pool.length]); }); if(k++<steps) return setTimeout(spin,70+k*14);
        cards.forEach(function(c){c.classList.remove('spin')}); decide(cid,pick,'운'); })(); }
  });
  // 공유 링크로 받은 결정은 처음 한 번 시간표에 반영한다
  setTimeout(function(){ var ch=false; Object.keys(st.f).forEach(function(id){ if(!st.f[id].ap){ st.f[id].ap=1; plan(id); ch=true; } }); if(ch) LS.set(CK,st); paint(); },0);

  // ---------------------------------------------------------- 돌아보기 · 오늘의 질문
  var MK='tp-mem-'+slug, mem=LS.get(MK,{a:{}}); mem.a=mem.a||{};
  var Q=C.mem_q||[], body=document.querySelector('.mem-body'), tab='all', pics=null;
  var wd='일월화수목금토', md=function(ds){ var p=ds.split('-'); return (+p[1])+'/'+(+p[2])+' ('+wd[new Date(ds+'T12:00:00').getDay()]+')'; };
  function photos(){ if(pics) return Promise.resolve(pics); return new Promise(function(ok){ if(!window.indexedDB) return ok([]); var r=indexedDB.open('tp-photos',1);
    r.onupgradeneeded=function(){ r.result.createObjectStore('p',{keyPath:'id'}); };
    r.onsuccess=function(){ try{ var q=r.result.transaction('p','readonly').objectStore('p').getAll(); q.onsuccess=function(){ pics=(q.result||[]).filter(function(p){return p.trip===slug}).sort(function(a,b){return a.t-b.t}); pics.forEach(function(p){ p.url=URL.createObjectURL(p.blob); }); ok(pics); }; q.onerror=function(){ok([])}; }catch(e){ ok([]); } };
    r.onerror=function(){ok([])}; }); }
  function dayData(k){ var jr=LS.get('tp-log-'+slug,{d:{},s:{},m:{}}), d=C.days[k], out=[];
    d.blocks.forEach(function(b,j){ var id='blk-'+(k+1)+'-'+(j+1); if(jr.d[id]||jr.m[id]) out.push({id:id,place:b.place,s:(jr.s||{})[id]||0,m:(jr.m||{})[id]||''}); }); return out; }
  var stars=function(n){ return n?'<span class="mem-s">'+'★'.repeat(n)+'</span>':''; };
  function render(){ if(!body) return; photos().then(function(ps){
    document.querySelectorAll('.mem-days [data-md]').forEach(function(b){ b.setAttribute('aria-selected',b.dataset.md===String(tab)); });
    var h='';
    if(tab==='all'){
      var vis=0, best=[], ans=0;
      C.days.forEach(function(d,k){ dayData(k).forEach(function(x){ vis++; if(x.s>=4) best.push([x,k]); }); if(Object.keys(mem.a[k]||{}).some(function(n){return (mem.a[k][n]||'').trim()})) ans++; });
      best.sort(function(a,b){return b[0].s-a[0].s});
      h+='<div class="mem-hero"><small>'+md(C.start)+' — '+md(C.end)+'</small><b>'+esc(C.title_plain||'')+'</b><div class="mem-stats"><span><b>'+vis+'</b>다녀온 곳</span><span><b>'+ps.length+'</b>사진</span><span><b>'+ans+'/'+C.days.length+'</b>저녁 질문</span></div></div>';
      if(best.length) h+='<h4>별 넷 이상</h4><ul class="mem-best">'+best.slice(0,6).map(function(p){ return '<li><button type="button" data-open="'+p[0].id+'"><small>'+(p[1]+1)+'일차</small><b>'+esc(p[0].place)+'</b>'+stars(p[0].s)+'</button></li>'; }).join('')+'</ul>';
      h+='<ol class="mem-list">'+C.days.map(function(d,k){ var a=mem.a[k]||{}, first=names.map(function(n){return (a[n]||'').trim()}).filter(Boolean)[0], ph=ps.filter(function(p){return p.blk.indexOf('blk-'+(k+1)+'-')===0})[0];
        return '<li style="--i:'+k+'"><button type="button" data-md="'+k+'">'+(ph?'<img src="'+ph.url+'" alt="" loading="lazy">':'<i class="mem-ph">'+(k+1)+'</i>')+'<span><small>'+(k+1)+'일차 · '+md(d.date)+'</small><b>'+esc(Q[k]||'')+'</b><em>'+(first?esc(first):'아직 답이 없어요')+'</em></span></button></li>'; }).join('')+'</ol>';
      var endD=new Date(C.end+'T23:59:00'); if(Date.now()>endD-864e5) h+='<button type="button" class="btn primary mem-ics" data-mem="ics">1년 뒤 오늘, 다시 보기 알림 받기</button>';
    } else {
      var k=+tab, d=C.days[k], a=mem.a[k]||{}, items=dayData(k), dp=ps.filter(function(p){return p.blk.indexOf('blk-'+(k+1)+'-')===0});
      h+='<div class="mem-q"><small>'+(k+1)+'일차 · '+md(d.date)+' 저녁 질문</small><b>'+esc(Q[k]||'')+'</b></div>';
      h+=names.map(function(n,i){ return '<label class="mem-a"><span class="tone-'+esc((C.travelers[i]||{}).tone||'pri')+'">'+esc(n)+'</span><textarea rows="2" maxlength="300" data-mema="'+k+'" data-who="'+esc(n)+'" placeholder="짧게 한 줄이면 돼요">'+esc(a[n]||'')+'</textarea></label>'; }).join('');
      if(dp.length) h+='<div class="mem-pics">'+dp.slice(0,9).map(function(p){ return '<button type="button" class="pic" data-pid="'+p.id+'" aria-label="사진 크게 보기"><img src="'+p.url+'" alt="" loading="lazy"></button>'; }).join('')+'</div>';
      h+='<h4>다녀온 곳</h4>'+(items.length?'<ul class="mem-day">'+items.map(function(x){ return '<li><button type="button" data-open="'+x.id+'"><b>'+esc(x.place)+'</b>'+stars(x.s)+(x.m?'<p>'+esc(x.m)+'</p>':'')+'</button></li>'; }).join('')+'</ul>':'<p class="lead" style="margin:0">시간표 한 줄을 누르고 \'다녀왔어요\'를 누르면 여기에 쌓여요.</p>');
    }
    body.innerHTML=h; }); }
  document.addEventListener('click',function(ev){
    var t=ev.target.closest('[data-md]'); if(t&&t.closest('.mem')){ tab=t.dataset.md==='all'?'all':+t.dataset.md; render(); var sb=t.closest('.sheet-b'); if(sb) sb.scrollTop=0; return; }
    var o=ev.target.closest('[data-open="tool-mem"]'); if(o){ tab=o.dataset.memday!=null?+o.dataset.memday:'all'; pics=null; render(); }
    var ic=ev.target.closest('[data-mem="ics"]'); if(ic) ics();
  });
  document.addEventListener('input',function(ev){ var ta=ev.target.closest('[data-mema]'); if(!ta) return; var k=ta.dataset.mema; (mem.a[k]=mem.a[k]||{})[ta.dataset.who]=ta.value.slice(0,300); mem.e=Date.now(); LS.set(MK,mem); });
  // 1년 뒤 알림: 기기 캘린더에 넣는 .ics 파일 (어디에도 올라가지 않음)
  function ics(){ var e=new Date(C.end+'T12:00:00'); e.setFullYear(e.getFullYear()+1); var p=function(n){return String(n).padStart(2,'0')}, ds=e.getFullYear()+p(e.getMonth()+1)+p(e.getDate());
    var url=location.origin+location.pathname, t=(C.title_plain||'여행')+' 1년 · 돌아보기';
    var s=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//travel-planner//KO','BEGIN:VEVENT','UID:'+slug+'-1y@travel-planner','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z','DTSTART;VALUE=DATE:'+ds,'SUMMARY:'+t,'URL:'+url,'DESCRIPTION:1년 전 오늘 여행을 마쳤어요. 돌아보기에서 그날의 답과 사진을 다시 봐요. '+url,'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+t,'TRIGGER:PT9H','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
    var b=new Blob([s],{type:'text/calendar'}), u=URL.createObjectURL(b), a=document.createElement('a'); a.href=u; a.download=slug+'-1년.ics'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){URL.revokeObjectURL(u)},4000); }
  // 지금 카드: 여행 중 저녁 7시부터 오늘의 질문
  document.addEventListener('tp-now',function(ev){ var d=ev.detail||{}, nc=document.querySelector('.nowcard'); if(!nc||nc.hidden||d.di==null||d.di<0||d.mins<19*60||!Q[d.di]) return;
    if(nc.querySelector('.nc-mem')) return; var a=mem.a[d.di]||{}, n=names.filter(function(x){return (a[x]||'').trim()}).length;
    var b=document.createElement('button'); b.type='button'; b.className='nc-mem'; b.dataset.open='tool-mem'; b.dataset.memday=d.di;
    b.innerHTML='<small>오늘의 질문'+(n?' · '+n+'/'+names.length+' 답함':'')+'</small><b>'+esc(Q[d.di])+'</b>'; nc.appendChild(b); });
  var mm=document.querySelector('.mem-mini'); if(mm){ var na=Object.keys(mem.a).filter(function(k){ return names.some(function(n){return ((mem.a[k]||{})[n]||'').trim()}); }).length; if(na) mm.textContent='저녁 질문 '+na+'/'+(C.days||[]).length+'일 답함'; }
})();
