document.querySelectorAll('.route').forEach(function(card){
  var frame=card.querySelector('iframe'), cap=card.querySelector('.mapcap b');
  card.querySelectorAll('li a[data-q]').forEach(function(a){
    a.addEventListener('click',function(ev){
      if(ev.metaKey||ev.ctrlKey||ev.shiftKey) return;
      ev.preventDefault();
      frame.src='https://maps.google.com/maps?q='+encodeURIComponent(a.dataset.q)+'&z=15&hl=ko&output=embed';
      cap.textContent=a.dataset.label;
      card.querySelectorAll('li a').forEach(function(x){x.classList.remove('on')});
      a.classList.add('on');
    });
  });
});
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
