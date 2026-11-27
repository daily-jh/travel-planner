(function () {
  'use strict';
  const route = (query, mode) => 'https://www.google.com/maps/dir/?api=1&destination=' +
    encodeURIComponent(query) + '&travelmode=' + encodeURIComponent(mode);
  function element(parent, tag, label) {
    const node = document.createElement(tag);
    node.textContent = label || '';
    parent.appendChild(node);
    return node;
  }
  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* session only */ }
  }
  function shift(time, delay) {
    return time.replace(/(\d{1,2}):(\d{2})/g, (_, h, m) => {
      const minutes = Number(h) * 60 + Number(m) + delay;
      return (minutes >= 1440 ? '다음날 ' : '') + String(Math.floor(minutes / 60) % 24).padStart(2,'0') +
        ':' + String(minutes % 60).padStart(2,'0');
    });
  }
  document.querySelectorAll('.adjust-day').forEach(panel => {
    const plans = JSON.parse(panel.querySelector('script').textContent);
    const box = panel.querySelector('.adjust-controls');
    const key = 'tp-adjust-' + location.pathname + panel.dataset.date;
    const state = read(key);
    function select(label, choices) {
      const wrapper = element(box,'label',label + ' ');
      const input = element(wrapper,'select');
      choices.forEach((name,i) => input.add(new Option(name,i)));
      element(box,'br');
      return input;
    }
    const plan = select('코스', plans.map(p => p.name));
    plan.selectedIndex = plans[state.plan] ? Number(state.plan) : 0;
    const start = select('조정 시작',[]);
    const delays = [0,10,20,30,40,60,90];
    const delay = select('이후 일정 늦추기',delays.map(n => n + '분'));
    delay.selectedIndex = Math.max(0,delays.indexOf(state.delay));
    function populate(index) {
      start.replaceChildren();
      plans[plan.selectedIndex].rows.forEach((r,i) => start.add(new Option(r.time + ' ' + r.text,i)));
      start.selectedIndex = start.options[index] ? Number(index) : 0;
    }
    populate(state.start);
    element(box,'p','이 기기에 저장되는 계획 시각입니다. 예약·항공편의 실제 시각은 별도로 확인하세요.');
    const dayIndex = Array.from(document.querySelectorAll('.adjust-day')).indexOf(panel);
    const nowCard = document.querySelector('.nowcard');
    const live = document.createElement('div');
    live.className = 'card';
    live.hidden = true;
    if (nowCard) nowCard.after(live);
    let clock = null;
    function refreshLive() {
      const active = plan.selectedIndex !== 0 || delays[delay.selectedIndex] !== 0;
      live.hidden = !active || !clock || clock.di !== dayIndex;
      if (live.hidden) return;
      const rows = plans[plan.selectedIndex].rows;
      live.replaceChildren();
      element(live,'b','조정한 일정 · ' + plans[plan.selectedIndex].name);
      let current = null, next = null;
      rows.forEach((row,i) => {
        const match = row.time.match(/(\d{1,2}):(\d{2})/);
        if (!match) return;
        const at = Number(match[1])*60 + Number(match[2]) + (i >= start.selectedIndex ? delays[delay.selectedIndex] : 0);
        if (at <= clock.mins) current = row;
        else if (!next) next = row;
      });
      if (current) element(live,'p','지금 · ' + current.text);
      if (next) {
        element(live,'p','다음 · ' + next.text);
        if (next.query) {
          const a = element(live,'a','다음 장소 길찾기');
          a.href=route(next.query,next.mode); a.target='_blank'; a.rel='noopener';
        }
      }
    }
    document.addEventListener('tp-now',ev => {clock=ev.detail;refreshLive();});
    function paint() {
      const list = panel.querySelector('.adjust-list');
      list.replaceChildren();
      const minutes = delays[delay.selectedIndex];
      plans[plan.selectedIndex].rows.forEach((r,i) => {
        const item = element(list,'li',shift(r.time,i >= start.selectedIndex ? minutes : 0) + ' · ' + r.text + ' ');
        if (r.query) {
          const link = element(item,'a','길찾기');
          link.href = route(r.query,r.mode);
          link.target = '_blank'; link.rel = 'noopener';
        }
      });
      refreshLive();
      save(key,{plan:plan.selectedIndex,start:start.selectedIndex,delay:minutes});
    }
    plan.onchange = () => { populate(0); delay.selectedIndex=0; paint(); };
    start.onchange = delay.onchange = paint;
    element(box,'button','기본 일정 복원').onclick = () => { plan.selectedIndex=0; populate(0); delay.selectedIndex=0; paint(); };
    paint();
    if (panel.dataset.drive !== '1') return;
    const parking = panel.querySelector('.adjust-parking'), carKey = key + '-car';
    const pin = element(parking,'button','현재 주차 위치 저장');
    const back = element(parking,'a','내 차까지 걷기');
    back.target='_blank'; back.rel='noopener';
    const clear = element(parking,'button','주차 위치 지우기');
    const status = element(parking,'small');
    status.setAttribute('role','status');
    const show = pos => {
      back.hidden=clear.hidden=!pos;
      if (pos) back.href=route(pos,'walking');
      else back.removeAttribute('href');
    };
    show(read(carKey).pos);
    clear.onclick=() => {save(carKey,{});show(null);status.textContent='주차 위치를 지웠습니다.';};
    pin.onclick=() => {
      if (!navigator.geolocation) {status.textContent='이 브라우저는 위치 확인을 지원하지 않습니다.';return;}
      pin.disabled=true;
      navigator.geolocation.getCurrentPosition(p => {
        const pos=p.coords.latitude+','+p.coords.longitude;
        save(carKey,{pos});show(pos);pin.disabled=false;status.textContent='현재 위치를 기록했습니다.';
      },() => {pin.disabled=false;status.textContent='현재 위치를 확인할 수 없습니다. 위치 권한을 확인하세요.';},
      {enableHighAccuracy:true,timeout:12000});
    };
  });
})();
