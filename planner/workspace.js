(() => {
  'use strict';
  const root = document.querySelector('#travel-work');
  if (!root) return;
  const catalog = JSON.parse(document.querySelector('#travel-catalog').textContent);
  const storeKey = 'travel-work-v1';
  const read = (key, fallback) => { try {return JSON.parse(localStorage.getItem(key)) || fallback;} catch {return fallback;} };
  let data = read(storeKey,{places:{},drafts:[]});
  const id = () => crypto.randomUUID();
  const placeKey = p => JSON.stringify([p.city,p.name]);
  const clock = t => Number(t.slice(0,2))*60+Number(t.slice(3));
  const fmt = n => (n>=1440?'익일 ':'')+String(Math.floor(n/60)%24).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
  const validTime = t => typeof t==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
  function node(parent,tag,label,cls) {
    const el=document.createElement(tag); if(label) el.textContent=label;
    if(cls) el.className=cls; parent.append(el); return el;
  }
  const notice=node(root,'p');notice.setAttribute('role','status');
  function save() { try {localStorage.setItem(storeKey,JSON.stringify(data));return true;} catch {notice.textContent='저장 공간이 부족하거나 접근할 수 없습니다.';return false;} }
  function button(parent,label,run) {const b=node(parent,'button',label,'btn');b.type='button';b.onclick=run;return b;}
  function field(parent,label,type,value) {
    const wrap=node(parent,'label',label+' ');const el=node(wrap,'input');el.type=type;el.value=value??'';return el;
  }
  function choice(parent,label,items) {const wrap=node(parent,'label',label+' '),s=node(wrap,'select');for(const x of items)s.add(new Option(x,x));return s;}
  function link(parent,label,url) {const a=node(parent,'a',label,'btn');a.href=url;a.target='_blank';a.rel='noopener';}
  function part(label) {const box=node(root,'details','','card');node(box,'summary',label);return box;}
  const library=part('장소 보관함 · 사진 기록'), maker=part('새 여행 만들기'), drafts=part('저장한 여행 · 일정 공유'), ledger=part('기존 여행 예산 비교');
  const city=choice(library,'여행지',['전체',...new Set(catalog.map(p=>p.city))]);
  const search=field(library,'장소 검색','search',''), savedOnly=field(library,'저장한 곳만','checkbox','');
  const results=node(library,'div');
  const states=['미저장','가고 싶음','방문함','못 감','재방문'];
  function allPlaces() {return [...catalog,...Object.values(data.places).filter(p=>p.custom)];}
  function safeURL(v) {try {const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
  function update(p,patch) {
    const key=placeKey(p);data.places[key]={...p,...data.places[key],...patch};save();
  }
  async function photo(file) {
    if(!file || !file.type.startsWith('image/'))throw Error();
    const bitmap=await createImageBitmap(file), canvas=document.createElement('canvas');
    const scale=Math.min(1,640/Math.max(bitmap.width,bitmap.height));
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();return canvas.toDataURL('image/jpeg',0.7);
  }
  function drawPlaces() {
    results.replaceChildren();
    const found=allPlaces().filter(p=>(city.value==='전체'||city.value===p.city)&&(!savedOnly.checked||data.places[placeKey(p)]?.state && data.places[placeKey(p)].state!=='미저장')&&(p.name+p.category+p.city).includes(search.value.trim()));
    node(results,'p',found.length+'곳');
    for(const p of found) {
      const box=node(results,'details');node(box,'summary',p.name+' · '+p.city);
      box.ontoggle=()=>{
        if(!box.open||box.dataset.ready)return;box.dataset.ready='1';
        const r=data.places[placeKey(p)]||{};
        const st=choice(box,'방문 상태',states);st.value=r.state||states[0];st.onchange=()=>{update(p,{state:st.value});if(savedOnly.checked)drawPlaces();};
        link(box,'지도',safeURL(p.url)||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.query));
        node(box,'p',p.hours?'등록 운영시간 · '+p.hours:'운영시간 미확인');
        const source=field(box,'안내 출처 URL','url',r.source||p.source),date=field(box,'확인일','date',r.checked),info=field(box,'운영·주차 확인 메모','text',r.info);
        const note=field(box,'사진 산책 · 촬영 메모','text',r.note);
        button(box,'장소 기록 저장',()=>{if(source.value&&!safeURL(source.value)){notice.textContent='출처 주소를 확인해 주세요.';return;}update(p,{source:source.value,checked:date.value,info:info.value,note:note.value});drawPlaces();});
        if(safeURL(r.source||p.source))link(box,'출처 보기',safeURL(r.source||p.source));
        const upload=field(box,'방문 사진 한 장','file');upload.accept='image/*';
        upload.onchange=async()=>{try{update(p,{photo:await photo(upload.files[0])});drawPlaces();}catch{notice.textContent='사진을 읽을 수 없습니다.';}};
        if(r.photo){const im=node(box,'img');im.src=r.photo;im.alt=p.name+' 방문 사진';im.width=180;button(box,'사진 지우기',()=>{update(p,{photo:''});drawPlaces();});}
      };
    }
  }
  city.onchange=savedOnly.onchange=search.oninput=drawPlaces;
  const custom=node(library,'details');node(custom,'summary','내 장소 추가');
  const cname=field(custom,'장소명','text'),ccity=field(custom,'도시','text'),curl=field(custom,'지도 링크','url');
  button(custom,'보관함에 추가',()=>{const name=cname.value.trim(),cityName=ccity.value.trim();if(!name||!cityName||curl.value&&!safeURL(curl.value)){notice.textContent='장소명·도시·지도 주소를 확인해 주세요.';return;}
    const p={city:cityName,name,query:cityName+' '+name};update(p,{custom:!catalog.some(x=>placeKey(x)===placeKey(p)),url:curl.value,state:'가고 싶음'});city.value='전체';search.value=name;drawPlaces();});
  const title=field(maker,'여행 이름','text'),dest=field(maker,'여행지','text'),origin=field(maker,'출발지','text'),day=field(maker,'날짜','date'),start=field(maker,'출발','time','10:30'),end=field(maker,'귀가 목표','time','20:00');
  const mode=choice(maker,'이동',['자동차','대중교통','도보']),interest=field(maker,'관심사','text'),area=field(maker,'선호 동네','text');
  const travel=field(maker,'구간당 예상 이동(분)','number',30), preview=node(maker,'div');
  const originals=JSON.parse(document.querySelector('#travel-originals').textContent);
  const seed=choice(maker,'기존 여행에서 방문지 가져오기',originals.map(o=>o.date+' '+o.title));
  button(maker,'방문지로 새 초안 만들기',()=>{const original=originals[seed.selectedIndex];if(!original)return;
    const draft=JSON.parse(JSON.stringify(original));draft.id=id();data.drafts.push(draft);
    if(save()){drawDrafts();drafts.open=true;notice.textContent='방문지와 체류 시간을 복사했습니다. 출발·귀가·이동 시간은 초안 설정에서 조정하세요.';}});
  function rank(p) {
    const r=data.places[placeKey(p)]||{}, people=read('tp-picks-'+p.trip,{})[p.name]||[], reasons=[];
    let score=0;if(people.length){score+=people.length*3;reasons.push(people.length+'명 픽');}
    if(['가고 싶음','못 감','재방문'].includes(r.state)){score+=3;reasons.push(r.state);}
    for(const tag of interest.value.split(/[,\s]+/).filter(Boolean)){if((p.category+p.name+(r.note||'')).includes(tag)){score+=2;reasons.push(tag);}}
    if(area.value.trim()&&p.area===area.value.trim()){score+=2;reasons.push('선호 동네');}
    return {p,score,reasons};
  }
  button(maker,'추천 코스 만들기',()=>{
    preview.replaceChildren();const gap=Number(travel.value);
    if(!dest.value.trim()||!origin.value.trim()||!day.value||!validTime(start.value)||!validTime(end.value)||clock(end.value)<=clock(start.value)||!Number.isInteger(gap)||gap<1||gap>360){node(preview,'p','여행지·출발지·날짜와 이동 시간을 확인해 주세요.');return;}
    const places=allPlaces().filter(p=>p.city===dest.value.trim()).map(rank).sort((a,b)=>b.score-a.score);
    const count=Math.min(4,Math.floor((clock(end.value)-clock(start.value)-gap)/(gap+45)));
    if(!places.length||count<1){node(preview,'p','해당 도시에 장소를 보관하거나 여행 시간을 늘려 주세요.');return;}
    const signatures=new Set();
    for(const [label,pool] of [['취향 순',places],['다른 후보',places.slice(1)],['보관함 우선',[...places].sort((a,b)=>Number(!!data.places[placeKey(b.p)])-Number(!!data.places[placeKey(a.p)]))]]){
      const selected=pool.slice(0,count),signature=selected.map(x=>x.p.name).join('|');if(!signature||signatures.has(signature))continue;signatures.add(signature);
      const card=node(preview,'div','','card');node(card,'b',label);
      selected.forEach(x=>node(card,'p',x.p.name+' · '+(x.reasons.join(', ')||'여행지 후보')));
      button(card,'이 코스 저장',()=>{const draft={id:id(),title:title.value.trim()||dest.value+' 여행',city:dest.value.trim(),origin:origin.value.trim(),date:day.value,start:start.value,end:end.value,mode:mode.value,gap,stops:selected.map(x=>({name:x.p.name,minutes:45,fixed:''}))};
        data.drafts.push(draft);if(save()){drawDrafts();drafts.open=true;preview.replaceChildren();}});
    }
  });
  function schedule(d) {
    let at=clock(d.start);
    const rows=d.stops.map(s=>{at+=d.gap;const fixed=validTime(s.fixed)?clock(s.fixed):null,late=fixed!==null&&at>fixed;
      if(fixed!==null)at=Math.max(at,fixed);const arrival=at;at+=s.minutes;return {s,arrival,late};});return {rows,home:at+d.gap};
  }
  function validate(d) {
    return d&&['title','city','origin','date','mode'].every(k=>typeof d[k]==='string'&&d[k].length<=200)&&validTime(d.start)&&validTime(d.end)&&clock(d.start)<clock(d.end)&&Number.isInteger(d.gap)&&d.gap>0&&d.gap<=360&&Array.isArray(d.stops)&&d.stops.length>0&&d.stops.length<=40&&d.stops.every(s=>s&&typeof s.name==='string'&&s.name.length<=200&&Number.isInteger(s.minutes)&&s.minutes>=5&&s.minutes<=720&&(!s.fixed||validTime(s.fixed)));
  }
  function renderDraft(parent,d) {
    const departure=field(parent,'실제 출발','time',d.start),deadline=field(parent,'귀가 목표','time',d.end),gap=field(parent,'구간 이동(분)','number',d.gap);
    button(parent,'출발·귀가 설정 반영',()=>{const value=Number(gap.value);if(!validTime(departure.value)||!validTime(deadline.value)||clock(departure.value)>=clock(deadline.value)||!Number.isInteger(value)||value<1||value>360)return;
      Object.assign(d,{start:departure.value,end:deadline.value,gap:value});save();refresh();});
    const timetable=node(parent,'div');
    const refresh=()=>{
      timetable.replaceChildren();const {rows,home}=schedule(d);
      rows.forEach(({s,arrival,late})=>{const row=node(timetable,'div','','card');node(row,'b',fmt(arrival)+' '+s.name+(late?' · 예약 도착 지연':''));
        link(row,'지도에서 보기','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(d.city+' '+s.name));
        const duration=field(row,'체류(분)','number',s.minutes),fixed=field(row,'고정 예약','time',s.fixed);
        button(row,'시간 반영',()=>{const n=Number(duration.value);if(!Number.isInteger(n)||n<5||n>720)return;s.minutes=n;s.fixed=fixed.value;save();refresh();});});
      node(timetable,'p','귀가 예상 '+fmt(home)+' · 목표 '+d.end+' · 구간당 '+d.gap+'분 추정');
      if(home>clock(d.end)||rows.some(x=>x.late)){
        const options=[['일반 방문을 최대 20분씩 단축',d.stops.map(s=>({...s,minutes:s.fixed?s.minutes:Math.min(s.minutes,Math.max(15,s.minutes-20))}))]];
        const skip=d.stops.findLastIndex(s=>!s.fixed);if(skip>=0&&d.stops.length>1)options.push([d.stops[skip].name+' 생략',d.stops.filter((_,i)=>i!==skip)]);
        options.forEach(([label,stops])=>{const alt=schedule({...d,stops});button(timetable,label+' · '+fmt(alt.home)+' 귀가'+(alt.rows.some(x=>x.late)?' · 예약 지연 있음':''),()=>{d.stops=stops;save();refresh();});});
      }
    };refresh();
    button(parent,'일행에게 현재 일정 공유',async()=>{const u=new URL(location.href);u.hash='draft='+encodeURIComponent(JSON.stringify({...d,id:undefined}));try{await navigator.clipboard.writeText(u.href);notice.textContent='공유 링크를 복사했습니다.';}catch{const txt=field(parent,'복사할 공유 링크','text',u.href);txt.select();}});
  }
  function drawDrafts(){drafts.querySelectorAll('.draft-entry').forEach(e=>e.remove());for(const d of data.drafts){const box=node(drafts,'details','','draft-entry');node(box,'summary',d.date+' · '+d.title);renderDraft(box,d);}}
  function importDraft(){
    if(!location.hash.startsWith('#draft='))return;
    try{const d=JSON.parse(decodeURIComponent(location.hash.slice(7)));if(!validate(d))throw Error();
      const box=node(root,'div','','card');root.prepend(box);node(box,'b','받은 일정 · '+d.title);node(box,'p',d.date+' · '+d.origin+' 출발 · '+d.stops.map(s=>s.name).join(' → '));
      const previous=data.drafts.find(x=>x.date===d.date&&x.title===d.title);
      if(previous)node(box,'p','기존 일정 · '+previous.stops.map(s=>s.name+' '+s.minutes+'분').join(' → '));
      node(box,'p','받은 일정 · '+d.stops.map(s=>s.name+' '+s.minutes+'분'+(s.fixed?' 예약 '+s.fixed:'')).join(' → '));
      button(box,'별도 사본 저장',()=>{data.drafts.push({...d,id:id()});if(save()){history.replaceState(null,'',location.pathname+location.search+'#travel-work');box.remove();drawDrafts();drafts.open=true;}});root.scrollIntoView();
    }catch{notice.textContent='공유 일정 형식을 확인해 주세요.';}}
  const trips=[...new Map(catalog.map(p=>[p.trip,p.city])).entries()];
  const trip=choice(ledger,'여행',trips.map(x=>x[1])),budget=field(ledger,'비교할 총예산(여행 통화)','number'),balance=node(ledger,'p');
  function money(){const slug=trips.find(x=>x[1]===trip.value)?.[0];if(!slug)return;
    const spent=read('tp-exp-'+slug,[]).reduce((sum,x)=>sum+(Number(x.amt)||0),0),planned=data.budgets?.[slug];budget.value=planned??'';
    const unit=(JSON.parse(root.dataset.units||'{}')[slug]||'₩');balance.textContent='기록한 지출 '+unit+spent.toLocaleString()+(planned!=null?' · 예산 차액 '+unit+(planned-spent).toLocaleString():'');}
  trip.onchange=money;button(ledger,'비교 예산 저장',()=>{if(!budget.value||Number(budget.value)<0)return;data.budgets??={};data.budgets[trips.find(x=>x[1]===trip.value)[0]]=Number(budget.value);save();money();});
  drawPlaces();drawDrafts();money();importDraft();
})();
