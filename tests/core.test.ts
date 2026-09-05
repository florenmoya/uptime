import test from 'node:test';
import assert from 'node:assert/strict';
import { transition, initialState } from '../src/lib/state.js';
import { isPublicAddress, probe } from '../src/lib/probe.js';
import { createServer } from 'node:http';

test('only two consecutive failures open an incident and sustained failures do not repeat it', () => {
  const first = transition(initialState, false);
  assert.equal(first.event, null);
  const second = transition(first.state, false);
  assert.equal(second.event, 'down');
  assert.equal(transition(second.state, false).event, null);
});
test('recovery requires two successes; a failed recovery keeps the existing incident', () => {
  const down = transition(transition(initialState, false).state, false).state;
  const once = transition(down, true);
  assert.equal(once.state.status, 'down');
  assert.equal(transition(once.state, false).event, null);
  assert.equal(transition(once.state, true).event, 'recovered');
});
test('a healthy first check never sends a recovery notification', () => {
  const result = transition(initialState, true);
  assert.equal(result.state.status, 'up');
  assert.equal(result.event, null);
});
test('a gap resets confirmation streaks but preserves an existing outage', () => {
  const first = transition(initialState, false).state;
  assert.equal(transition(first, false, true).event, null);
  const down = transition(first, false).state;
  assert.equal(transition(down, true, true).state.status, 'down');
});
test('reject private, loopback, metadata and IPv4-mapped IPv6 destinations', () => {
  for (const ip of ['127.0.0.1','10.1.2.3','169.254.169.254','192.168.1.1','172.16.0.2','100.64.0.1','::1','fc00::1','fe80::1','::ffff:127.0.0.1','0.0.0.0']) assert.equal(isPublicAddress(ip), false, ip);
  for (const ip of ['1.1.1.1','8.8.8.8','2606:4700:4700::1111']) assert.equal(isPublicAddress(ip), true, ip);
});
test('probe rejects private targets before connecting', async () => {
  const result = await probe('http://127.0.0.1/');
  assert.equal(result.ok, false);
  assert.match(result.error ?? '', /public/i);
});
test('HTTP fixture proves redirects, non-healthy status and timeout', async () => {
  const server = createServer((req, res) => {
    if (req.url === '/slow') return;
    if (req.url === '/redirect') { res.writeHead(302, {location:'/ok'}); res.end(); return; }
    res.writeHead(req.url === '/bad' ? 503 : 200); res.end('fixture');
  });
  await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve));
  const addr = server.address() as {port:number};
  const base = `http://127.0.0.1:${addr.port}`;
  try {
    assert.equal((await probe(base + '/redirect', {allowPrivateForTest:true})).ok, true);
    assert.equal((await probe(base + '/bad', {allowPrivateForTest:true})).httpStatus, 503);
    assert.equal((await probe(base + '/slow', {allowPrivateForTest:true, timeoutMs:50})).ok, false);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve=>server.close(()=>resolve())); }
});
