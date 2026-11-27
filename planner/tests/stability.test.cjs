const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('share schema accepts legacy values and timestamped unchecks', () => {
  const source = read('app.js');
  const validators = source.slice(source.indexOf('  function safeRecord('), source.indexOf('  function commitRecords('));
  const scope = {slug: 'test', names: ['A'], isPool: who => who === '공금카드'};
  const validate = vm.runInNewContext(validators + '\nvalidateSync', scope);
  const base = {v: 1, trip: 'test', from: 'A'};
  const exp = {id: 'entry-1', amt: 1000, who: '공금카드', cat: '식사', what: '식사', date: '2/28'};
  assert.equal(validate({...base, ck: {ready: true}, ex: [exp]}), true);
  assert.equal(validate({...base, dl: {ticket: false}, checkTime: {dl: {ticket: 100}}, ex: [{...exp, fx: 9.5}]}), true);
  assert.equal(validate({...base, v: 2}), false);
  assert.equal(validate({...base, trip: 'another'}), false);
  assert.equal(validate({...base, ex: [{...exp, amt: -1}]}), false);
  assert.equal(validate({...base, ex: [{...exp, id: 'invalid id'}]}), false);
  assert.equal(validate({...base, ck: JSON.parse('{"__proto__":true}')}), false);
});

test('cache cleanup preserves other projects and fetch excludes downloads and lock requests', async () => {
  const listeners = {};
  const removed = [];
  const current = 'travel-planner:/travel-planner/:new';
  const previous = 'travel-planner:/travel-planner/:old';
  vm.runInNewContext(read('sw.js').replace('__VER__', 'new').replace('__PRE__', '[]'), {
    URL, location: {origin: 'https://example.test'},
    self: {
      registration: {scope: 'https://example.test/travel-planner/'},
      clients: {claim: () => Promise.resolve()},
      addEventListener: (event, listener) => { listeners[event] = listener; },
    },
    caches: {
      keys: async () => [current, previous, 'different-app', 'travel-planner:/other/:old'],
      delete: async key => { removed.push(key); },
    },
  });
  let cleanup;
  listeners.activate({waitUntil: promise => { cleanup = promise; }});
  await cleanup;
  assert.deepEqual(removed, [previous]);
  for (const route of ['/other/', '/travel-planner/?lock', '/travel-planner/trips/t/d-secret/calendar.ics']) {
    listeners.fetch({
      request: {method: 'GET', url: 'https://example.test' + route},
      respondWith: () => assert.fail('The worker should leave this request alone'),
    });
  }
});

test('password-protected sharing round-trips and rejects an incorrect password', async () => {
  const source = read('app.js');
  const code = source.slice(source.indexOf('  var b64e='), source.indexOf('  function safeRecord('));
  const crypto = require('node:crypto').webcrypto;
  const context = {crypto, window: {crypto}, TextEncoder, TextDecoder, btoa, atob, Blob, Response};
  let password = 'travel test password';
  context.prompt = () => password;
  const functions = vm.runInNewContext(code + '\n({pack, sealShare, openShare})', context);
  const packed = await functions.pack({trip: 'sample'});
  const link = await functions.sealShare(packed, password);
  assert.match(link, /^e[A-Za-z0-9_-]+$/);
  assert.notEqual(link, await functions.sealShare(packed, password));
  assert.equal((await functions.openShare(link)).trip, 'sample');
  assert.equal((await functions.openShare(packed)).trip, 'sample');
  password = 'incorrect password';
  await assert.rejects(functions.openShare(link));
});
