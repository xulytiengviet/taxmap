(function (root) {
  'use strict';
  // Biên mục tham khảo, KHÔNG phải dữ liệu tra cứu API thời gian thực.
  // Chỉ bổ sung những trường API công khai thiếu, với nguồn và ngày đối chiếu riêng.
  const records = {
    '0319776703': {
      asOf: '2026-11-03',
      sourceName: 'Hồ sơ Xinvoice và DoanhNghiep.Biz (đối chiếu 03/11/2026)',
      sourceUrl: 'https://xinvoice.vn/mst/0319776703-cong-ty-tnhh-sxtm-kinh-doanh-my-anh',
      alternateSourceUrl: 'https://www.doanhnghiep.biz/0319776703-cong-ty-tnhh-sxtm-kinh-doanh-my-anh',
      data: {
        taxID: '0319776703',
        name: 'CÔNG TY TNHH SXTM KINH DOANH MỸ ANH',
        taxAddress: 'Số 266, đường Võ Văn Kiệt, Phường Cầu Ông Lãnh, TP Hồ Chí Minh, Việt Nam',
        address: 'Số 266, đường Võ Văn Kiệt, Phường Cầu Ông Lãnh, Thành phố Hồ Chí Minh, Việt Nam',
        orgType: 'Công ty trách nhiệm hữu hạn',
        snapshotStatus: 'NNT đang hoạt động',
        internationalName: 'MY ANH SXTM BUSINESS COMPANY LIMITED',
        shortName: 'MY ANH SXTM BUSINESS CO., LTD',
        legalRepresentative: 'TRẦN THỊ HƯỜNG',
        taxDepartment: 'Thuế cơ sở 1 Thành phố Hồ Chí Minh',
        mainIndustry: 'Bán buôn tổng hợp',
        mainIndustryCode: '4690',
        mainIndustryDescription: 'Trừ hoạt động đấu giá. Trừ bán buôn các mặt hàng nhà nước cấm, hóa chất, bình gas, khí dầu mỏ hóa lỏng LPG, dầu nhớt cặn, vàng miếng, súng, đạn loại dùng đi săn hoặc thể thao và tiền kim khí.'
      }
    }
  };
  root.TAXMAP_CURATED = Object.freeze(records);
  if (typeof module !== 'undefined' && module.exports) module.exports = records;
})(typeof globalThis !== 'undefined' ? globalThis : this);
