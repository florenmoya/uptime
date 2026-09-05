import test from 'node:test';
import assert from 'node:assert/strict';
import { permittedRequest,isPublicPath } from '../src/lib/request-guard.js';
test('local mutations require a trusted origin and host; malformed headers fail closed',()=>{
  assert.equal(permittedRequest('127.0.0.1:3100','http://127.0.0.1:3100','POST'),true);
  for(const origin of [null,'null','garbage','https://evil.example','http://localhost:9999','ftp://127.0.0.1:3100'])assert.equal(permittedRequest('127.0.0.1:3100',origin,'POST'),false,String(origin));
  assert.equal(permittedRequest('evil.example','http://127.0.0.1:3100','POST'),false);
  assert.equal(permittedRequest('evil.example',null,'GET'),false);
  assert.equal(permittedRequest('localhost:3100',null,'GET'),true);
});
test('only status pages, health and icon are public',()=>{
  assert.equal(isPublicPath('/status/philgeps'),true);
  assert.equal(isPublicPath('/status'),false);
  assert.equal(isPublicPath('/api/health'),true);
  assert.equal(isPublicPath('/icon.svg'),true);
  assert.equal(isPublicPath('/api/dashboard'),false);
});
