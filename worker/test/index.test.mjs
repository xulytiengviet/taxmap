import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const url = 'https://taxmap-api.example.workers.dev/api/lookup';
const origin = 'https://xulytiengviet.github.io';
const env = {
  ALLOWED_ORIGIN: origin,
  XINVOICE_CLIENT_ID: 'test-id',
  XINVOICE_API_KEY: 'test-secret',
  TAXMAP_LIMITER: { limit: async () => ({ success: true }) }
};
function req(taxCode, from = origin) {
  return new Request(url, {
    method:'POST',
    headers:{Origin:from,'Content-Type':'application/json'},
    body:JSON.stringify({taxCode})
  });
}

test('health does not claim exit information', async () => {
  const res = await worker.fetch(new Request('https://example.com/health'), env);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.exitNoticeLookup, false);
});
test('rejects other origins', async () => {
  const res = await worker.fetch(req('0101248141', 'https://unauthorized.example'), env);
  assert.equal(res.status, 403);
});
test('rejects 12 digit CCCD in business lookup', async () => {
  const res = await worker.fetch(req('079123456789'), env);
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /CCCD/);
});
test('rejects malformed business tax codes', async () => {
  for (const code of ['1234','12345678901','12345678901234','1234567890/001']) {
    const res = await worker.fetch(req(code), env);
    assert.equal(res.status, 400);
  }
});
test('applies rate limiting before fetching upstream', async () => {
  const limited = {...env,TAXMAP_LIMITER:{limit:async()=>({success:false})}};
  const res = await worker.fetch(req('0101248141'), limited);
  assert.equal(res.status, 429);
  assert.equal(res.headers.get('Retry-After'), '60');
});
test('requires secret key configuration', async () => {
  const missing = {...env,XINVOICE_API_KEY:''};
  const res = await worker.fetch(req('0101248141'), missing);
  assert.equal(res.status, 503);
});
test('normalizes 13-digit tax code and whitelists Xinvoice output', async () => {
  const previous = globalThis.fetch;
  let received;
  globalThis.fetch = async (input, options) => {
    received = {input,headers:options.headers};
    return new Response(JSON.stringify({
      orgType:'Chi nhánh',taxID:'0101248141-001',name:'Đơn vị thử nghiệm',
      address:'Địa chỉ mẫu',taxDepartment:'Cơ quan thuế mẫu',
      status:'NNT đang hoạt động',updatedAt:'2026-01-01T00:00:00.000Z',
      sensitiveUnrelatedData:'NOT RETURNED'
    }),{status:200,headers:{'Content-Type':'application/json'}});
  };
  try {
    const res = await worker.fetch(req('0101248141001'), env);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.taxID, '0101248141-001');
    assert.equal(body.data.sensitiveUnrelatedData, undefined);
    assert.match(received.input, /0101248141-001/);
    assert.equal(received.headers['client-id'], 'test-id');
    assert.equal(received.headers['api-key'], 'test-secret');
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), origin);
  } finally { globalThis.fetch = previous; }
});
