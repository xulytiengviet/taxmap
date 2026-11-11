(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const panels = {company: $('panel-company'), exit: $('panel-exit')};
  const tabs = {company: $('tab-company'), exit: $('tab-exit')};
  const lookupClient = window.TAXMAP_LOOKUP;
  const sourceLinks = {
    issued: 'https://gdt.gov.vn/wps/portal/Home/nt/xc',
    planned: 'https://gdt.gov.vn/wps/portal/Home/nt/se'
  };
  let preparedIdentifier = '';
  function setTab(tab) {
    const isCompany = tab === 'company';
    panels.company.classList.toggle('hidden', !isCompany);
    panels.exit.classList.toggle('hidden', isCompany);
    tabs.company.classList.toggle('active', isCompany);
    tabs.exit.classList.toggle('active', !isCompany);
    tabs.company.setAttribute('aria-selected', String(isCompany));
    tabs.exit.setAttribute('aria-selected', String(!isCompany));
  }
  tabs.company.addEventListener('click', () => setTab('company'));
  tabs.exit.addEventListener('click', () => setTab('exit'));
  document.querySelectorAll('.notice-link').forEach((el, index) => { el.href = index === 0 ? sourceLinks.issued : sourceLinks.planned; });
  $('api-mode').textContent = 'Thử Xinvoice → dự phòng VietQR';
  $('api-mode').classList.add('online');
  function showMessage(id, message, kind) {
    const el = $(id);
    el.textContent = message;
    el.className = 'message' + (kind ? ' ' + kind : '');
  }
  function hideMessage(id) { $(id).classList.add('hidden'); }
  function normalizeTaxCode(raw) {
    const s = raw.trim().replace(/\s+/g, '');
    if (/^\d{10}$/.test(s)) return s;
    if (/^\d{10}-?\d{3}$/.test(s)) return s.slice(0, 10) + '-' + s.slice(-3);
    return null;
  }
  function normalizeIdentifier(raw) {
    const s = raw.trim().replace(/\s+/g, '');
    if (/^\d{9}$/.test(s) || /^\d{10}$/.test(s) || /^\d{12}$/.test(s)) return s;
    if (/^\d{10}-?\d{3}$/.test(s)) return s.slice(0, 10) + '-' + s.slice(-3);
    return null;
  }
  function mask(s) {
    if (!s) return '';
    const noDash = s.replace(/-/g,'');
    const tail = noDash.slice(-4);
    return '•'.repeat(Math.max(0,noDash.length-4)) + tail;
  }
  function str(value) { return value === null || value === undefined || value === '' ? 'Chưa có dữ liệu' : String(value); }
  function formatDate(value) {
    if (!value) return 'Chưa có dữ liệu';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? str(value) : new Intl.DateTimeFormat('vi-VN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(d);
  }
  function classifyStatus(status) {
    const s = String(status || '').toLocaleLowerCase('vi');
    if (s.includes('không hoạt động') || s.includes('ngừng hoạt động') || s.includes('đóng mst') || s.includes('ngừng hđ')) return 'inactive';
    if (s.includes('tạm ngừng') || s.includes('chờ') || s.includes('đợi')) return 'warn';
    return '';
  }
  function unwrap(payload) {
    if (payload && payload.success === false) throw new Error('Nguồn dữ liệu trả về trạng thái không thành công.');
    const obj = payload && payload.data && !Array.isArray(payload.data) ? payload.data : payload;
    if (!obj || typeof obj !== 'object' || Array.isArray(obj) || !('taxID' in obj || 'name' in obj)) throw new Error('Cấu trúc phản hồi chưa đúng định dạng Xinvoice.');
    return obj;
  }
  function renderTaxData(payload, sample) {
    const data = unwrap(payload);
    $('result-name').textContent = str(data.name);
    $('result-tax-id').textContent = str(data.taxID);
    $('result-type').textContent = str(data.orgType);
    $('result-address').textContent = str(data.address);
    $('result-department').textContent = str(data.taxDepartment);
    $('result-updated').textContent = formatDate(data.updatedAt);
    const label = str(data.status);
    const tag = $('result-tag');
    tag.textContent = label;
    tag.className = 'status-tag ' + (data.status ? classifyStatus(data.status) : 'pending');
    const source = (payload && payload.source) || 'Xinvoice';
    $('result-source').textContent = sample
      ? 'DỮ LIỆU MẪU từ tài liệu Xinvoice — KHÔNG PHẢI kết quả tra cứu thời gian thực. Không dùng để kết luận tình trạng doanh nghiệp hoặc xuất cảnh.'
      : 'Nguồn: ' + source + ' · Thời điểm truy vấn: ' + new Date().toLocaleString('vi-VN') + '. Trạng thái MST không phản ánh tình trạng tạm hoãn xuất cảnh. ' + (source === 'VietQR' ? 'VietQR không cung cấp trạng thái hoạt động; các ô không có dữ liệu phải được xác minh tại Cục Thuế.' : '');
    $('company-result').classList.remove('hidden');
  }
  const sample = {
    orgType:'Doanh nghiệp / Đơn vị sự nghiệp công lập',
    taxID:'0101248141',
    name:'CÔNG TY CỔ PHẦN FPT',
    address:'Số 10 phố Phạm Văn Bạch, Phường Cầu Giấy, TP Hà Nội',
    taxDepartment:'Chi cục Thuế Doanh nghiệp lớn',
    status:'NNT đang hoạt động',
    updatedAt:'2025-12-19T08:35:45.000Z'
  };
  $('demo-btn').addEventListener('click', () => {
    hideMessage('company-message');
    renderTaxData(sample, true);
  });
  $('company-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    hideMessage('company-message');
    $('company-result').classList.add('hidden');
    const code = normalizeTaxCode($('tax-code').value);
    if (!code) {
      showMessage('company-message', 'MST không hợp lệ. Hãy nhập 10 số hoặc 10 số + 3 số chi nhánh. CCCD 12 số không phải đầu vào của chức năng doanh nghiệp.', 'error');
      return;
    }
    const button = $('lookup-btn');
    button.disabled = true;
    button.textContent = 'Đang tra cứu…';
    try {
      if (!lookupClient) throw new Error('Chưa tải được mô-đun tra cứu. Hãy tải lại trang.');
      const result = await lookupClient.lookup(code);
      renderTaxData(result, false);
      if (result.warning) showMessage('company-message', result.warning, 'info');
    } catch (error) {
      showMessage('company-message', error && error.message ? error.message : 'Không thể kết nối dịch vụ tra cứu.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Tra cứu MST →';
    }
  });
  $('go-exit').addEventListener('click', () => {
    const code = $('result-tax-id').textContent;
    if (normalizeIdentifier(code)) $('identifier').value = code;
    setTab('exit');
    $('identifier').focus();
    document.querySelector('#tra-cuu').scrollIntoView({behavior:'smooth',block:'start'});
  });
  $('exit-form').addEventListener('submit', (event) => {
    event.preventDefault();
    hideMessage('exit-message');
    $('exit-result').classList.add('hidden');
    const id = normalizeIdentifier($('identifier').value);
    if (!id) {
      showMessage('exit-message','Vui lòng nhập CMND 9 số, CCCD 12 số, MST 10 số hoặc MST đơn vị phụ thuộc 13 số.', 'error');
      return;
    }
    preparedIdentifier = id;
    $('masked-identifier').textContent = mask(id);
    $('exit-result').classList.remove('hidden');
    showMessage('exit-message','Đã chuẩn bị số tra cứu. Bước tiếp theo: mở cổng Cục Thuế, nhập lại số (có thể sao chép) và mã xác nhận. TaxMap chưa nhận kết quả trực tiếp từ cơ quan thuế.','info');
  });
  $('copy-identifier').addEventListener('click', async () => {
    if (!preparedIdentifier) return;
    try {
      await navigator.clipboard.writeText(preparedIdentifier);
      showMessage('exit-message','Đã sao chép số vào bộ nhớ tạm. Hãy dán vào biểu mẫu chính thức và hoàn tất mã xác nhận.','info');
    } catch {
      showMessage('exit-message','Trình duyệt không cho phép tự động sao chép. Hãy dùng lại số đã nhập trong ô phía trên.','error');
    }
  });
})();
