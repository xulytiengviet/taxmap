/**
 * TaxMap Xinvoice proxy (Cloudflare Workers).
 * Keys stay in Worker secrets. Only company tax IDs are accepted; never send CCCD.
 * This endpoint cannot determine exit restrictions.
 */
const XINVOICE = 'https://api.xinvoice.vn/gdt-api/tax-payer/';
const TAX_RE = /^\d{10}(?:-?\d{3})?$/;
const GENERIC_ERROR = 'Không thể nhận dữ liệu từ Xinvoice. Vui lòng thử lại sau.';
function reply(body, status, cors = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...cors
    }
  });
}
function normalTaxID(value) {
  if (typeof value !== 'string') return null;
  const s = value.replace(/\s/g, '').trim();
  if (!TAX_RE.test(s)) return null;
  return s.length === 13 ? s.slice(0, 10) + '-' + s.slice(10) : s;
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') {
      return reply({ok:true,service:'taxmap-api',exitNoticeLookup:false}, 200);
    }
    const allowed = String(env.ALLOWED_ORIGIN || 'https://xulytiengviet.github.io').replace(/\/$/,'');
    const origin = request.headers.get('Origin');
    const cors = {
      'Access-Control-Allow-Origin': allowed,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };
    if (origin !== allowed) return reply({error:'Nguồn yêu cầu không được phép.'},403,{Vary:'Origin'});
    if (url.pathname !== '/api/lookup') return reply({error:'Không tìm thấy endpoint.'},404,cors);
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:{...cors,'Cache-Control':'no-store'}});
    if (request.method !== 'POST') return reply({error:'Phương thức không hỗ trợ.'},405,cors);
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unidentified';
    if (!env.TAXMAP_LIMITER || typeof env.TAXMAP_LIMITER.limit !== 'function') return reply({error:'Chưa cấu hình giới hạn truy vấn an toàn.'},503,cors);
    const limit = await env.TAXMAP_LIMITER.limit({key:'company:' + clientIp});
    if (!limit.success) return reply({error:'Bạn đã tra cứu quá nhiều lần trong thời gian ngắn. Vui lòng thử lại sau.'},429,{...cors,'Retry-After':'60'});
    if (!String(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) return reply({error:'Yêu cầu phải có Content-Type application/json.'},415,cors);
    if (Number(request.headers.get('Content-Length') || 0) > 1024) return reply({error:'Dữ liệu gửi lên quá lớn.'},413,cors);
    let input;
    try {
      const raw = await request.text();
      if (raw.length > 1024) return reply({error:'Dữ liệu gửi lên quá lớn.'},413,cors);
      input = JSON.parse(raw);
    } catch { return reply({error:'JSON không hợp lệ.'},400,cors); }
    const code = normalTaxID(input && input.taxCode);
    if (!code) return reply({error:'Chỉ hỗ trợ MST 10 hoặc 13 chữ số; không gửi CCCD vào chức năng doanh nghiệp.'},400,cors);
    if (!env.XINVOICE_CLIENT_ID || !env.XINVOICE_API_KEY) return reply({error:'Chưa cấu hình khóa API Xinvoice trên máy chủ.'},503,cors);
    const timeout = AbortSignal.timeout(9000);
    try {
      const upstream = await fetch(XINVOICE + encodeURIComponent(code),{
        method:'GET',
        headers:{'Accept':'application/json','client-id':env.XINVOICE_CLIENT_ID,'api-key':env.XINVOICE_API_KEY},
        signal:timeout,
        redirect:'error',
        cf:{cacheTtl:0,cacheEverything:false}
      });
      if (upstream.status === 404) return reply({error:'Không tìm thấy người nộp thuế với MST này trên nguồn Xinvoice.'},404,cors);
      if (upstream.status === 401 || upstream.status === 403) return reply({error:'Thông tin xác thực Xinvoice chưa hợp lệ hoặc chưa được cấp quyền.'},502,cors);
      if (upstream.status === 429) return reply({error:'Xinvoice đã giới hạn số lần truy vấn. Vui lòng thử lại sau.'},429,cors);
      if (!upstream.ok) return reply({error:GENERIC_ERROR},502,cors);
      const payload = await upstream.json();
      if (payload && payload.success === false) return reply({error:GENERIC_ERROR},502,cors);
      const data = payload && payload.data && !Array.isArray(payload.data) ? payload.data : payload;
      if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.taxID !== 'string') return reply({error:'Xinvoice trả về định dạng chưa được hỗ trợ.'},502,cors);
      // Whitelist output to avoid disclosing unrelated upstream fields.
      const safe = {};
      for (const key of ['orgType','taxID','name','address','taxDepartment','status','updatedAt']) {
        safe[key] = data[key] === undefined || data[key] === null ? null : String(data[key]).slice(0, 1000);
      }
      return reply({success:true,data:safe,source:'Xinvoice',retrievedAt:new Date().toISOString()},200,cors);
    } catch {
      return reply({error:GENERIC_ERROR},502,cors);
    }
  }
};
