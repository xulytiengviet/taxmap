/* TaxMap public lookup client. No credentials are included or required by TaxMap itself.
   Note: Xinvoice docs require client-id/api-key; its unauthenticated endpoint may reject
   browser requests. VietQR is a temporary, unkeyed fallback for company identity only.
*/
(function (root) {
  'use strict';
  const XINVOICE = 'https://api.xinvoice.vn/gdt-api/tax-payer/';
  const VIETQR = 'https://api.vietqr.io/v2/business/';

  function normalizeTaxCode(raw) {
    if (typeof raw !== 'string') return null;
    const s = raw.trim().replace(/\s+/g, '');
    if (/^\d{10}$/.test(s)) return s;
    if (/^\d{10}-?\d{3}$/.test(s)) return s.slice(0, 10) + '-' + s.slice(-3);
    return null;
  }

  async function requestJSON(url, fetcher, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'follow',
        headers: {Accept: 'application/json'},
        signal: controller.signal
      });
      if (!response.ok) {
        const code = Number(response.status) || 0;
        throw new Error(code === 401 || code === 403
          ? 'HTTP ' + code + ' — API yêu cầu quyền truy cập.'
          : code === 429 ? 'HTTP 429 — vượt giới hạn truy vấn.'
          : 'HTTP ' + code + ' — nhà cung cấp không trả về dữ liệu.');
      }
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function fromXinvoice(body) {
    if (!body || typeof body !== 'object' || body.success === false) {
      throw new Error('Xinvoice không trả về kết quả hợp lệ.');
    }
    const d = body.data && !Array.isArray(body.data) ? body.data : body;
    if (!d || typeof d !== 'object' || Array.isArray(d) ||
        !d.taxID || !d.name) {
      throw new Error('Xinvoice thiếu MST hoặc tên doanh nghiệp trong kết quả.');
    }
    return {
      taxID: String(d.taxID), name: String(d.name),
      orgType: d.orgType ?? null, address: d.address ?? null,
      taxDepartment: d.taxDepartment ?? null, status: d.status ?? null,
      updatedAt: d.updatedAt ?? null
    };
  }

  function fromVietQR(body) {
    if (!body || typeof body !== 'object' || String(body.code) !== '00' ||
        !body.data || !body.data.id || !body.data.name) {
      throw new Error('VietQR không tìm thấy hồ sơ doanh nghiệp phù hợp.');
    }
    const d = body.data;
    return {
      taxID: String(d.id), name: String(d.name),
      orgType: null, address: d.address ?? null,
      taxDepartment: null, status: null, updatedAt: null
    };
  }

  function describeError(error) {
    if (error && error.name === 'AbortError') return 'quá thời gian chờ';
    if (error instanceof TypeError) return 'bị trình duyệt chặn CORS hoặc lỗi kết nối';
    return String(error && error.message || 'không rõ lý do').slice(0, 180);
  }

  async function lookup(rawTaxCode, options = {}) {
    const taxCode = normalizeTaxCode(rawTaxCode);
    if (!taxCode) throw new Error('Mã số thuế phải gồm 10 hoặc 13 chữ số.');
    const fetcher = options.fetcher || root.fetch?.bind(root);
    if (typeof fetcher !== 'function') throw new Error('Trình duyệt không hỗ trợ Fetch API.');
    const timeoutMs = Number.isFinite(options.timeoutMs)
      ? Math.max(200, Math.min(options.timeoutMs, 15000)) : 6500;
    let xinvoiceIssue = '';
    try {
      const payload = await requestJSON(XINVOICE + encodeURIComponent(taxCode), fetcher, timeoutMs);
      return {
        source: 'Xinvoice', taxCode, data: fromXinvoice(payload),
        retrievedAt: new Date().toISOString(), warning: ''
      };
    } catch (error) {
      xinvoiceIssue = describeError(error);
    }

    try {
      const codeWithoutDash = taxCode.replace('-', '');
      const payload = await requestJSON(VIETQR + encodeURIComponent(codeWithoutDash), fetcher, timeoutMs);
      return {
        source: 'VietQR', taxCode, data: fromVietQR(payload),
        retrievedAt: new Date().toISOString(), warning:
          'Xinvoice trực tiếp không trả dữ liệu (' + xinvoiceIssue + '). ' +
          'Đã sử dụng VietQR không cần khóa để nhận dạng doanh nghiệp. ' +
          'VietQR không cung cấp tình trạng hoạt động hoặc thông báo xuất cảnh. ' +
          'Dịch vụ VietQR dự kiến ngừng hỗ trợ từ 01/03/2027.'
      };
    } catch (error) {
      throw new Error(
        'Không thể tra cứu trực tiếp. Xinvoice: ' + xinvoiceIssue +
        '; VietQR: ' + describeError(error) +
        '. Xinvoice chính thức yêu cầu client-id và api-key; ' +
        'nếu cả hai API chặn trình duyệt, vui lòng tra cứu tại Cục Thuế hoặc cấu hình backend được cấp quyền.'
      );
    }
  }

  const api = Object.freeze({lookup, normalizeTaxCode});
  root.TAXMAP_LOOKUP = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
