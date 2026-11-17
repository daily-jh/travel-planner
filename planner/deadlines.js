// ================================================================ 예약 오픈·마감 알림 (planner/deadlines.py 가 그린 카드를 움직인다)
// 남은 시간을 세고, 24시간 안이면 시·분, 1시간 안이면 초까지 센다. '했어요'는 이 휴대폰(localStorage tp-dl-<여행>)에만 저장된다.
(function(){
  var boxes=[].slice.call(document.querySelectorAll('[data-dl]')); if(!boxes.length) return;
  var get=function(k){ try{ return JSON.parse(localStorage.getItem(k)||'{}')||{}; }catch(e){ return {}; } };
  var put=function(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
  var DAY=864e5, HOLD_OPEN=7*DAY, HOLD_DUE=DAY; // 열린 예약은 했어요 누를 때까지 일주일, 마감은 하루 동안 보여 준다
  var p2=function(n){ return String(n).padStart(2,'0'); };
  function left(ms,allday){
    if(allday||ms>=DAY){ // 하루 넘게 남으면 달력 날짜 차이로 센다
      var a=window.TPNow(), z=new Date(a.getTime()+ms); a.setHours(0,0,0,0); z.setHours(0,0,0,0);
      var d=Math.round((z-a)/DAY); if(d>=1) return 'D-'+d; if(allday) return '오늘'; }
    var s=Math.floor(ms/1000), h=Math.floor(s/3600), m=Math.floor(s%3600/60);
    return h?h+'시간 '+p2(m)+'분':p2(m)+':'+p2(s%60);
  }
  function paint(){
    var now=window.TPNow().getTime(), fast=false;
    boxes.forEach(function(box){
      var shown=0, soon=null, pend=0, did=0;
      box.querySelectorAll('li.dl').forEach(function(li){
        var at=new Date(li.dataset.at).getTime(), allday=li.dataset.allday==='1', ms=at-now, done=!!get(li.dataset.store)[li.dataset.id];
        var end=allday?at+DAY:at, open=li.classList.contains('k-open');
        var past=now>=end, hide=done?(past||box.classList.contains('dlhome')):(past&&now-end>(open?HOLD_OPEN:HOLD_DUE));
        li.hidden=hide; if(hide) return; shown++;
        li.classList.toggle('done',done); li.querySelector('.dl-done').setAttribute('aria-pressed',done);
        li.querySelector('.dl-done').textContent=done?'했어요 ✓':'했어요';
        var lab=li.querySelector('.dl-left'), st='';
        if(done){ lab.textContent='완료'; }
        else if(allday&&now>=at&&!past){ lab.textContent='오늘'; st='now'; }
        else if(!past&&now<at){ lab.textContent=left(ms,allday); st=ms<DAY?'soon':''; if(ms<3600e3) fast=true; }
        else { lab.textContent=open?'열렸어요':'마감'; st=open?'now':'gone'; }
        li.dataset.st=st;
        if(done) did++; if(!done&&st!=='gone'){ pend++; if(!soon||at<soon.at) soon={at:at,st:st,li:li}; }
      });
      box.hidden=!shown;
      var sum=box.querySelector('.dl-sum'), dot=box.querySelector('.dl-dot');
      if(sum) sum.textContent=soon&&soon.st==='now'?'지금 해야 해요':pend>1?'남은 '+pend+'건':!pend&&did?'모두 했어요':'';
      if(dot) dot.classList.toggle('off',!soon||(soon.st!=='soon'&&soon.st!=='now'));
    });
    clearTimeout(paint.t); paint.t=setTimeout(paint,fast?1000:30000);
  }
  document.addEventListener('click',function(ev){
    var b=ev.target.closest&&ev.target.closest('.dl-done'); if(!b) return;
    var li=b.closest('li.dl'), k=li.dataset.store, v=get(k); v[li.dataset.id]=!v[li.dataset.id]; if(!v[li.dataset.id]) delete v[li.dataset.id]; put(k,v);
    li.classList.add('pop'); setTimeout(function(){ li.classList.remove('pop'); },450);
    paint();
  });
  document.addEventListener('visibilitychange',function(){ if(!document.hidden) paint(); });
  paint();
})();

// 여행 목록: 다녀온 여행은 맨 아래로 (가까운 여행부터)
(function(){
  var list=document.querySelector('.trips'); if(!list) return;
  var today=window.TPNow(); today.setHours(0,0,0,0);
  [].slice.call(list.children).filter(function(a){ var d=a.querySelector('.dday[data-end]'); return d&&new Date(d.dataset.end+'T00:00:00')<today; })
    .reverse().forEach(function(a){ list.appendChild(a); });
})();
