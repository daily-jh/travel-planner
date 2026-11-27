// ================================================================ 내 좌석 (planner/seat.py): 기종 + 좌석번호 → 비행기 그림에서 일행 위치
(function(){
  var cfgEl=document.getElementById('trip-cfg'); if(!cfgEl) return;
  var C=JSON.parse(cfgEl.textContent), slug=C.trip, trav=C.travelers||[];
  var LS={get:function(k,d){ try{ var v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } }, set:function(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }};
  var esc=function(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]}); };

  // 기종별 보통 이코노미 배치: g 통로로 나뉜 좌석 묶음(왼쪽→오른쪽), r 줄 번호 범위, w 날개가 걸치는 줄(어림)
  var AC={
    'B737-800':{n:'보잉 737-800',g:['ABC','DEF'],r:[1,32],w:[11,20]},
    'B737-8':{n:'보잉 737-8 (MAX)',g:['ABC','DEF'],r:[1,32],w:[11,20]},
    'A320':{n:'에어버스 A320',g:['ABC','DEF'],r:[1,30],w:[9,18]},
    'A321':{n:'에어버스 A321',g:['ABC','DEF'],r:[1,38],w:[13,24]},
    'A321neo':{n:'에어버스 A321neo',g:['ABC','DEF'],r:[1,40],w:[14,25]},
    'A330-300':{n:'에어버스 A330-300',g:['AC','DEFG','HK'],r:[7,55],w:[25,36]},
    'B777-300ER':{n:'보잉 777-300ER',g:['ABC','DEFG','HJK'],r:[1,58],w:[26,40]},
    'B787-9':{n:'보잉 787-9',g:['ABC','DEF','HJK'],r:[1,50],w:[20,32]},
    'A350-900':{n:'에어버스 A350-900',g:['ABC','DEF','GHJ'],r:[1,50],w:[20,32]}
  };
  var DEF_AC='B737-800';
  var SK='tp-seat-'+slug, st=LS.get(SK,{f:{},x:[]}); st.f=st.f||{}; st.x=st.x||[];
  var normNo=function(n){ return String(n||'').toUpperCase().replace(/\s/g,'').replace(/^([A-Z]{2}|[A-Z]\d|\d[A-Z])0*(\d+)$/,'$1$2'); };
  function flights(){ return (C.flights||[]).map(function(f){ return {k:f.date+'-'+normNo(f.no),f:f,own:0}; })
    .concat(st.x.map(function(f){ return {k:f.date+'-'+normNo(f.no),f:f,own:1}; })); }
  function rec(k,f){ var r=st.f[k]=st.f[k]||{s:{}}; r.s=r.s||{}; if(!r.ac) r.ac=(f&&AC[f.aircraft]?f.aircraft:''); return r; }
  function save(){ LS.set(SK,st); }
  var parse=function(s){ var m=String(s||'').toUpperCase().replace(/\s/g,'').match(/^(\d{1,2})([A-K])$/); return m?{row:+m[1],col:m[2]}:null; };
  // 같은 첫 글자(지훈·지윤)면 끝 글자로 표시
  var tag=(function(){ var f=trav.map(function(x){return x.name.charAt(0)}), dup=f.some(function(c,i){return f.indexOf(c)!==i});
    return function(n){ return dup?n.slice(-1):n.charAt(0); }; })();
  var tone=function(n){ var t=trav.filter(function(x){return x.name===n})[0]; return t&&t.tone==='acc'?'acc':'pri'; };

  function where(a,p){ var gi=-1, ci=-1; a.g.forEach(function(g,i){ var j=g.indexOf(p.col); if(j>=0){ gi=i; ci=j; } }); if(gi<0) return null;
    var g=a.g[gi], edge=(gi===0&&ci===0)||(gi===a.g.length-1&&ci===g.length-1), aisle=!edge&&(ci===0||ci===g.length-1);
    var side=gi===0?'왼쪽':gi===a.g.length-1?'오른쪽':'가운데 블록';
    var span=a.r[1]-a.r[0]+1, fr=(p.row-a.r[0])/span, zone=fr<0.34?'앞쪽':fr<0.67?'가운데쯤':'뒤쪽';
    return {gi:gi,ci:ci,kind:edge?'창가':aisle?'통로':'가운데',side:side,zone:zone,wing:p.row>=a.w[0]&&p.row<=a.w[1],nth:p.row-a.r[0]+1}; }

  // 전체 그림: 기수가 오른쪽(→)이라 비행기 왼쪽(A)이 위에 온다
  function overview(a,seats){ var R=a.r[1]-a.r[0]+1, cols=a.g.join(''), u=7, ag=5, x0=34, y0=26;
    var H=cols.length*u+(a.g.length-1)*ag, W=R*u, o='';
    var cy=function(c){ var y=0; for(var i=0;i<a.g.length;i++){ var j=a.g[i].indexOf(c); if(j>=0) return y+j*u; y+=a.g[i].length*u+ag; } return 0; };
    var bx=x0-16, bw=W+16+42, by=y0-8, bh=H+16;
    o+='<path class="so-wing" d="M'+(x0+(a.w[0]-a.r[0])*u)+' '+by+' L'+(x0+(a.w[0]-a.r[0]+2)*u)+' 2 L'+(x0+(a.w[1]-a.r[0]+1)*u)+' 2 L'+(x0+(a.w[1]-a.r[0]+1)*u)+' '+by+' Z M'+(x0+(a.w[0]-a.r[0])*u)+' '+(by+bh)+' L'+(x0+(a.w[0]-a.r[0]+2)*u)+' '+(by+bh+y0-6)+' L'+(x0+(a.w[1]-a.r[0]+1)*u)+' '+(by+bh+y0-6)+' L'+(x0+(a.w[1]-a.r[0]+1)*u)+' '+(by+bh)+' Z"/>';
    o+='<path class="so-body" d="M'+bx+' '+by+' H'+(bx+bw-30)+' Q'+(bx+bw)+' '+(by+bh/2-6)+' '+(bx+bw)+' '+(by+bh/2)+' Q'+(bx+bw)+' '+(by+bh/2+6)+' '+(bx+bw-30)+' '+(by+bh)+' H'+bx+' Q'+(bx-8)+' '+(by+bh/2)+' '+bx+' '+by+' Z"/>';
    for(var r=0;r<R;r++){ for(var k=0;k<cols.length;k++) o+='<rect class="so-s" x="'+(x0+r*u+1)+'" y="'+(y0+cy(cols[k])+1)+'" width="'+(u-2)+'" height="'+(u-2)+'" rx="1.5"/>'; }
    seats.forEach(function(s){ var x=x0+(s.p.row-a.r[0])*u, y=y0+cy(s.p.col);
      o+='<rect class="so-me '+tone(s.n)+'" x="'+(x-1)+'" y="'+(y-1)+'" width="'+(u+2)+'" height="'+(u+2)+'" rx="2.5"/>'; });
    o+='<text class="so-t" x="'+(bx+bw-24)+'" y="'+(by-2)+'">앞 →</text>';
    return '<svg class="seat-ov" viewBox="0 0 '+(bx+bw+6)+' '+(by+bh+y0)+'" role="img" aria-label="비행기 전체에서 좌석 위치">'+o+'</svg>'; }

  // 가까이 보기: 기수가 위, 좌석 줄 앞뒤 2줄씩 (떨어져 있으면 ⋯ 로 잇는다)
  function detail(a,seats){ var cols=a.g.join(''), u=30, ag=18, x0=30, segs=[];
    seats.map(function(s){return s.p.row}).sort(function(x,y){return x-y}).forEach(function(r){ var lo=Math.max(a.r[0],r-2), hi=Math.min(Math.max(a.r[1],r),r+2), l=segs[segs.length-1];
      if(l&&lo<=l[1]+2) l[1]=Math.max(l[1],hi); else segs.push([lo,hi]); });
    var cx=function(c){ var x=0; for(var i=0;i<a.g.length;i++){ var j=a.g[i].indexOf(c); if(j>=0) return x0+x+j*u; x+=a.g[i].length*u+ag; } return 0; };
    var W=x0*2+cols.length*u+(a.g.length-1)*ag, y=26, o='', who={};
    seats.forEach(function(s){ (who[s.p.row+s.p.col]=who[s.p.row+s.p.col]||[]).push(s.n); });
    for(var k=0;k<cols.length;k++) o+='<text class="sd-c" x="'+(cx(cols[k])+u/2)+'" y="16">'+cols[k]+'</text>';
    segs.forEach(function(sg,i){ if(i) { o+='<text class="sd-gap" x="'+(W/2)+'" y="'+(y+12)+'">⋯ '+(sg[0]-segs[i-1][1]-1)+'줄 ⋯</text>'; y+=22; }
      for(var r=sg[0];r<=sg[1];r++){ var wing=r>=a.w[0]&&r<=a.w[1];
        o+='<text class="sd-r" x="'+(x0-8)+'" y="'+(y+u/2+4)+'">'+r+'</text>';
        if(wing) o+='<rect class="sd-w" x="0" y="'+y+'" width="5" height="'+u+'"/><rect class="sd-w" x="'+(W-5)+'" y="'+y+'" width="5" height="'+u+'"/>';
        for(var k2=0;k2<cols.length;k2++){ var c=cols[k2], n=who[r+c];
          o+='<rect class="sd-s'+(n?' me '+tone(n[0]):'')+'" x="'+(cx(c)+2)+'" y="'+(y+2)+'" width="'+(u-4)+'" height="'+(u-4)+'" rx="6"/>';
          if(n) o+='<text class="sd-n" x="'+(cx(c)+u/2)+'" y="'+(y+u/2+5)+'">'+esc(n.map(tag).join(''))+'</text>'; }
        y+=u; } });
    return '<svg class="seat-dt" viewBox="0 0 '+W+' '+(y+6)+'" role="img" aria-label="좌석 가까이 보기">'+o+'</svg>'; }

  function words(a,seats){ var L=[];
    seats.forEach(function(s){ var w=where(a,s.p); if(!w){ L.push('<li class="warn"><b>'+esc(s.n)+' '+esc(s.v)+'</b> 이 기종 배치엔 '+esc(s.p.col)+'열이 없어요. 기종을 확인해 주세요.</li>'); return; }
      L.push('<li><i class="dot '+tone(s.n)+'"></i><b>'+esc(s.n)+' '+esc(s.v)+'</b> '+(w.side==='가운데 블록'?'가운데 블록 ':w.side+' ')+w.kind+' · 앞에서 '+w.nth+'번째 줄('+w.zone+')'
        +(w.wing&&w.kind==='창가'?' · 날개 옆이라 창밖이 날개에 조금 가려요':'')+'</li>'); });
    if(seats.length===2){ var p=seats[0].p, q=seats[1].p, a1=where(a,p), b1=where(a,q), t='';
      if(a1&&b1){ if(p.row===q.row&&a1.gi===b1.gi) t=Math.abs(a1.ci-b1.ci)===1?'둘이 바로 옆자리예요.':'같은 줄, 한 칸 건너 앉아요.';
        else if(p.row===q.row){ var Lf=a1.gi<b1.gi?a1:b1, Rt=a1.gi<b1.gi?b1:a1; t=(Rt.gi-Lf.gi===1&&Lf.ci===a.g[Lf.gi].length-1&&Rt.ci===0)?'통로를 사이에 두고 나란히 앉아요.':'같은 줄인데 떨어져 있어요.'; }
        else t=Math.abs(p.row-q.row)+'줄 떨어져 있어요. 체크인할 때 옆자리로 바꿀 수 있는지 물어봐요.'; }
      if(t) L.push('<li class="pair">'+t+'</li>'); }
    var fr=seats.map(function(s){return s.p.row}).filter(Boolean); if(fr.length){ var mn=Math.min.apply(null,fr), span=a.r[1]-a.r[0]+1;
      L.push('<li class="sub">'+((mn-a.r[0])/span<0.4?'앞쪽이라 내릴 때 빨리 나가요. 입국심사 줄도 앞에 설 수 있어요.':'내릴 땐 앞문으로 나가는 게 보통이라 조금 기다려요. 짐은 좌석 근처 선반에 두면 편해요.')+'</li>'); }
    return '<ul class="seat-w">'+L.join('')+'</ul>'; }

  var WD='일월화수목금토';
  function card(it){ var f=it.f, r=rec(it.k,f), ac=r.ac||DEF_AC, a=AC[ac]||AC[DEF_AC];
    var d=f.date?new Date(f.date+'T00:00:00'):null, dl=d?(d.getMonth()+1)+'/'+d.getDate()+' ('+WD[d.getDay()]+')':'';
    var seats=trav.map(function(x){ var v=(r.s[x.name]||'').toUpperCase(); return {n:x.name,v:v,p:parse(v)}; }).filter(function(s){return s.p});
    var opts=Object.keys(AC).map(function(k){ return '<option value="'+k+'"'+(k===ac?' selected':'')+'>'+AC[k].n+'</option>'; }).join('');
    var h='<section class="seat-f" data-k="'+esc(it.k)+'"><div class="seat-h"><b>'+esc([f.airline,f.no].filter(Boolean).join(' '))+'</b><small>'+esc(dl+(f.dep?' '+f.dep:'')+(f.from||f.to?' · '+(f.from||'')+' → '+(f.to||''):(f.route?' · '+f.route:'')))+'</small>'
      +(it.own?'<button type="button" class="seat-rm" data-srm aria-label="이 항공편 지우기">✕</button>':'')+'</div>'
      +'<label class="seat-ac">기종 <select data-sac>'+opts+'</select>'+(r.ac?'':'<em>모르면 대표 배치로 표시해요</em>')+'</label>'
      +'<div class="seat-in">'+trav.map(function(x){ return '<label><span class="dot '+tone(x.name)+'"></span>'+esc(x.name)+'<input data-sn="'+esc(x.name)+'" value="'+esc(r.s[x.name]||'')+'" placeholder="예: 23A" maxlength="3" autocapitalize="characters" autocomplete="off" spellcheck="false"></label>'; }).join('')+'</div>';
    if(seats.length) h+=overview(a,seats)+detail(a,seats)+words(a,seats);
    else h+='<p class="seat-empty">좌석번호를 넣으면 비행기 그림에 표시돼요. 온라인 체크인·좌석 지정 뒤 탑승권에 있어요.</p>';
    h+='<p class="lead">기종의 일반적인 배치예요. 열·날개·좌석 종류는 항공사와 편명에 따라 달라질 수 있어요.</p>';
    if(f.seatmap_url) h+='<a class="seat-real" href="'+esc(f.seatmap_url)+'" target="_blank" rel="noopener">이 항공사 실제 좌석 배치 보기 ↗</a>';
    return h+'</section>'; }

  var box=document.querySelector('.seat');
  function paint(){ if(!box) return; var fs=flights();
    box.innerHTML=fs.length?fs.map(card).join(''):'<p class="seat-empty">아직 항공편이 없어요. 아래에서 편명을 추가해 주세요.</p>';
    var mini=document.querySelector('.seat-mini'); if(mini){ var got=[]; fs.forEach(function(it){ var r=st.f[it.k]; if(r&&r.s) trav.forEach(function(x){ if(r.s[x.name]) got.push(r.s[x.name]); }); });
      mini.textContent=got.length?got.slice(0,4).join(' · ')+(got.length>4?' …':''):'편명·좌석 넣으면 위치'; } }
  var tmr; function later(){ clearTimeout(tmr); tmr=setTimeout(paint,500); }
  if(box){
    box.addEventListener('input',function(ev){ var i=ev.target.closest('[data-sn]'); if(!i) return; var sec=i.closest('.seat-f'), k=sec.dataset.k, it=flights().filter(function(x){return x.k===k})[0];
      var v=i.value.toUpperCase().replace(/\s/g,''); if(i.value!==v) i.value=v; var r=rec(k,it&&it.f);
      if(v) r.s[i.dataset.sn]=v; else delete r.s[i.dataset.sn]; save(); if(!v||parse(v)) later(); });
    box.addEventListener('focusout',function(ev){ if(ev.target.matches&&ev.target.matches('[data-sn]')){ clearTimeout(tmr); if(!box.contains(ev.relatedTarget)||!ev.relatedTarget.matches('[data-sn]')) paint(); } });
    box.addEventListener('change',function(ev){ var s=ev.target.closest('[data-sac]'); if(!s) return; var k=s.closest('.seat-f').dataset.k; rec(k).ac=s.value; save(); paint(); });
    box.addEventListener('click',function(ev){ if(!ev.target.closest('[data-srm]')) return; var k=ev.target.closest('.seat-f').dataset.k;
      st.x=st.x.filter(function(f){ return f.date+'-'+normNo(f.no)!==k; }); delete st.f[k]; save(); paint(); });
    var af=document.querySelector('.seat-addf'); if(af) af.addEventListener('submit',function(ev){ ev.preventDefault(); var fd=new FormData(af), no=normNo(fd.get('no')); if(!no) return;
      st.x.push({no:no,date:String(fd.get('date')||''),route:String(fd.get('route')||'').trim().slice(0,30)}); save(); af.reset(); var dd=af.closest('details'); if(dd) dd.open=false; paint(); });
    paint();
  }

  // 예약·체크인 메일에서 편명·좌석·기종 찾기 (planner/live.js 예약 메일 붙여넣기가 부른다)
  function acOf(tx){ var m=tx.match(/(?:boeing\s*|\bB\s?)(7[3-8]7)(?:[\s-]?(MAX\s?8|800|8|9|300ER|300))?/i);
    if(m){ var n=m[1], v=(m[2]||'').toUpperCase().replace(/\s/g,'');
      if(n==='737') return /MAX|^8$/.test(v)?'B737-8':'B737-800'; if(n==='777') return 'B777-300ER'; if(n==='787') return 'B787-9'; return ''; }
    m=tx.match(/(?:airbus\s*|\bA\s?)(3[2-5]\d)(?:[\s-]?(neo|\d00))?/i);
    if(m){ var a=m[1]; if(a==='320') return 'A320'; if(a==='321') return /neo/i.test(m[2]||'')?'A321neo':'A321'; if(a==='330') return 'A330-300'; if(a==='350') return 'A350-900'; }
    return ''; }
  function scan(tx){ tx=String(tx||''); var seats=[], re=/(좌석|seat|座席)/gi, m;
    while((m=re.exec(tx))){ var part=tx.slice(m.index,m.index+90), r2=/(?:^|[^0-9A-Z])(\d{1,2}[A-K])(?![0-9A-Za-z])/g, q;
      while((q=r2.exec(part))) if(seats.indexOf(q[1])<0) seats.push(q[1]); }
    var fl=tx.match(/\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{2,4})\b/), no=fl?normNo(fl[1]+fl[2]):'';
    var it=flights().filter(function(x){ return normNo(x.f.no)===no; });
    return {no:no,seats:seats.slice(0,Math.max(trav.length,1)),ac:acOf(tx),it:it.length===1?it[0]:it[0]||null}; }
  function apply(sc){ if(!sc||!sc.it||(!sc.seats.length&&!sc.ac)) return ''; var r=rec(sc.it.k,sc.it.f);
    sc.seats.forEach(function(s,i){ if(trav[i]) r.s[trav[i].name]=s; }); if(sc.ac) r.ac=sc.ac; save(); paint();
    return sc.seats.map(function(s,i){ return trav[i]?trav[i].name+' '+s:s; }).join(', '); }
  window.TPSeat={scan:scan,apply:apply};
})();
