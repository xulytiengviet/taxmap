import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {lookup, normalizeTaxCode} = require('../../assets/lookup.js');

function json(status, data) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}
const XI = {
  taxID:'0101248141',name:'DOANH NGHIỆP MẪU',
  orgType:'Doanh nghiệp',status:'NNT đang hoạt động',
  address:'Hà Nội',taxDepartment:'Cơ quan thuế',updatedAt:'2026-01-01T00:00:00Z'
};
const VQ = {code:'00',data:{id:'0316794479',name:'CASSO',address:'TP.HCM'}};

test('MST validation does not accept CCCD or malformed input', () => {
  assert.equal(normalizeTaxCode('0101248141'), '0101248141');
  assert.equal(normalizeTaxCode('0101248141001'),'0101248141-001');
  assert.equal(normalizeTaxCode('0101248141-001'),'0101248141-001');
  assert.equal(normalizeTaxCode('079123456789'),null);
  assert.equal(normalizeTaxCode('abc'),null);
});
test('Xinvoice success uses only public GET with no API key', async () => {
  const calls=[];
  const fetcher = async (url, opt) => {
    calls.push({url,opt});
    return json(200, XI);
  };
  const result = await lookup('0101248141',{fetcher});
  assert.equal(result.source,'Xinvoice');
  assert.equal(result.data.status,'NNT đang hoạt động');
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,'https://api.xinvoice.vn/gdt-api/tax-payer/0101248141');
  assert.deepEqual(calls[0].opt.headers, {Accept:'application/json'});
  assert.equal(calls[0].opt.method,'GET');
  assert.equal(calls[0].opt.credentials,'omit');
});
test('Xinvoice 403 falls back to VietQR with explicitly unknown status', async () => {
  const urls=[];
  const fetcher = async (url) => {
    urls.push(url);
    return url.includes('xinvoice.vn') ? json(403,{error:'Forbidden'}) : json(200,VQ);
  };
  const result=await lookup('0316794479',{fetcher});
  assert.equal(result.source,'VietQR');
  assert.equal(result.data.taxID,'0316794479');
  assert.equal(result.data.name,'CASSO');
  assert.equal(result.data.status,null);
  assert.equal(result.data.updatedAt,null);
  assert.match(result.warning,/không cung cấp tình trạng hoạt động/);
  assert.equal(urls[1],'https://api.vietqr.io/v2/business/0316794479');
});
test('CORS rejection falls back to VietQR', async () => {
  const result = await lookup('0316794479',{fetcher:async url => {
    if(url.includes('xinvoice.vn')) throw new TypeError('Failed to fetch');
    return json(200,VQ);
  }});
  assert.equal(result.source,'VietQR');
  assert.match(result.warning,/CORS/);
});
test('both endpoints fail, no fabricated data or success result', async () => {
  await assert.rejects(lookup('0101248141', {
    fetcher:async url => json(url.includes('xinvoice.vn')?401:429,{})
  }), /Không thể tra cứu trực tiếp/);
});
test('VietQR non-success response is not presented as a company', async () => {
  await assert.rejects(lookup('0101248141',{
    fetcher:async url => url.includes('xinvoice.vn')
      ? json(403,{}) : json(200,{code:'01',data:{name:'wrong'}})
  }), /Không thể tra cứu trực tiếp/);
});
