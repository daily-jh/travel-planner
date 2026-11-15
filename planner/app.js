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
    el.classList.add(el.tagName==='A'?'is-today':'today');
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
