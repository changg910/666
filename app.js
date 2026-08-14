/* =========================================================
   客戶月銷貨追蹤系統 - app.js (v2：客戶 x 產品 雙維度)
   資料儲存：瀏覽器 IndexedDB（純前端，無需伺服器；容量遠大於 localStorage，一般不會再遇到存滿的問題）
   ========================================================= */

const STORAGE_KEY_CUSTOMERS = 'cst_customers_v2';
const STORAGE_KEY_PRODUCTS = 'cst_products_v2';
const STORAGE_KEY_SALES = 'cst_sales_v2';
const STORAGE_KEY_REPS = 'cst_reps_v1';
const LEGACY_KEY_CUSTOMERS = 'cst_customers_v1';
const LEGACY_KEY_SALES = 'cst_sales_v1';

const GROWTH_THRESHOLD = 0.05;   // 成長判定：較上月 +5% 以上
const DECLINE_THRESHOLD = -0.05; // 下滑判定：較上月 -5% 以上

/* 標準產品分類對照表（來自使用者提供的產品編號.xlsx，共 543 項），供「套用標準產品分類」功能使用 */
const PRODUCT_CATEGORY_REFERENCE = [
  { code: 'A1009-5', name: '彈性水泥乳膠 5加侖', category: '雙液彈泥系列' },
  { code: 'A1005-5', name: '彈性水泥乳膠 加侖', category: '雙液彈泥系列' },
  { code: 'A1005-6', name: '彈性水泥(10公斤乳+10公斤砂)', category: '雙液彈泥系列' },
  { code: 'A1009-52.3', name: 'SOS彈性水泥-(50加侖-200kg)', category: '雙液彈泥系列' },
  { code: 'A1009-53.3', name: 'SOS壓克力彈性水泥', category: '雙液彈泥系列' },
  { code: 'A1009-51', name: '師傅牌彈性水泥 5加侖', category: '雙液彈泥系列' },
  { code: 'A1005-63', name: '師傅牌彈性水泥(9kg乳+9kg粉)', category: '雙液彈泥系列' },
  { code: 'A1009-5.3', name: 'SOS-AC2811無機彈泥 5加侖', category: '雙液彈泥系列' },
  { code: 'A1009-57', name: '聖德堡彈性水泥 5加侖', category: '雙液彈泥系列' },
  { code: 'A1005-51', name: '聖德堡彈性水泥 加侖', category: '雙液彈泥系列' },
  { code: 'A1009-53', name: 'FY 彈性水泥 5加侖', category: '雙液彈泥系列' },
  { code: 'A1005-6.5', name: 'FY彈性水泥(8kg乳+10kg粉)', category: '雙液彈泥系列' },
  { code: 'A1009-53.1', name: 'BC彈性水泥乳膠 5加', category: '雙液彈泥系列' },
  { code: 'A1009-51.2', name: '師傅牌壓克力彈泥 5加侖', category: '雙液彈泥系列' },
  { code: 'Z003', name: 'R-121雙劑型彈性水泥', category: '雙液彈泥系列' },
  { code: 'Z003-1', name: 'R-122壓克力系雙劑型彈性水泥', category: '雙液彈泥系列' },
  { code: 'Z003-2', name: 'R-818雙劑型彈性水泥', category: '雙液彈泥系列' },
  { code: 'A1018-1.44', name: '壓克力系單液彈泥-5加', category: '單液彈泥系列' },
  { code: 'A1018.43', name: '壓克力系單液彈泥-加侖', category: '單液彈泥系列' },
  { code: 'A1018-1.46', name: 'CF壓克力系單液彈泥-5加', category: '單液彈泥系列' },
  { code: 'A1018', name: '師傅牌單液型彈泥-銀灰色 5加', category: '單液彈泥系列' },
  { code: 'A1018.4', name: '師傅牌單液型彈泥-銀灰色 加侖', category: '單液彈泥系列' },
  { code: 'A1018-1.43', name: 'CF慶豐單液型彈性水泥-5加', category: '單液彈泥系列' },
  { code: 'A1018.1', name: '師傅牌水性高份子橡化瀝青 5加', category: '單液彈泥系列' },
  { code: 'A1018.5', name: '師傅牌水性高份子橡化瀝青 加侖', category: '單液彈泥系列' },
  { code: 'A1018-1.2', name: '師傅牌矽晶厚塗單泥 5加', category: '單液彈泥系列' },
  { code: 'A1018-1.42', name: '止漏家單液型彈泥S-5加', category: '單液彈泥系列' },
  { code: 'A1018-1.5', name: '止漏家單液型彈泥(FS-103) 5加', category: '單液彈泥系列' },
  { code: 'A1018-1.45', name: '黑漆牛壓克力系單液彈泥-5加', category: '單液彈泥系列' },
  { code: 'A1017.7-1', name: 'R-956亮磁漆', category: '亮磁漆' },
  { code: 'A1017.7-12', name: 'R-956亮磁漆(B劑)', category: '亮磁漆' },
  { code: 'A1017.71-1', name: 'R-980(B)', category: '亮磁漆' },
  { code: 'A1017.71', name: 'R-980高硬度外牆透明面漆', category: '亮磁漆' },
  { code: 'A1017.72', name: 'R-1067', category: '亮磁漆' },
  { code: 'A1017.41', name: '水性不黃變防水膠-5加', category: '水性面漆系列' },
  { code: 'A1017.4', name: '水性不黃變防水膠-加侖', category: '水性面漆系列' },
  { code: 'A1017.42', name: '水性不黃變防水膠-立裝', category: '水性面漆系列' },
  { code: 'A1017.6', name: 'SOS水性壓克力系防水能-5加侖', category: '水性面漆系列' },
  { code: 'A1017.61', name: 'SOS水性壓克力系防水能-加侖', category: '水性面漆系列' },
  { code: 'A1017.62', name: 'SOS水性壓克力系防水能-立裝', category: '水性面漆系列' },
  { code: 'A1018.2', name: '外牆水性防水膠-灰色 5加', category: '水性面漆系列' },
  { code: 'A1018.21', name: '外牆水性防水膠-灰綠 5加', category: '水性面漆系列' },
  { code: 'A1018.22', name: '外牆水性防水膠-白色 5加', category: '水性面漆系列' },
  { code: 'A1018.23', name: '外牆水性防水膠-米黃 5加', category: '水性面漆系列' },
  { code: 'A1018.6', name: '外牆水性防水膠-灰色 加侖', category: '水性面漆系列' },
  { code: 'A1018.61', name: '外牆水性防水膠-灰綠 加侖', category: '水性面漆系列' },
  { code: 'A1018.62', name: '外牆水性防水膠-白色 加侖', category: '水性面漆系列' },
  { code: 'A1018.63', name: '外牆水性防水膠-米黃 加侖', category: '水性面漆系列' },
  { code: 'A1018.3', name: '壓克力地坪防水膠-灰色 5加', category: '水性面漆系列' },
  { code: 'A1018.34', name: '壓克力地坪防水膠-綠 5加', category: '水性面漆系列' },
  { code: 'A1018.32', name: '壓克力地坪防水膠-白色 5加', category: '水性面漆系列' },
  { code: 'A1018.33', name: '壓克力地坪防水膠-米黃 5加', category: '水性面漆系列' },
  { code: 'A1018.7', name: '壓克力地坪防水膠-灰色 加侖', category: '水性面漆系列' },
  { code: 'A1018.71', name: '壓克力地坪防水膠-綠 加侖', category: '水性面漆系列' },
  { code: 'A1018.72', name: '壓克力地坪防水膠-白色 加侖', category: '水性面漆系列' },
  { code: 'A1018.73', name: '壓克力地坪防水膠-米黃 加侖', category: '水性面漆系列' },
  { code: 'A1019.21', name: 'SOS水性纖維防水能-灰色 5加', category: '水性面漆系列' },
  { code: 'A1019.2', name: 'SOS水性纖維防水能-灰綠 5加', category: '水性面漆系列' },
  { code: 'A1019.22', name: 'SOS水性纖維防水能-白色 5加', category: '水性面漆系列' },
  { code: 'A1019.23', name: 'SOS水性纖維防水能-米黃 5加', category: '水性面漆系列' },
  { code: 'A1019.1', name: 'SOS水性纖維防水能-灰色 加侖', category: '水性面漆系列' },
  { code: 'A1019', name: 'SOS水性纖維防水能-灰綠 加侖', category: '水性面漆系列' },
  { code: 'A1019.11', name: 'SOS水性纖維防水能-白色 加侖', category: '水性面漆系列' },
  { code: 'A1019.12', name: 'SOS水性纖維防水能-米黃 加侖', category: '水性面漆系列' },
  { code: 'A1019.31', name: 'SOS水性纖維防水能-灰色 立裝', category: '水性面漆系列' },
  { code: 'A2008-2', name: '航太隔熱-5加侖【烤漆板/白色】', category: '水性面漆系列' },
  { code: 'A2008-2.1', name: '航太隔熱-5加侖【水泥牆/白色】', category: '水性面漆系列' },
  { code: 'A2008-2.11', name: '航太隔熱-5加侖【水泥牆-米黃色', category: '水性面漆系列' },
  { code: 'A2008-2.111', name: '航太隔熱-5加侖【水泥牆/白色】', category: '水性面漆系列' },
  { code: 'A2008-2.13', name: '航太隔熱-5加侖【烤漆-米黃', category: '水性面漆系列' },
  { code: 'A2008-3', name: '航太隔熱-加侖【烤漆板/白色】', category: '水性面漆系列' },
  { code: 'A2008-3.1', name: '航太隔熱-加侖【水泥牆/白色】', category: '水性面漆系列' },
  { code: 'A2008-3.11', name: '航太隔熱-加侖【水泥牆/米黃色】', category: '水性面漆系列' },
  { code: 'A2008-2.12', name: '航太隔熱-5加侖【烤漆-灰色', category: '水性面漆系列' },
  { code: 'A2008-2.112', name: '航太隔熱-5加侖【水泥-灰色', category: '水性面漆系列' },
  { code: 'A2008', name: '水性PU防水隔熱漆 5加侖', category: '水性面漆系列' },
  { code: 'A1018.35-1', name: '止漏家水性止滑地坪漆-灰色 5加', category: '水性面漆系列' },
  { code: 'A1018.36-1', name: '止漏家水性止滑地坪漆-灰綠 5加', category: '水性面漆系列' },
  { code: 'A1018.39-1', name: '止漏家水性止滑地坪漆-白色 5加', category: '水性面漆系列' },
  { code: 'A1018.35', name: '止漏家水性耐磨地坪漆-灰色 5加', category: '水性面漆系列' },
  { code: 'A1018.36', name: '止漏家水性耐磨地坪漆-灰綠 5加', category: '水性面漆系列' },
  { code: 'A1018.38', name: '止漏家水性耐磨地坪漆-灰綠 加侖', category: '水性面漆系列' },
  { code: 'A1018.38-1', name: '止漏家水性耐磨地坪漆-灰色 加侖', category: '水性面漆系列' },
  { code: 'A1018.38-2', name: '止漏家水性耐磨地坪漆-白色 加侖', category: '水性面漆系列' },
  { code: 'Z006', name: 'R-231水性耐候彈性外牆漆-灰色', category: '水性面漆系列' },
  { code: 'Z006-2', name: 'R-231水性耐候彈性外牆漆-白色', category: '水性面漆系列' },
  { code: 'Z006-3', name: 'R-231水性耐候彈性外牆漆-米黃色', category: '水性面漆系列' },
  { code: 'Z009', name: 'R-132耐候型多用途透明漆', category: '水性面漆系列' },
  { code: 'A1011.7-31', name: '奈米級水性滲透型接著底漆 5加', category: '水性底漆系列' },
  { code: 'A1011.7-3', name: '奈米級水性滲透型接著底漆 加侖', category: '水性底漆系列' },
  { code: 'A1011.7-32', name: '奈米級水性滲透型接著底漆 立裝', category: '水性底漆系列' },
  { code: 'A1011.7-311', name: '奈米滲透型防水膠-W20', category: '水性底漆系列' },
  { code: 'A1011.93', name: '水泥面起砂/粉化固化劑-5加', category: '水性底漆系列' },
  { code: 'A1011.94', name: '水泥面起砂/粉化固化劑-加侖', category: '水性底漆系列' },
  { code: 'A1011.7-12', name: '壓克力系水泥強化劑-五加', category: '水性底漆系列' },
  { code: 'A1011.7-1', name: '壓克力系水泥強化劑-加侖', category: '水性底漆系列' },
  { code: 'A1011.7-11', name: '壓克力系水泥強化劑-立裝', category: '水性底漆系列' },
  { code: 'A1011.7-13', name: 'BH 強化劑-五加', category: '水性底漆系列' },
  { code: 'A1011.7-38', name: 'SOS強力防水底漆 5加', category: '水性底漆系列' },
  { code: 'A1011.7-39', name: 'SOS強力防水底漆 加侖', category: '水性底漆系列' },
  { code: 'A1011.94-1', name: 'C-185水泥起砂結晶修復劑-加侖', category: '水性底漆系列' },
  { code: 'A1011.94-1.1', name: 'C-185水泥起砂結晶修復劑-10KG', category: '水性底漆系列' },
  { code: 'A1011.95-1', name: 'S-102水泥界面劑', category: '水性底漆系列' },
  { code: 'A1011.95-2', name: 'M-102水泥界面劑', category: '水性底漆系列' },
  { code: 'A1011.95', name: '止漏家介面接著劑', category: '水性底漆系列' },
  { code: 'A1011.7-35', name: '止漏家水性滲透底漆 5加', category: '水性底漆系列' },
  { code: 'A1018.37', name: '止漏家水泥介面接著劑', category: '水性底漆系列' },
  { code: 'A1011.96', name: '石材背部防水加固劑', category: '水性底漆系列' },
  { code: 'A1011.7-37', name: '黑漆牛水性防水滲透底漆 5加', category: '水性底漆系列' },
  { code: 'Z001', name: 'R-15滲透型密著底漆', category: '水性底漆系列' },
  { code: 'Z002', name: 'R-351水泥介面接著劑', category: '水性底漆系列' },
  { code: 'A1006', name: '防水能 5加 透明', category: '油性系列' },
  { code: 'A1003-13', name: '防水能 5加 銀灰色', category: '油性系列' },
  { code: 'A1003-12', name: '防水能 5加-草綠', category: '油性系列' },
  { code: 'A1006-1', name: '防水能 5加 白色', category: '油性系列' },
  { code: 'A1006-2', name: '防水能 5加 牙色', category: '油性系列' },
  { code: 'A1003', name: '防水能 5加 灰色', category: '油性系列' },
  { code: 'A1005', name: '防水能 加侖 透明', category: '油性系列' },
  { code: 'A1002.1', name: '防水能 加侖 銀灰色', category: '油性系列' },
  { code: 'A1008-1.1', name: '防水能 加侖 草綠色', category: '油性系列' },
  { code: 'A1005-4', name: '防水能 加侖 白色', category: '油性系列' },
  { code: 'A1008-2', name: '防水能 加侖 牙色', category: '油性系列' },
  { code: 'A1002', name: '防水能 加侖 灰色', category: '油性系列' },
  { code: 'A1008', name: '防水能 加侖 1-06彩綠色', category: '油性系列' },
  { code: 'A1004', name: '防水能 立裝 透明', category: '油性系列' },
  { code: 'A1001.1', name: '防水能 立裝 銀灰色', category: '油性系列' },
  { code: 'A1001-1.11', name: '防水能 立裝-草綠色', category: '油性系列' },
  { code: 'A1004-4', name: '防水能 立裝 白色', category: '油性系列' },
  { code: 'A1004-5', name: '防水能 立裝 牙色', category: '油性系列' },
  { code: 'A1001', name: '防水能 立裝 灰色', category: '油性系列' },
  { code: 'A1001-1', name: '防水能 立裝 綠色', category: '油性系列' },
  { code: 'A1010-1.1', name: 'PU型防水膠 五加 銀灰', category: '油性系列' },
  { code: 'A1009-1.1', name: 'PU型防水膠 五加 草綠', category: '油性系列' },
  { code: 'A1009-3', name: 'PU型防水膠 五加 白', category: '油性系列' },
  { code: 'A1009-4', name: 'PU型防水膠 五加 牙', category: '油性系列' },
  { code: 'A1010-1', name: 'PU型防水膠 五加 灰', category: '油性系列' },
  { code: 'A1009-2', name: 'PU型防水膠 五加 綠', category: '油性系列' },
  { code: 'A1008-3.1', name: 'PU型防水膠 加侖 銀灰色', category: '油性系列' },
  { code: 'A1005-3.1', name: 'PU型防水膠 加侖 草綠', category: '油性系列' },
  { code: 'A1005-2', name: 'PU型防水膠 加侖 白色', category: '油性系列' },
  { code: 'A1005-7', name: 'PU型防水膠 加侖 牙色', category: '油性系列' },
  { code: 'A1008-3', name: 'PU型防水膠 加侖 灰色', category: '油性系列' },
  { code: 'A1003-4', name: '聖山防漏膠 透明 5加', category: '油性系列' },
  { code: 'A1003-7.1', name: '聖山防漏膠 銀灰色 5加', category: '油性系列' },
  { code: 'A1003-8', name: '聖山防漏膠 草綠 5加', category: '油性系列' },
  { code: 'A1003-5', name: '聖山防漏膠 白色 5加', category: '油性系列' },
  { code: 'A1003-6', name: '聖山防漏膠 牙白 5加', category: '油性系列' },
  { code: 'A1003-7', name: '聖山防漏膠 灰色 5加', category: '油性系列' },
  { code: 'A1003-3', name: '聖山防漏膠 綠色 5加', category: '油性系列' },
  { code: 'A1002-2', name: '聖山防漏膠 透明 加侖', category: '油性系列' },
  { code: 'A1002-5.1', name: '聖山防漏膠 銀灰色 加侖', category: '油性系列' },
  { code: 'A1002-6', name: '聖山防漏膠 草綠 加侖', category: '油性系列' },
  { code: 'A1002-4', name: '聖山防漏膠 白色 加侖', category: '油性系列' },
  { code: 'A1002-3', name: '聖山防漏膠 牙白 加侖', category: '油性系列' },
  { code: 'A1002-5', name: '聖山防漏膠 灰色 加侖', category: '油性系列' },
  { code: 'A1002-1', name: '聖山防漏膠 綠色 加侖', category: '油性系列' },
  { code: 'A1003.1', name: '高強度耐磨地坪漆-5加 灰色', category: '油性系列' },
  { code: 'A1003.11', name: '高強度耐磨地坪漆-5加 透明', category: '油性系列' },
  { code: 'A1003.12', name: '高強度耐磨地坪漆-5加 彩綠', category: '油性系列' },
  { code: 'A1003.2', name: '高強度耐磨地坪漆-加侖 灰色', category: '油性系列' },
  { code: 'A1003.21', name: '高強度耐磨地坪漆-加侖 彩綠', category: '油性系列' },
  { code: 'A1003.22', name: '高強度耐磨地坪漆-加侖 透明', category: '油性系列' },
  { code: 'A1007-2', name: 'PU型底漆 5加侖(豐)', category: '油性系列' },
  { code: 'A1007-1', name: 'PU型底漆 加侖(豐)', category: '油性系列' },
  { code: 'A1017.5', name: '油性不黃變金油 5加侖', category: '油性系列' },
  { code: 'A1017.51', name: '油性不黃變金油 加侖', category: '油性系列' },
  { code: 'A2009', name: '撥水劑WP-1000 五加侖', category: '撥水劑系列' },
  { code: 'A2009-1', name: '撥水劑WP-1000 加侖裝', category: '撥水劑系列' },
  { code: 'A2009-2', name: '撥水劑WP-1000 立裝', category: '撥水劑系列' },
  { code: 'A2009-3', name: 'WP1000撥水劑', category: '撥水劑系列' },
  { code: 'A2009-4', name: 'SOS水性滲透撥水劑 5加', category: '撥水劑系列' },
  { code: 'A2009-5', name: 'SOS水性滲透撥水劑 加侖', category: '撥水劑系列' },
  { code: 'A2009-9', name: 'BI7防壁癌漆-立', category: '撥水劑系列' },
  { code: 'A2009-6', name: '(師)水性滲透結晶保護劑 5加', category: '撥水劑系列' },
  { code: 'E0006', name: 'SOS 特級防水劑', category: '添加劑系列' },
  { code: 'E0006-1.1', name: 'SOS 特級防水劑 加侖', category: '添加劑系列' },
  { code: 'E0006-1.2', name: 'SOS濃縮防水劑-加侖', category: '添加劑系列' },
  { code: 'E0006-1', name: '師傅牌防水劑', category: '添加劑系列' },
  { code: 'E0001-1', name: '師傅牌防水劑 (立裝)', category: '添加劑系列' },
  { code: 'E0009-21', name: '急結劑 五加(圓桶裝)', category: '添加劑系列' },
  { code: 'E0009-2', name: '急速凝結劑-油桶', category: '添加劑系列' },
  { code: 'E0009-24', name: '急速凝結劑-圓桶', category: '添加劑系列' },
  { code: 'E0007.1', name: '師傅牌急結劑-加侖', category: '添加劑系列' },
  { code: 'E0008', name: '師傅牌急結劑(立裝)', category: '添加劑系列' },
  { code: 'E0007', name: '聖山急結劑-加侖', category: '添加劑系列' },
  { code: 'B0001', name: '煤焦油', category: '柏油系列' },
  { code: 'A4022-5', name: '3m/m熱熔式砂面防水毯-8330S', category: '柏油系列' },
  { code: 'B1001', name: '聖山牌柏油(加侖)', category: '柏油系列' },
  { code: 'B1002', name: '聖山牌柏油(7.5KG)', category: '柏油系列' },
  { code: 'B1003', name: '正焦油(聖)9KG新桶', category: '柏油系列' },
  { code: 'B1003-1', name: '正焦油(聖)9kg塑膠桶', category: '柏油系列' },
  { code: 'B1004-1', name: '正焦油(舊鷹)10KG(草繩)', category: '柏油系列' },
  { code: 'B1004-1.1', name: '正焦油(舊鷹)10KG(紅帶)', category: '柏油系列' },
  { code: 'B1004-3', name: '正焦油(聖)-10kg新桶', category: '柏油系列' },
  { code: 'B1013', name: '正焦油 50加', category: '柏油系列' },
  { code: 'B3002', name: '快乾柏油(鷹) 7.5KG', category: '柏油系列' },
  { code: 'B4002', name: '紅葉柏油 7.5KG(新桶)', category: '柏油系列' },
  { code: 'B4012-4', name: '防水毯專用底油', category: '柏油系列' },
  { code: 'B4014', name: 'AC柏油 40公斤', category: '柏油系列' },
  { code: 'B4015-1.1', name: '乳化瀝青10KG', category: '柏油系列' },
  { code: 'B4015-1.2', name: '乳化瀝青-加侖', category: '柏油系列' },
  { code: 'B4015-1.3', name: '乳化瀝青10KG-圓桶', category: '柏油系列' },
  { code: 'B4022-13', name: 'PE面自黏式防水毯-1.5m/m', category: '柏油系列' },
  { code: 'D1003', name: '好用瀝青膠 1加', category: '柏油系列' },
  { code: 'D1004', name: '紅葉瀝青膠', category: '柏油系列' },
  { code: 'D1007', name: '特製石棉膠', category: '柏油系列' },
  { code: 'D2004-2', name: '白牛22-6坪', category: '柏油系列' },
  { code: 'B2001', name: '黑凡立水 1加', category: '柏油系列' },
  { code: 'B2002', name: '黑凡立水 8KG', category: '柏油系列' },
  { code: 'B2008', name: '黑凡立水 5加', category: '柏油系列' },
  { code: 'A0005-13', name: 'Epoxy 面漆', category: '粉劑、塑膠系列' },
  { code: 'A0005-14', name: '填縫材#202', category: '粉劑、塑膠系列' },
  { code: 'A0005-14.1', name: '填縫材#202-主劑', category: '粉劑、塑膠系列' },
  { code: 'A1011', name: '彈泥專用粉劑-水泥色', category: '粉劑、塑膠系列' },
  { code: 'A1011-1', name: '彈性水泥粉劑-4KG', category: '粉劑、塑膠系列' },
  { code: 'A1011-3', name: '粉劑-鐵灰色#L8C171(加砂加纖)', category: '粉劑、塑膠系列' },
  { code: 'A1011-3.12', name: '粉劑-水泥色#L13G2362(加砂加纖)', category: '粉劑、塑膠系列' },
  { code: 'A1011-3.14', name: '粉劑-水泥色#L13K2265(NO砂NO纖)', category: '粉劑、塑膠系列' },
  { code: 'A1011-3.3', name: '粉劑-黑色#L10G1411(加砂加纖)', category: '粉劑、塑膠系列' },
  { code: 'A1011-3.31', name: '粉劑-黑色#L10G2711(NO砂NO纖)', category: '粉劑、塑膠系列' },
  { code: 'A1011-3.33', name: '粉劑-黑色深#L14C2261(加砂加纖)', category: '粉劑、塑膠系列' },
  { code: 'A1011-3.34', name: '粉劑-黑色#L1664(NO砂NO纖)', category: '粉劑、塑膠系列' },
  { code: 'A1011-3.6', name: 'A1黏著劑', category: '粉劑、塑膠系列' },
  { code: 'A1011-3.5', name: '超黏黏著劑-AA90', category: '粉劑、塑膠系列' },
  { code: 'A1011.21', name: '石英砂#9', category: '粉劑、塑膠系列' },
  { code: 'A1012-1.3', name: '兩液PU防水材2:1', category: '粉劑、塑膠系列' },
  { code: 'A1012-2', name: '底漆-15kG', category: '粉劑、塑膠系列' },
  { code: 'A1013-1', name: '底漆-10KG', category: '粉劑、塑膠系列' },
  { code: 'A1013-2.1', name: '面漆2:1 (15kg-綠色 )', category: '粉劑、塑膠系列' },
  { code: 'A1013-2.3', name: '面漆2：1（15kg-灰色)', category: '粉劑、塑膠系列' },
  { code: 'A1013-2.31', name: '面漆（20kg-灰色)', category: '粉劑、塑膠系列' },
  { code: 'A1015-2', name: '地板材K222中塗-30KG', category: '粉劑、塑膠系列' },
  { code: 'A1017.8', name: '接著劑-PP1', category: '粉劑、塑膠系列' },
  { code: 'A1017.81', name: '接著劑-PP2', category: '粉劑、塑膠系列' },
  { code: 'A2002-2', name: '樹脂', category: '粉劑、塑膠系列' },
  { code: 'A2003-1', name: '不織布10CM*100M', category: '粉劑、塑膠系列' },
  { code: 'A2003-1.1', name: '不織布15CM*100M', category: '粉劑、塑膠系列' },
  { code: 'A2003-2', name: '不織布(1025H)1M*100M', category: '粉劑、塑膠系列' },
  { code: 'A2003-3', name: '不織布40cm*100m', category: '粉劑、塑膠系列' },
  { code: 'A2003-3.0', name: '不織布50cm*100m', category: '粉劑、塑膠系列' },
  { code: 'A2003-4', name: '不織布20CM*100M', category: '粉劑、塑膠系列' },
  { code: 'A2003-4.0', name: '不織布25CM*100M', category: '粉劑、塑膠系列' },
  { code: 'A2003-4.1', name: '不織布30CM*100M', category: '粉劑、塑膠系列' },
  { code: 'A2003-4.3', name: '不織布60CM*100M', category: '粉劑、塑膠系列' },
  { code: 'A2003-9.1', name: '訂製不織布', category: '粉劑、塑膠系列' },
  { code: 'A2003.1', name: '玻纖網-非自黏1M*50m', category: '粉劑、塑膠系列' },
  { code: 'A2003.12', name: '玻纖網-非自黏20CM*50m', category: '粉劑、塑膠系列' },
  { code: 'A2003.7', name: '六角網【小網目】1M*100Y', category: '粉劑、塑膠系列' },
  { code: 'A2003.71', name: '六角網【小網目】20cm*100Y', category: '粉劑、塑膠系列' },
  { code: 'A2003.76', name: '六角網【小網目】30cm*100Y', category: '粉劑、塑膠系列' },
  { code: 'A2003.77', name: '六角網【小網目】10cm*100Y', category: '粉劑、塑膠系列' },
  { code: 'A2003.78', name: '六角網【小網目】15cm*100Y', category: '粉劑、塑膠系列' },
  { code: 'A2003.72', name: '六角網【大網目】1M*100Y', category: '粉劑、塑膠系列' },
  { code: 'A2003.73', name: '六角網【大網目】20cm*100Y', category: '粉劑、塑膠系列' },
  { code: 'A2003.74', name: '六角網【大網目】10cm*100Y', category: '粉劑、塑膠系列' },
  { code: 'A2003.79', name: '六角網【大網目】15cm*100Y', category: '粉劑、塑膠系列' },
  { code: 'A2003.83', name: '六角網【大網目】30cm*100Y', category: '粉劑、塑膠系列' },
  { code: 'A2003.80', name: '六角網【大網目】50cm*100Y', category: '粉劑、塑膠系列' },
  { code: 'A3007', name: '速易貼 7.5cm*20米', category: '粉劑、塑膠系列' },
  { code: 'E0012-1', name: '地磚清潔劑', category: '粉劑、塑膠系列' },
  { code: 'F1020', name: '油桶 2立', category: '粉劑、塑膠系列' },
  { code: 'F1030', name: '油桶 3立', category: '粉劑、塑膠系列' },
  { code: 'F1040', name: '油桶 4立', category: '粉劑、塑膠系列' },
  { code: 'F1050', name: '油桶 5立', category: '粉劑、塑膠系列' },
  { code: 'F1060', name: '油桶 10台斤', category: '粉劑、塑膠系列' },
  { code: 'F1080', name: '油桶 8立', category: '粉劑、塑膠系列' },
  { code: 'F1100', name: '油桶 10立', category: '粉劑、塑膠系列' },
  { code: 'F1100-1', name: '油桶 10立水龍頭', category: '粉劑、塑膠系列' },
  { code: 'F1100-2', name: '油桶 10立 大口', category: '粉劑、塑膠系列' },
  { code: 'F1160', name: '油桶 16立', category: '粉劑、塑膠系列' },
  { code: 'F1200-1', name: '油桶 20立 大口', category: '粉劑、塑膠系列' },
  { code: 'F1200-2', name: '油桶 20立 大型', category: '粉劑、塑膠系列' },
  { code: 'F1200-3', name: '油桶 20立 超大∴', category: '粉劑、塑膠系列' },
  { code: 'F1200-4', name: '油桶 新20立-大口(FJ-專案)', category: '粉劑、塑膠系列' },
  { code: 'F1200-5', name: '油桶 新20立-水龍頭(FJ-專案)', category: '粉劑、塑膠系列' },
  { code: 'F1200-7', name: '油桶 新20立-小型(FJ-專案)', category: '粉劑、塑膠系列' },
  { code: 'F1201', name: '四角油桶 20立', category: '粉劑、塑膠系列' },
  { code: 'F1202', name: '油桶 20立水龍頭', category: '粉劑、塑膠系列' },
  { code: 'F1250', name: '四角桶 25立', category: '粉劑、塑膠系列' },
  { code: 'F1300-1', name: '油桶 30立水龍頭', category: '粉劑、塑膠系列' },
  { code: 'F1300-2', name: '油桶 30立 大口', category: '粉劑、塑膠系列' },
  { code: 'F1400-1', name: '油桶 40台斤', category: '粉劑、塑膠系列' },
  { code: 'F1500-1', name: '20L綠色大口蓋', category: '粉劑、塑膠系列' },
  { code: 'F1500-1.1', name: '20L綠色小口蓋', category: '粉劑、塑膠系列' },
  { code: 'F1500-1.2', name: '20L中瓶蓋+小P', category: '粉劑、塑膠系列' },
  { code: 'F1500-1.3', name: '油桶小尖嘴蓋', category: '粉劑、塑膠系列' },
  { code: 'F1500-1.4', name: '20L大口綠蓋內塞', category: '粉劑、塑膠系列' },
  { code: 'F1500-2', name: '噴水器白蓋(大)', category: '粉劑、塑膠系列' },
  { code: 'F2050', name: '水缸 5斗', category: '粉劑、塑膠系列' },
  { code: 'F2180', name: '水缸 18斗', category: '粉劑、塑膠系列' },
  { code: 'F21801', name: '水缸 耐力18斗', category: '粉劑、塑膠系列' },
  { code: 'F2260', name: '水缸 26斗', category: '粉劑、塑膠系列' },
  { code: 'F3010', name: '噴水器 大', category: '粉劑、塑膠系列' },
  { code: 'F3011', name: '噴水器 超特大', category: '粉劑、塑膠系列' },
  { code: 'F3012', name: '噴水器 特大', category: '粉劑、塑膠系列' },
  { code: 'F3013', name: '噴水器 13.5公升', category: '粉劑、塑膠系列' },
  { code: 'F3020', name: '噴水器 中', category: '粉劑、塑膠系列' },
  { code: 'F3030', name: '噴水器 小', category: '粉劑、塑膠系列' },
  { code: 'F3030-1', name: '水龍頭', category: '粉劑、塑膠系列' },
  { code: 'F3040', name: '便器 大', category: '粉劑、塑膠系列' },
  { code: 'F3050', name: '便器 中', category: '粉劑、塑膠系列' },
  { code: 'F3060', name: '便器 小', category: '粉劑、塑膠系列' },
  { code: 'G0011', name: '六格籃', category: '粉劑、塑膠系列' },
  { code: 'H200-3', name: '日本(貓)8.5M/M*100M', category: '粉劑、塑膠系列' },
  { code: 'H200-31', name: '日本(貓)8.5*50M', category: '粉劑、塑膠系列' },
  { code: 'H200-4', name: '日本(貓)7.5*100M', category: '粉劑、塑膠系列' },
  { code: 'H200-41', name: '日本(貓)7.5*50M', category: '粉劑、塑膠系列' },
  { code: 'H2030.2', name: '石原高壓管7.5*8尺(雙面母牙)', category: '粉劑、塑膠系列' },
  { code: 'H2651', name: '石原高壓管7.5*100M', category: '粉劑、塑膠系列' },
  { code: 'H2651-1', name: '石原高壓管7.5*50M', category: '粉劑、塑膠系列' },
  { code: 'H2651-5', name: '石原高壓管7.5*30M', category: '粉劑、塑膠系列' },
  { code: 'H2651-6', name: '石原高壓管7.5*20M', category: '粉劑、塑膠系列' },
  { code: 'H2651-9', name: '石原高壓管7.5*10M', category: '粉劑、塑膠系列' },
  { code: 'H2652', name: '石原高壓管8.5*100M', category: '粉劑、塑膠系列' },
  { code: 'H2652-1', name: '石原高壓管8.5*50M', category: '粉劑、塑膠系列' },
  { code: 'H2652-4', name: '石原高壓管8.5*8尺', category: '粉劑、塑膠系列' },
  { code: 'H2652-6', name: '石原高壓管8.5*20M', category: '粉劑、塑膠系列' },
  { code: 'H2652-7', name: '石原高壓管8.5*30M', category: '粉劑、塑膠系列' },
  { code: 'I1002', name: '訂制水管', category: '粉劑、塑膠系列' },
  { code: 'H2656.10', name: '訂製高壓管', category: '粉劑、塑膠系列' },
  { code: 'H2857', name: '西川高壓管13M/M*100M', category: '粉劑、塑膠系列' },
  { code: 'I1012.1', name: '彈力膠管-黃 1 1/4"', category: '粉劑、塑膠系列' },
  { code: 'I1030', name: '彈力瓦斯管 3分', category: '粉劑、塑膠系列' },
  { code: 'I10472', name: '彈力膠管-紅 4.7分', category: '粉劑、塑膠系列' },
  { code: 'I10472.1', name: '彈力膠管-黃 4.7分', category: '粉劑、塑膠系列' },
  { code: 'I10602', name: '彈力膠管-紅 6分', category: '粉劑、塑膠系列' },
  { code: 'I10602.1', name: '彈力膠管-黃 6分', category: '粉劑、塑膠系列' },
  { code: 'I10802', name: '彈力膠管-紅 8分', category: '粉劑、塑膠系列' },
  { code: 'I2015', name: '透明膠管 1.5分*1', category: '粉劑、塑膠系列' },
  { code: 'I2020-1', name: '透明水管 2分*1.5mm', category: '粉劑、塑膠系列' },
  { code: 'I2025', name: '透明膠管 2.5分*1.5', category: '粉劑、塑膠系列' },
  { code: 'I2030', name: '透明膠管 3分*1.5', category: '粉劑、塑膠系列' },
  { code: 'I2031', name: '特製透明管 3分*3m/m', category: '粉劑、塑膠系列' },
  { code: 'I2035', name: '透明膠管 3.5*1.5', category: '粉劑、塑膠系列' },
  { code: 'I2040.1', name: '透明膠管 4分*1.5', category: '粉劑、塑膠系列' },
  { code: 'I2041.1', name: '透明膠管 4分*2m/m', category: '粉劑、塑膠系列' },
  { code: 'I2047.1', name: '透明膠管 4.7分*2', category: '粉劑、塑膠系列' },
  { code: 'I2061.1', name: '透明膠管 6分*3', category: '粉劑、塑膠系列' },
  { code: 'I2081.1', name: '透明膠管 8分*3', category: '粉劑、塑膠系列' },
  { code: 'I2120', name: '透明膠管 11/4"*3.5', category: '粉劑、塑膠系列' },
  { code: 'I3047-1', name: '珍珠黑 4.7分*150m', category: '粉劑、塑膠系列' },
  { code: 'I3060-1', name: '珠光黑 6分*120m', category: '粉劑、塑膠系列' },
  { code: 'I3060-11', name: '珠光黑JS-6分', category: '粉劑、塑膠系列' },
  { code: 'I3080-1', name: '珠光黑 8分*85m', category: '粉劑、塑膠系列' },
  { code: 'I3120-1', name: '珠光-黑 1.2"*85m', category: '粉劑、塑膠系列' },
  { code: 'I4003', name: '網管 3分', category: '粉劑、塑膠系列' },
  { code: 'I4004', name: '網管 4分', category: '粉劑、塑膠系列' },
  { code: 'I4005', name: '網管 5分', category: '粉劑、塑膠系列' },
  { code: 'I4006', name: '網管 6分*100MM', category: '粉劑、塑膠系列' },
  { code: 'I4007', name: '網管7分*3.75m/m*100M', category: '粉劑、塑膠系列' },
  { code: 'I4008', name: '網管8分*4mm*100M', category: '粉劑、塑膠系列' },
  { code: 'I4013', name: '黑瓦斯管', category: '粉劑、塑膠系列' },
  { code: 'J2012', name: '伸縮管 1 1/4"', category: '粉劑、塑膠系列' },
  { code: 'J2015', name: '伸縮管 1 1/2"', category: '粉劑、塑膠系列' },
  { code: 'J2020', name: '伸縮管 2"', category: '粉劑、塑膠系列' },
  { code: 'J2080', name: '伸縮管 8"', category: '粉劑、塑膠系列' },
  { code: 'J3012', name: '特多龍繩 1.2分', category: '粉劑、塑膠系列' },
  { code: 'J3015', name: '特多龍繩 1.5分', category: '粉劑、塑膠系列' },
  { code: 'J3020', name: '特多龍繩 2分', category: '粉劑、塑膠系列' },
  { code: 'J3025', name: '特多龍繩 2.5分', category: '粉劑、塑膠系列' },
  { code: 'J3030', name: '特多龍繩 3分', category: '粉劑、塑膠系列' },
  { code: 'J3040', name: '特多龍繩 4分', category: '粉劑、塑膠系列' },
  { code: 'J4002', name: '山力水管2"*100m(B)', category: '粉劑、塑膠系列' },
  { code: 'J4003', name: '山力水管3"*100m(B)', category: '粉劑、塑膠系列' },
  { code: 'J4004-1', name: '山力水管4"*100M(B)', category: '粉劑、塑膠系列' },
  { code: 'J4015', name: '山力水管1.5"*100m(B)', category: '粉劑、塑膠系列' },
  { code: 'L3401', name: '浪板用壓板-小浪', category: '粉劑、塑膠系列' },
  { code: 'L3402', name: '浪板用壓板-大浪', category: '粉劑、塑膠系列' },
  { code: 'L3403', name: '浪板用壓板-角槽', category: '粉劑、塑膠系列' },
  { code: 'L4000', name: '訂製PC浪板', category: '粉劑、塑膠系列' },
  { code: 'L4000.1', name: '訂製PC平板', category: '粉劑、塑膠系列' },
  { code: 'L4060', name: 'PC浪板 明6尺', category: '粉劑、塑膠系列' },
  { code: 'L4060-1', name: 'PC浪板 綠6尺', category: '粉劑、塑膠系列' },
  { code: 'L4060-1.1', name: 'PC浪板 綠6尺-抗UV', category: '粉劑、塑膠系列' },
  { code: 'L4070', name: 'PC浪板 明7尺', category: '粉劑、塑膠系列' },
  { code: 'L4070-1', name: 'PC浪板 綠7尺', category: '粉劑、塑膠系列' },
  { code: 'L4070-1.1', name: 'PC浪板 綠7尺-抗UV', category: '粉劑、塑膠系列' },
  { code: 'L4080', name: 'PC浪板 明8尺', category: '粉劑、塑膠系列' },
  { code: 'L4080-1', name: 'PC浪板 綠8尺', category: '粉劑、塑膠系列' },
  { code: 'L4080-1.1', name: 'PC浪板 綠8尺-抗UV', category: '粉劑、塑膠系列' },
  { code: 'L4090', name: 'PC浪板 明9尺', category: '粉劑、塑膠系列' },
  { code: 'L4100', name: 'PC浪板 明10尺', category: '粉劑、塑膠系列' },
  { code: 'L4100-1', name: 'PC浪板 綠10尺', category: '粉劑、塑膠系列' },
  { code: 'L4120', name: 'PC浪板 明12尺', category: '粉劑、塑膠系列' },
  { code: 'M0007-2', name: '纖維小浪板1.5M/M*6尺', category: '粉劑、塑膠系列' },
  { code: 'M0008-2', name: '纖維小浪板1.5M/M*7尺', category: '粉劑、塑膠系列' },
  { code: 'M0009-2', name: '纖維小浪板1.5M/M*8尺', category: '粉劑、塑膠系列' },
  { code: 'M0007-1', name: '纖維大浪板1.5m/m*6尺', category: '粉劑、塑膠系列' },
  { code: 'M0008-1', name: '纖維大浪板1.5m/m*7尺', category: '粉劑、塑膠系列' },
  { code: 'M0009-1', name: '纖維大浪板1.5m/m*8尺', category: '粉劑、塑膠系列' },
  { code: 'N0001', name: '南亞硬質膠布 3尺*60M', category: '粉劑、塑膠系列' },
  { code: 'N0011-1', name: '軟質膠布0.05*6尺*100Y', category: '粉劑、塑膠系列' },
  { code: 'N0011-2', name: '軟質膠布0.05*4尺*100Y', category: '粉劑、塑膠系列' },
  { code: 'N0012', name: '軟質膠布0.08*4尺*50Y', category: '粉劑、塑膠系列' },
  { code: 'N0013-1', name: '軟質膠布0.12*4尺*50Y', category: '粉劑、塑膠系列' },
  { code: 'N0013-3', name: '軟質膠布0.125*6尺*50Y', category: '粉劑、塑膠系列' },
  { code: 'N0014-2', name: '軟質膠布0.17*4尺*50Y', category: '粉劑、塑膠系列' },
  { code: 'N0014-3', name: '軟質膠布0.17*6尺*50Y', category: '粉劑、塑膠系列' },
  { code: 'N0025', name: '軟質布0.48*4尺*50Y', category: '粉劑、塑膠系列' },
  { code: 'N0026', name: '軟質布0.27m/m*4尺*50Y', category: '粉劑、塑膠系列' },
  { code: 'N0026-1', name: '軟質布0.27m/m*6尺*50Y', category: '粉劑、塑膠系列' },
  { code: 'P0003-5', name: '黑網05B-3尺B', category: '粉劑、塑膠系列' },
  { code: 'P0004-5', name: '黑網05B-4尺B', category: '粉劑、塑膠系列' },
  { code: 'P0005-5', name: '黑網05B-5尺B', category: '粉劑、塑膠系列' },
  { code: 'P0006-5', name: '黑網05B-6尺B', category: '粉劑、塑膠系列' },
  { code: 'P0003-6', name: '黑網06B-3尺B', category: '粉劑、塑膠系列' },
  { code: 'P0004-6', name: '黑網06B-4尺B', category: '粉劑、塑膠系列' },
  { code: 'P0005-6', name: '黑網06B-5尺B', category: '粉劑、塑膠系列' },
  { code: 'P0006-6', name: '黑網06B-6尺B', category: '粉劑、塑膠系列' },
  { code: 'P0002-9', name: '黑網09B-2尺B', category: '粉劑、塑膠系列' },
  { code: 'P0025-9', name: '黑網09B-2.5尺', category: '粉劑、塑膠系列' },
  { code: 'P0002.5-9', name: '黑網09B-2.5尺B', category: '粉劑、塑膠系列' },
  { code: 'P0003-9', name: '黑網09B-3尺B', category: '粉劑、塑膠系列' },
  { code: 'P0004-9', name: '黑網09B-4尺B', category: '粉劑、塑膠系列' },
  { code: 'P0005-9', name: '黑網09B-5尺B', category: '粉劑、塑膠系列' },
  { code: 'P1003-5', name: '青網05B-3尺B', category: '粉劑、塑膠系列' },
  { code: 'P1005-5', name: '青網05B-5尺B', category: '粉劑、塑膠系列' },
  { code: 'P1003-6', name: '青網06B-3尺B', category: '粉劑、塑膠系列' },
  { code: 'P1004-6', name: '青網06B-4尺B', category: '粉劑、塑膠系列' },
  { code: 'P1005-6', name: '青網06B-5尺B', category: '粉劑、塑膠系列' },
  { code: 'P1006-6', name: '青網06B-6尺B', category: '粉劑、塑膠系列' },
  { code: 'S0001-5', name: '雨帆 B 8*12', category: '粉劑、塑膠系列' },
  { code: 'S0002-5', name: '雨帆 B 10*10', category: '粉劑、塑膠系列' },
  { code: 'S0004-5', name: '雨帆 B 12*12', category: '粉劑、塑膠系列' },
  { code: 'S0006-5', name: '雨帆 B 14*14', category: '粉劑、塑膠系列' },
  { code: 'S0007-2', name: '雨帆 B 16*16', category: '粉劑、塑膠系列' },
  { code: 'S0009-5', name: '雨帆 B 18*18', category: '粉劑、塑膠系列' },
  { code: 'S0010-5', name: '雨帆 B 20*20', category: '粉劑、塑膠系列' },
  { code: 'S0011-5', name: '雨帆 B 20*30', category: '粉劑、塑膠系列' },
  { code: 'S0013-5', name: '雨帆 B 24*24', category: '粉劑、塑膠系列' },
  { code: 'S0015-5', name: '雨帆 B 30*30', category: '粉劑、塑膠系列' },
  { code: 'S0018-5', name: '雨帆 B 40*40', category: '粉劑、塑膠系列' },
  { code: 'S0002-51', name: '翠綠 B級 10*10', category: '粉劑、塑膠系列' },
  { code: 'S0004-51', name: '翠綠 B級 12*12', category: '粉劑、塑膠系列' },
  { code: 'S0006-51', name: '翠綠 B級 14*14', category: '粉劑、塑膠系列' },
  { code: 'S0007-21', name: '翠綠 B級 16*16', category: '粉劑、塑膠系列' },
  { code: 'S0009-51', name: '翠綠 B級 18*18', category: '粉劑、塑膠系列' },
  { code: 'S0010-51', name: '翠綠 B級 20*20', category: '粉劑、塑膠系列' },
  { code: 'S0001', name: '雨帆雙A級 8*12', category: '粉劑、塑膠系列' },
  { code: 'S0002', name: '雨帆雙A級 10*10', category: '粉劑、塑膠系列' },
  { code: 'S0004', name: '雨帆雙A級 12*12', category: '粉劑、塑膠系列' },
  { code: 'S0006', name: '雨帆雙A級 14*14', category: '粉劑、塑膠系列' },
  { code: 'S0007', name: '雨帆雙A級 16*16', category: '粉劑、塑膠系列' },
  { code: 'S0009', name: '雨帆雙A級 18*18', category: '粉劑、塑膠系列' },
  { code: 'S0010', name: '雨帆雙A級 20*20', category: '粉劑、塑膠系列' },
  { code: 'S0011', name: '雨帆雙A級 20*30', category: '粉劑、塑膠系列' },
  { code: 'S0013', name: '雨帆雙A級 24*24', category: '粉劑、塑膠系列' },
  { code: 'S0015', name: '雨帆雙A級 30*30', category: '粉劑、塑膠系列' },
  { code: 'S0018', name: '雨帆雙A級 40*40', category: '粉劑、塑膠系列' },
  { code: 'S3001', name: '全藍雨帆 10*10', category: '粉劑、塑膠系列' },
  { code: 'S3002', name: '全藍雨帆 12*12', category: '粉劑、塑膠系列' },
  { code: 'S3003', name: '全藍雨帆 14*14', category: '粉劑、塑膠系列' },
  { code: 'S3004', name: '全藍雨帆 16*16', category: '粉劑、塑膠系列' },
  { code: 'S3005', name: '全藍雨帆 18*18', category: '粉劑、塑膠系列' },
  { code: 'S3006', name: '全藍雨帆 20*20', category: '粉劑、塑膠系列' },
  { code: 'S3007', name: '全藍雨帆 24*24', category: '粉劑、塑膠系列' },
  { code: 'S3008', name: '全藍雨帆 30*30', category: '粉劑、塑膠系列' },
  { code: 'S3001-12', name: '紅藍白雨帆 10*10', category: '粉劑、塑膠系列' },
  { code: 'S3002-1', name: '紅藍白雨帆 12*12', category: '粉劑、塑膠系列' },
  { code: 'S3003-1', name: '紅藍白雨帆 14*14', category: '粉劑、塑膠系列' },
  { code: 'S3004-1', name: '紅藍白雨帆 16*16', category: '粉劑、塑膠系列' },
  { code: 'S3005-1', name: '紅藍白雨帆 18*18', category: '粉劑、塑膠系列' },
  { code: 'S3006-1', name: '紅藍白雨帆 20*20', category: '粉劑、塑膠系列' },
  { code: 'S3007-1', name: '紅藍白雨帆24*24', category: '粉劑、塑膠系列' },
  { code: 'S3008-1', name: '紅藍白雨帆 30*30', category: '粉劑、塑膠系列' },
  { code: 'S3009-1', name: '紅藍白雨帆 20*30', category: '粉劑、塑膠系列' },
  { code: 'S3011-1', name: '紅藍白雨帆 40*40', category: '粉劑、塑膠系列' },
  { code: 'S3010-1.1', name: '紅藍白雨帆 訂製', category: '粉劑、塑膠系列' },
  { code: 'S3010.11', name: '訂製竹竿帆-全藍雨帆', category: '粉劑、塑膠系列' },
  { code: 'S3010-1.2', name: '訂製竹竿帆-紅藍白條雨帆', category: '粉劑、塑膠系列' },
  { code: 'S001.2', name: '藍白雨帆(A) 訂製', category: '粉劑、塑膠系列' },
  { code: 'S001.1', name: '藍白雨帆(B) 訂製', category: '粉劑、塑膠系列' },
  { code: 'S001-1.1', name: '0.37夾網雨帆 訂製', category: '粉劑、塑膠系列' },
  { code: 'S001-1.12', name: '0.37夾網雨帆-立体袋', category: '粉劑、塑膠系列' },
  { code: 'S001-1.11', name: '0.37夾網圍裙', category: '粉劑、塑膠系列' },
  { code: 'S001-1.2', name: '0.5夾網雨帆 訂製', category: '粉劑、塑膠系列' },
  { code: 'S001.12', name: '立体袋-藍白條雨帆(B)', category: '粉劑、塑膠系列' },
  { code: 'S001-1-2', name: '百吉網80%', category: '粉劑、塑膠系列' },
  { code: 'S001-1.3', name: '訂製0.8軍用帆布(油布)', category: '粉劑、塑膠系列' },
  { code: 'S001-1.31', name: '訂製0.5軍用帆布(油布)', category: '粉劑、塑膠系列' },
  { code: 'U2', name: '代工費', category: '粉劑、塑膠系列' },
  { code: 'S0011-4', name: '雨帆B 4尺*120Y', category: '粉劑、塑膠系列' },
  { code: 'S0017', name: '雨帆B 4尺*200Y', category: '粉劑、塑膠系列' },
  { code: 'S0011-6', name: '雨帆B 6尺*120Y', category: '粉劑、塑膠系列' },
  { code: 'S0011-1b', name: '雨帆B 8尺*120Y', category: '粉劑、塑膠系列' },
  { code: 'S0011-8', name: '雨帆(A)8尺*120Y', category: '粉劑、塑膠系列' },
  { code: 'S3010.1', name: '全藍雨帆 訂製', category: '粉劑、塑膠系列' },
  { code: 'P610-12', name: '平織網610-12尺', category: '粉劑、塑膠系列' },
  { code: 'Q1-21', name: '尼龍接頭11/2"', category: '粉劑、塑膠系列' },
  { code: 'Q1-22', name: '尼龍塞頭11/2"', category: '粉劑、塑膠系列' },
  { code: 'QK500', name: '普力桶 K-500', category: '粉劑、塑膠系列' },
  { code: 'QM200-1', name: '普力桶 M200(大A)', category: '粉劑、塑膠系列' },
  { code: 'QM300-2', name: '普力桶 M300(大A)', category: '粉劑、塑膠系列' },
  { code: 'QP003', name: '普力水塔 PT1000-A', category: '粉劑、塑膠系列' },
  { code: 'U2002-5', name: '玻璃纖維絲', category: '粉劑、塑膠系列' },
  { code: 'U25', name: '提貨', category: '粉劑、塑膠系列' },
  { code: 'U25-2', name: '止水帶A1(4m/m*15cm*30M)', category: '粉劑、塑膠系列' },
  { code: 'U25-5', name: '滾輪刷-8"', category: '粉劑、塑膠系列' },
  { code: 'U29-1', name: '3.5加侖空桶', category: '粉劑、塑膠系列' },
  { code: 'U29', name: '4.5加-尼士桶', category: '粉劑、塑膠系列' },
  { code: 'U29-5', name: '正焦油白身桶(加侖)', category: '粉劑、塑膠系列' },
  { code: 'U30-1.1', name: '彈泥-加侖桶(空白)', category: '粉劑、塑膠系列' },
  { code: 'U30-3.41', name: '空桶五加侖-空白桶', category: '粉劑、塑膠系列' },
  { code: 'U30-33', name: '空桶 師傅牌彈泥5加', category: '粉劑、塑膠系列' },
  { code: 'U30-37.1', name: '空桶-18L-SOS壓克力單泥', category: '粉劑、塑膠系列' },
  { code: 'U30-3.6', name: '空桶 五加侖(止漏家)', category: '粉劑、塑膠系列' },
  { code: 'U30-43', name: '空桶 15L空白桶', category: '粉劑、塑膠系列' },
  { code: 'U30-5', name: '彈泥空桶(白身)-5加', category: '粉劑、塑膠系列' },
  { code: 'U30-9', name: '5加侖平蓋', category: '粉劑、塑膠系列' },
  { code: 'U30-9.1', name: '加侖平蓋', category: '粉劑、塑膠系列' },
  { code: 'U38', name: '運費', category: '粉劑、塑膠系列' },
  { code: 'U30-I1', name: '10L塑膠回收桶', category: '粉劑、塑膠系列' },
  { code: 'U35-6', name: '白牛空白車灌袋25kg', category: '粉劑、塑膠系列' },
  { code: 'V01-1', name: '南亞桌墊1.5尺*60尺', category: '粉劑、塑膠系列' },
  { code: 'V02-1', name: '南亞桌墊2尺*60尺', category: '粉劑、塑膠系列' },
  { code: 'V03-1', name: '南亞桌墊2.2尺*60尺', category: '粉劑、塑膠系列' },
  { code: 'V05-1', name: '南亞桌墊2.5尺*60尺', category: '粉劑、塑膠系列' },
  { code: 'V06-2', name: '南亞桌墊3尺*60尺', category: '粉劑、塑膠系列' },
  { code: 'V07-1', name: '南亞桌墊3.5尺*60尺', category: '粉劑、塑膠系列' },
  { code: 'V08-1', name: '南亞桌墊4尺*60尺', category: '粉劑、塑膠系列' },
  { code: 'V09-2.1', name: '桌墊整組 1.7', category: '粉劑、塑膠系列' },
  { code: 'V09-2.11', name: '桌墊整組 1.3', category: '粉劑、塑膠系列' },
  { code: 'V10-1.1', name: '透明桌墊 1.3', category: '粉劑、塑膠系列' },
  { code: 'V10.1', name: '透明桌墊 1.7', category: '粉劑、塑膠系列' },
  { code: 'V10-1.2', name: '(圓)透明桌墊 1.7', category: '粉劑、塑膠系列' },
  { code: 'V10-1.22', name: '(圓)透明桌墊 1.3', category: '粉劑、塑膠系列' },
  { code: 'V10.12', name: '(圓)透明桌墊 2.0', category: '粉劑、塑膠系列' },
  { code: 'V12-1.1', name: '綠色發泡', category: '粉劑、塑膠系列' },
  { code: 'V11', name: '綠色發泡1.5尺*120尺', category: '粉劑、塑膠系列' },
  { code: 'V14', name: '綠色發泡2.3尺*120尺', category: '粉劑、塑膠系列' },
  { code: 'V16', name: '綠色發泡3尺*120尺', category: '粉劑、塑膠系列' },
  { code: 'V18', name: '綠色發泡4尺*120尺', category: '粉劑、塑膠系列' },
  { code: 'W0003-7', name: 'MB-11 水性防腐劑', category: '粉劑、塑膠系列' },
  { code: 'V21', name: '南亞透明桌墊1.5*2尺/片', category: '粉劑、塑膠系列' },
  { code: 'V22', name: '南亞透明桌墊2*3尺/片', category: '粉劑、塑膠系列' },
  { code: 'V27', name: '南亞透明桌墊2.2*4尺/片', category: '粉劑、塑膠系列' },
  { code: 'V28-1', name: '南亞透明桌墊3.5*2尺/組', category: '粉劑、塑膠系列' },
  { code: 'W0007-2.21', name: '進口樹脂', category: '粉劑、塑膠系列' },
  { code: 'W0034', name: '週末彩色日曆(文)', category: '粉劑、塑膠系列' },
  { code: 'W0038-1', name: '玻璃纖維絲', category: '粉劑、塑膠系列' },
  { code: 'W0038-2', name: '有機纖維-PP抗裂纖維5mm', category: '粉劑、塑膠系列' },
  { code: 'W1.1', name: '溶劑B 50加侖', category: '粉劑、塑膠系列' },
  { code: 'W4-1', name: '4L-四角塑膠桶(1加侖)', category: '粉劑、塑膠系列' },
];

let customers = [];
let products = [];
let sales = [];
let reps = []; // 業務／區域清單
let trendChartInstance = null;
let analysisChartInstance = null;
let pendingImportRows = []; // 匯入預覽暫存

/* ---------------- IndexedDB 儲存層 ----------------
   取代原本的 localStorage（容量上限約 5-10MB），IndexedDB 容量上限通常是幾百MB到數GB。
   為了不用把全部程式碼都改成 async/await，設計成：讀取（load）用 await 等待完成，
   寫入（save）採「背景寫入、不阻塞畫面」的方式——呼叫端不用改成 await，跟以前用法一樣，
   若背景寫入失敗才會另外跳出錯誤提示。 */
const IDB_NAME = 'cst_tracker_db';
const IDB_VERSION = 1;
const IDB_STORE = 'kv';
let idbInstancePromise = null;

function openIDB() {
  if (idbInstancePromise) return idbInstancePromise;
  idbInstancePromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('此瀏覽器不支援 IndexedDB')); return; }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return idbInstancePromise;
}

function idbGet(key) {
  return openIDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result === undefined ? null : req.result);
    req.onerror = () => reject(req.error);
  }));
}

function idbSet(key, value) {
  return openIDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const req = tx.objectStore(IDB_STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}

function idbDelete(key) {
  return openIDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const req = tx.objectStore(IDB_STORE).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}

/* ---------------- 銷貨資料索引（效能優化：避免每次都重新掃描全部交易紀錄） ----------------
   結構：salesIndex.byCustomer.get(customerId) => {
     records: [該客戶所有銷貨紀錄的參照陣列],
     monthly: Map(monthKey -> { total, byProduct: Map(productId -> 金額) })
   }
   salesIndex.allMonthKeys：全體資料出現過的月份集合（Set）
   只要 sales 陣列有變動（新增/編輯/刪除/匯入/還原備份），saveSales() 就會自動重建這份索引，
   其餘所有查詢（KPI、趨勢、連續月數判斷等）一律改查這份索引，不再重新掃描 sales 陣列。 */
let salesIndex = { byCustomer: new Map(), allMonthKeys: new Set(), monthlyTotal: new Map() };

function rebuildSalesIndex() {
  const byCustomer = new Map();
  const allMonthKeys = new Set();
  const monthlyTotal = new Map(); // 全公司（不分客戶）月度總額，Dashboard 趨勢圖專用
  sales.forEach(s => {
    const k = monthKey(s.year, s.month);
    allMonthKeys.add(k);
    const amt = Number(s.amount || 0);
    const qty = Number(s.quantity || 0);
    monthlyTotal.set(k, (monthlyTotal.get(k) || 0) + amt);
    let entry = byCustomer.get(s.customerId);
    if (!entry) { entry = { records: [], monthly: new Map() }; byCustomer.set(s.customerId, entry); }
    entry.records.push(s);
    let mEntry = entry.monthly.get(k);
    if (!mEntry) { mEntry = { total: 0, totalQty: 0, byProduct: new Map() }; entry.monthly.set(k, mEntry); }
    const pid = s.productId || '';
    mEntry.total += amt;
    mEntry.totalQty += qty;
    mEntry.byProduct.set(pid, (mEntry.byProduct.get(pid) || 0) + amt);
  });
  salesIndex = { byCustomer, allMonthKeys, monthlyTotal };
}

/* ---------------- 基礎工具 ---------------- */

function uid() {
  return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function loadData() {
  try { customers = (await idbGet(STORAGE_KEY_CUSTOMERS)) || []; } catch (e) { customers = []; }
  try { products = (await idbGet(STORAGE_KEY_PRODUCTS)) || []; } catch (e) { products = []; }
  try { sales = (await idbGet(STORAGE_KEY_SALES)) || []; } catch (e) { sales = []; }
  try { reps = (await idbGet(STORAGE_KEY_REPS)) || []; } catch (e) { reps = []; }

  // 若 IndexedDB 裡還沒有資料，檢查瀏覽器裡是不是還留著舊版 localStorage 資料，自動搬過來一次
  if (customers.length === 0 && products.length === 0 && sales.length === 0) {
    let lsCustomers = [], lsProducts = [], lsSales = [], lsReps = [];
    try { lsCustomers = JSON.parse(localStorage.getItem(STORAGE_KEY_CUSTOMERS)) || []; } catch (e) {}
    try { lsProducts = JSON.parse(localStorage.getItem(STORAGE_KEY_PRODUCTS)) || []; } catch (e) {}
    try { lsSales = JSON.parse(localStorage.getItem(STORAGE_KEY_SALES)) || []; } catch (e) {}
    try { lsReps = JSON.parse(localStorage.getItem(STORAGE_KEY_REPS)) || []; } catch (e) {}

    if (lsCustomers.length > 0 || lsProducts.length > 0 || lsSales.length > 0) {
      customers = lsCustomers; products = lsProducts; sales = lsSales; reps = lsReps;
      try {
        await idbSet(STORAGE_KEY_CUSTOMERS, customers);
        await idbSet(STORAGE_KEY_PRODUCTS, products);
        await idbSet(STORAGE_KEY_SALES, sales);
        await idbSet(STORAGE_KEY_REPS, reps);
        // 搬移成功後清掉舊的 localStorage 資料，真正釋放空間
        localStorage.removeItem(STORAGE_KEY_CUSTOMERS);
        localStorage.removeItem(STORAGE_KEY_PRODUCTS);
        localStorage.removeItem(STORAGE_KEY_SALES);
        localStorage.removeItem(STORAGE_KEY_REPS);
        showToastQueued = '已自動將資料搬移到新的儲存方式（IndexedDB），釋放瀏覽器儲存空間，容量上限大幅提升';
      } catch (e) {
        console.error('搬移資料到 IndexedDB 失敗：', e);
      }
    } else {
      // 從更早期的舊版資料自動升級（v1 → v2 格式）
      let legacyCustomers = [];
      let legacySales = [];
      try { legacyCustomers = JSON.parse(localStorage.getItem(LEGACY_KEY_CUSTOMERS)) || []; } catch (e) {}
      try { legacySales = JSON.parse(localStorage.getItem(LEGACY_KEY_SALES)) || []; } catch (e) {}
      if (legacyCustomers.length > 0) {
        customers = legacyCustomers.map(c => ({ id: c.id, code: '', name: c.name, mergeToId: '', repId: '', category: c.category || '', contact: c.contact || '', phone: c.phone || '', note: c.note || '' }));
        sales = legacySales.map(s => ({ id: s.id, customerId: s.customerId, productId: '', year: s.year, month: s.month, date: '', quantity: null, unitPrice: null, amount: s.amount, note: s.note || '' }));
        saveCustomers();
        saveSales();
        showToastQueued = '已自動將舊版資料升級至新版格式';
      }
    }
  }
  rebuildMergeIndex();
  rebuildSalesIndex();
}

let showToastQueued = null;

function handleSaveError(label, err) {
  console.error(label + ' 儲存失敗：', err);
  showToast(label + ' 儲存失敗：' + (err && err.message ? err.message : '請按 F12 查看主控台錯誤訊息'));
}

function saveCustomers() {
  idbSet(STORAGE_KEY_CUSTOMERS, customers).catch(err => handleSaveError('客戶資料', err));
  rebuildMergeIndex();
}
function saveProducts() {
  idbSet(STORAGE_KEY_PRODUCTS, products).catch(err => handleSaveError('產品資料', err));
}
let salesDataVersion = 0; // 每次銷貨資料異動就+1，讓「每月銷貨資料」頁面知道排序結果快取還能不能用

function saveSales() {
  idbSet(STORAGE_KEY_SALES, sales).catch(err => handleSaveError('銷貨資料', err));
  rebuildSalesIndex();
  salesDataVersion++;
}
function saveReps() {
  idbSet(STORAGE_KEY_REPS, reps).catch(err => handleSaveError('業務資料', err));
}

function repName(id) {
  if (!id) return '未指定';
  const r = reps.find(r => r.id === id);
  return r ? r.name : '（已刪除）';
}

function fmtMoney(n) {
  n = Math.round(n || 0);
  return n.toLocaleString('zh-Hant-TW');
}

function fmtPct(p) {
  if (p === null || p === undefined || !isFinite(p)) return '—';
  const s = (p * 100).toFixed(1);
  return (p > 0 ? '+' : '') + s + '%';
}

function monthKey(y, m) { return y * 100 + m; }

function prevMonth(y, m) {
  return m === 1 ? { y: y - 1, m: 12 } : { y: y, m: m - 1 };
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('is-active');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove('is-active'), 2200);
}

function customerName(id) {
  const c = customers.find(c => c.id === id);
  return c ? c.name : '（已刪除客戶）';
}
function customerLabel(id) {
  const c = customers.find(c => c.id === id);
  if (!c) return '（已刪除客戶）';
  return c.code ? `${c.code}・${c.name}` : c.name;
}

/* ---------------- 客戶合併（僅依客戶編號自動判斷，不比對名稱） ---------------- */

/* 將編號結尾的 -1 / -2 等序號去掉，取得「基礎編號」，例如 B014-1 -> B014 */
function getBaseCode(code) {
  if (!code) return '';
  const m = String(code).trim().match(/^(.+)-\d+$/);
  return m ? m[1] : String(code).trim();
}

/* 若此客戶的編號有 -N 後綴、且系統中存在編號完全等於「基礎編號」的客戶，回傳那個客戶的 id */
function findAutoMergeTargetId(customer) {
  if (!customer || !customer.code) return null;
  const base = getBaseCode(customer.code);
  if (!base || base === customer.code) return null;
  const baseCustomer = customers.find(c => c.id !== customer.id && c.code === base);
  return baseCustomer ? baseCustomer.id : null;
}

/* ---------------- 客戶合併索引（效能優化：避免每次都重新掃描全部客戶去解析合併關係） ----------------
   getRootId / getMergedMemberIds 在資料量大時被呼叫的次數非常多（Dashboard 每算一位客戶的狀態就會呼叫好幾次），
   若每次都重新掃描全部客戶去解析合併鏈，會是 O(客戶數²) 等級的效能陷阱。
   改成：客戶資料異動時（saveCustomers）才重新解析一次，其餘時間一律查表。 */
let mergeIndex = { rootOf: new Map(), membersOf: new Map() };

function rebuildMergeIndex() {
  const rootOf = new Map();
  const byId = new Map(customers.map(c => [c.id, c]));
  const byCode = new Map(customers.filter(c => c.code).map(c => [c.code, c]));

  customers.forEach(c => {
    let cur = c.id, depth = 0;
    while (depth < 6) {
      const cc = byId.get(cur);
      if (!cc) break;
      if (cc.mergeToId) { cur = cc.mergeToId; depth++; continue; }
      if (cc.code) {
        const base = getBaseCode(cc.code);
        if (base && base !== cc.code) {
          const baseCustomer = byCode.get(base);
          if (baseCustomer && baseCustomer.id !== cur) { cur = baseCustomer.id; depth++; continue; }
        }
      }
      break;
    }
    rootOf.set(c.id, cur);
  });

  const membersOf = new Map();
  rootOf.forEach((root, id) => {
    if (!membersOf.has(root)) membersOf.set(root, []);
    membersOf.get(root).push(id);
  });
  mergeIndex = { rootOf, membersOf };
}

/* 找到最終的主帳號 id：優先看手動指定的合併對象，其次自動依編號判斷（查表版本，O(1)） */
function getRootId(id) {
  return mergeIndex.rootOf.has(id) ? mergeIndex.rootOf.get(id) : id;
}
function isRootCustomer(id) { return getRootId(id) === id; }

/* 取得某個主帳號底下所有成員 id（含自己）（查表版本，O(1)） */
function getMergedMemberIds(rootId) {
  return mergeIndex.membersOf.get(rootId) || [rootId];
}
function getRootCustomers() {
  return customers.filter(c => isRootCustomer(c.id));
}
function salesForMergedCustomer(customerId) {
  const root = getRootId(customerId);
  const members = getMergedMemberIds(root);
  let records = [];
  members.forEach(id => {
    const entry = salesIndex.byCustomer.get(id);
    if (entry) records = records.concat(entry.records);
  });
  return records;
}
function mergedCustomerLabel(customerId) {
  const rootId = getRootId(customerId);
  const root = customers.find(c => c.id === rootId);
  if (!root) return '（已刪除客戶）';
  const members = getMergedMemberIds(rootId).map(id => customers.find(c => c.id === id)).filter(Boolean);
  const codes = members.map(m => m.code).filter(Boolean);
  return codes.length ? `${codes.join(' / ')}・${root.name}` : root.name;
}
function productName(id) {
  if (!id) return '未分類';
  const p = products.find(p => p.id === id);
  return p ? p.name : '（已刪除產品）';
}
function productLabel(id) {
  if (!id) return '未分類';
  const p = products.find(p => p.id === id);
  if (!p) return '（已刪除產品）';
  return p.code ? `${p.name}（${p.code}）` : p.name;
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}

/* 把顏色與白色混合，算出一個「不透明」的淡色（而不是用透明度），
   否則表頭若用半透明底色，往下捲動時，捲過去的內容會透出來疊在表頭上面 */
function tintColorOpaque(hex, ratio) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c) => Math.round(c * ratio + 255 * (1 - ratio));
  const toHex = (v) => v.toString(16).padStart(2, '0');
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

/* ---------------- 銷貨資料查詢（改查索引，避免每次都重新掃描全部交易紀錄） ---------------- */

function salesForCustomerMonth(customerId, y, m) {
  const entry = salesIndex.byCustomer.get(customerId);
  if (!entry) return [];
  return entry.records.filter(s => s.year === y && s.month === m);
}
function sumFor(customerId, y, m) {
  const entry = salesIndex.byCustomer.get(customerId);
  if (!entry) return 0;
  const mEntry = entry.monthly.get(monthKey(y, m));
  return mEntry ? mEntry.total : 0;
}
function sumQtyFor(customerId, y, m) {
  const entry = salesIndex.byCustomer.get(customerId);
  if (!entry) return 0;
  const mEntry = entry.monthly.get(monthKey(y, m));
  return mEntry ? mEntry.totalQty : 0;
}
function sumForProduct(customerId, productId, y, m) {
  const entry = salesIndex.byCustomer.get(customerId);
  if (!entry) return 0;
  const mEntry = entry.monthly.get(monthKey(y, m));
  if (!mEntry) return 0;
  return mEntry.byProduct.get(productId || '') || 0;
}
function hasAnySaleBefore(customerId, y, m) {
  const entry = salesIndex.byCustomer.get(customerId);
  if (!entry) return false;
  const k = monthKey(y, m);
  for (const mk of entry.monthly.keys()) { if (mk < k) return true; }
  return false;
}
function hasAnyProductSaleBefore(customerId, productId, y, m) {
  const entry = salesIndex.byCustomer.get(customerId);
  if (!entry) return false;
  const k = monthKey(y, m);
  const pid = productId || '';
  for (const [mk, mEntry] of entry.monthly) {
    if (mk < k && (mEntry.byProduct.get(pid) || 0) > 0) return true;
  }
  return false;
}

/* 合併加總版本：會把已設定「合併計算於」的子帳號銷貨一併算入（member數量很小，逐一查索引即可） */
function sumForMerged(customerId, y, m) {
  const members = getMergedMemberIds(getRootId(customerId));
  let total = 0;
  members.forEach(id => { total += sumFor(id, y, m); });
  return total;
}
function sumQtyForMerged(customerId, y, m) {
  const members = getMergedMemberIds(getRootId(customerId));
  let total = 0;
  members.forEach(id => { total += sumQtyFor(id, y, m); });
  return total;
}
function hasAnySaleBeforeMerged(customerId, y, m) {
  const members = getMergedMemberIds(getRootId(customerId));
  return members.some(id => hasAnySaleBefore(id, y, m));
}
function sumForProductMerged(customerId, productId, y, m) {
  const members = getMergedMemberIds(getRootId(customerId));
  let total = 0;
  members.forEach(id => { total += sumForProduct(id, productId, y, m); });
  return total;
}
function hasAnyProductSaleBeforeMerged(customerId, productId, y, m) {
  const members = getMergedMemberIds(getRootId(customerId));
  return members.some(id => hasAnyProductSaleBefore(id, productId, y, m));
}

/* 依產品的數量彙總（金額已有 sumForProduct／sumForProductMerged，這裡補上數量版本，
   供「歷年趨勢比較」單一客戶深入模式的「數量」指標使用）。
   productId 數量沒有另外建索引，直接掃該客戶自己的交易紀錄（筆數受限於單一客戶，不會太多，效能無虞）。 */
function sumProductQtyFor(customerId, productId, y, m) {
  const entry = salesIndex.byCustomer.get(customerId);
  if (!entry) return 0;
  const pid = productId || '';
  let total = 0;
  entry.records.forEach(s => {
    if (s.year === y && s.month === m && (s.productId || '') === pid) total += Number(s.quantity) || 0;
  });
  return total;
}
function sumProductQtyForMerged(customerId, productId, y, m) {
  const members = getMergedMemberIds(getRootId(customerId));
  let total = 0;
  members.forEach(id => { total += sumProductQtyFor(id, productId, y, m); });
  return total;
}

function allMonthsInData() {
  const set = new Set(salesIndex.allMonthKeys);
  const now = new Date();
  set.add(monthKey(now.getFullYear(), now.getMonth() + 1));
  const arr = Array.from(set).map(k => ({ y: Math.floor(k / 100), m: k % 100, k }));
  arr.sort((a, b) => b.k - a.k);
  return arr;
}
function getLatestDataMonth() {
  if (salesIndex.allMonthKeys.size === 0) { const now = new Date(); return { y: now.getFullYear(), m: now.getMonth() + 1 }; }
  const maxKey = Math.max(...salesIndex.allMonthKeys);
  return { y: Math.floor(maxKey / 100), m: maxKey % 100 };
}
function getEarliestDataMonth() {
  if (salesIndex.allMonthKeys.size === 0) { const now = new Date(); return { y: now.getFullYear(), m: now.getMonth() + 1 }; }
  const minKey = Math.min(...salesIndex.allMonthKeys);
  return { y: Math.floor(minKey / 100), m: minKey % 100 };
}
/* 業務分組清單（依客戶數量由多到少），供「歷年趨勢比較」的依業務模式使用；
   只計算「主帳號」客戶，避免被合併的子帳號拆開計算。分組鍵值用 repId，沒有指派業務的客戶歸在 UNASSIGNED_REGION。 */
function getAllCustomerRepGroups() {
  const counter = new Map();
  getRootCustomers().forEach(c => {
    const key = c.repId || UNASSIGNED_REGION;
    counter.set(key, (counter.get(key) || 0) + 1);
  });
  return Array.from(counter.entries()).sort((a, b) => b[1] - a[1]).map(e => e[0]);
}
function repGroupLabel(key) {
  return key === UNASSIGNED_REGION ? '未指定業務' : repName(key);
}
function customerRepGroupKey(c) {
  return c.repId || UNASSIGNED_REGION;
}
/* 客戶分類清單（依品項數量由多到少），供「依客戶」瀏覽模式頂部的選填篩選列使用（不同於上面的業務分組，
   這裡用的是客戶管理裡的「分類」欄位，只有多位客戶填了不同分類時才會顯示這個篩選列）。
   只計算「主帳號」客戶，避免被合併的子帳號分類（通常是空的）干擾統計 */
function getAllCustomerCategories() {
  const counter = new Map();
  getRootCustomers().forEach(c => {
    const cat = c.category || '未分類';
    counter.set(cat, (counter.get(cat) || 0) + 1);
  });
  return Array.from(counter.entries()).sort((a, b) => b[1] - a[1]).map(e => e[0]);
}
function monthsForCustomer(customerId) {
  const set = new Set(salesForMergedCustomer(customerId).map(s => monthKey(s.year, s.month)));
  const now = new Date();
  set.add(monthKey(now.getFullYear(), now.getMonth() + 1));
  const arr = Array.from(set).map(k => ({ y: Math.floor(k / 100), m: k % 100, k }));
  arr.sort((a, b) => b.k - a.k);
  return arr;
}

function last12Months(refY, refM) {
  const list = [];
  let y = refY, m = refM;
  for (let i = 0; i < 12; i++) {
    list.unshift({ y, m });
    const p = prevMonth(y, m);
    y = p.y; m = p.m;
  }
  return list;
}

/* 產生 fromY/fromM 到 toY/toM 之間（含首尾）所有月份的陣列 */
function monthsInRange(fromY, fromM, toY, toM) {
  if (monthKey(fromY, fromM) > monthKey(toY, toM)) { [fromY, fromM, toY, toM] = [toY, toM, fromY, fromM]; }
  const list = [];
  let y = fromY, m = fromM;
  let guard = 0;
  while (monthKey(y, m) <= monthKey(toY, toM) && guard < 240) {
    list.push({ y, m });
    m++; if (m > 12) { m = 1; y++; }
    guard++;
  }
  return list;
}

/* 計算比較基準的數值與「是否曾有更早的交易」判斷式：
   mode='yoy' 比對去年同月；mode='custom' 比對自訂區間的月平均；預設比對上個月 */
function getComparisonValue(customerId, y, m, mode, customRange) {
  if (mode === 'yoy') {
    const cy = y - 1;
    return {
      previous: sumForMerged(customerId, cy, m),
      hadEarlierFn: () => hasAnySaleBeforeMerged(customerId, cy, m) || hasAnySaleBeforeMerged(customerId, y, m)
    };
  }
  if (mode === 'custom' && customRange) {
    const months = monthsInRange(customRange.fromY, customRange.fromM, customRange.toY, customRange.toM);
    const sum = months.reduce((a, mo) => a + sumForMerged(customerId, mo.y, mo.m), 0);
    const avg = months.length ? sum / months.length : 0;
    const earliest = months[0] || { y, m };
    return {
      previous: avg,
      hadEarlierFn: () => months.some(mo => sumForMerged(customerId, mo.y, mo.m) > 0) || hasAnySaleBeforeMerged(customerId, earliest.y, earliest.m)
    };
  }
  const prev = prevMonth(y, m);
  return {
    previous: sumForMerged(customerId, prev.y, prev.m),
    hadEarlierFn: () => hasAnySaleBeforeMerged(customerId, prev.y, prev.m) || hasAnySaleBeforeMerged(customerId, y, m)
  };
}

function getCompareLabel(mode, customRange) {
  if (mode === 'yoy') return '去年同月';
  if (mode === 'custom' && customRange) return `${customRange.fromY}/${customRange.fromM}~${customRange.toY}/${customRange.toM}月均`;
  return '上月';
}

/* 計算某客戶連續成長／連續下滑幾個月（一律以「逐月比較」為準，不受頂端比較基準切換影響） */
function computeMomStreak(customerId, y, m, direction) {
  let streak = 0, cy = y, cm = m;
  while (streak < 24) {
    const cur = sumForMerged(customerId, cy, cm);
    const prev = prevMonth(cy, cm);
    const prevAmt = sumForMerged(customerId, prev.y, prev.m);
    if (cur <= 0 || prevAmt <= 0) break;
    const delta = (cur - prevAmt) / prevAmt;
    if (direction === 'growth' && delta >= GROWTH_THRESHOLD) { streak++; cy = prev.y; cm = prev.m; continue; }
    if (direction === 'decline' && delta <= DECLINE_THRESHOLD) { streak++; cy = prev.y; cm = prev.m; continue; }
    break;
  }
  return streak;
}

/* 近 12 個月累積營收（用於高價值客戶排名） */
function getTrailing12MonthRevenue(customerId, y, m) {
  return last12Months(y, m).reduce((a, mo) => a + sumForMerged(customerId, mo.y, mo.m), 0);
}

/* 找出某客戶在比較期間內，金額變動最大的單一產品 */
function getTopProductDelta(customerId, y, m, mode, customRange) {
  const memberIds = getMergedMemberIds(getRootId(customerId));

  const sumByProductForMonth = (targetY, targetM) => {
    const acc = {};
    memberIds.forEach(id => {
      const entry = salesIndex.byCustomer.get(id);
      const mEntry = entry && entry.monthly.get(monthKey(targetY, targetM));
      if (mEntry) mEntry.byProduct.forEach((amt, pid) => { acc[pid] = (acc[pid] || 0) + amt; });
    });
    return acc;
  };

  const currentByProduct = sumByProductForMonth(y, m);

  let baselineByProduct = {};
  if (mode === 'yoy') {
    baselineByProduct = sumByProductForMonth(y - 1, m);
  } else if (mode === 'custom' && customRange) {
    const months = monthsInRange(customRange.fromY, customRange.fromM, customRange.toY, customRange.toM);
    const raw = {};
    months.forEach(mo => {
      const acc = sumByProductForMonth(mo.y, mo.m);
      Object.keys(acc).forEach(key => { raw[key] = (raw[key] || 0) + acc[key]; });
    });
    const n = months.length || 1;
    Object.keys(raw).forEach(key => { baselineByProduct[key] = raw[key] / n; });
  } else {
    const prev = prevMonth(y, m);
    baselineByProduct = sumByProductForMonth(prev.y, prev.m);
  }

  const keys = new Set([...Object.keys(currentByProduct), ...Object.keys(baselineByProduct)]);
  let best = null;
  keys.forEach(key => {
    const delta = (currentByProduct[key] || 0) - (baselineByProduct[key] || 0);
    if (!best || Math.abs(delta) > Math.abs(best.delta)) best = { productId: key, delta };
  });
  return best;
}

/* 計算某客戶在 (y,m) 的狀態，與比較基準比較（跨所有產品、跨合併子帳號加總） */
function computeStatus(customerId, y, m, mode, customRange) {
  const current = sumForMerged(customerId, y, m);
  const cmp = getComparisonValue(customerId, y, m, mode, customRange);
  return computeStatusFromValues(current, cmp.previous, cmp.hadEarlierFn);
}

/* 計算某客戶+某產品在 (y,m) 的狀態（跨合併子帳號加總） */
function computeProductStatus(customerId, productId, y, m, mode, customRange) {
  const current = sumForProductMerged(customerId, productId, y, m);
  const prevBasis = mode === 'yoy' ? { y: y - 1, m } : (mode === 'custom' && customRange ? null : prevMonth(y, m));
  let previous, hadEarlierFn;
  if (mode === 'custom' && customRange) {
    const months = monthsInRange(customRange.fromY, customRange.fromM, customRange.toY, customRange.toM);
    const sum = months.reduce((a, mo) => a + sumForProductMerged(customerId, productId, mo.y, mo.m), 0);
    previous = months.length ? sum / months.length : 0;
    const earliest = months[0] || { y, m };
    hadEarlierFn = () => months.some(mo => sumForProductMerged(customerId, productId, mo.y, mo.m) > 0) || hasAnyProductSaleBeforeMerged(customerId, productId, earliest.y, earliest.m);
  } else {
    previous = sumForProductMerged(customerId, productId, prevBasis.y, prevBasis.m);
    hadEarlierFn = () => hasAnyProductSaleBeforeMerged(customerId, productId, prevBasis.y, prevBasis.m) || hasAnyProductSaleBeforeMerged(customerId, productId, y, m);
  }
  return computeStatusFromValues(current, previous, hadEarlierFn);
}

function computeStatusFromValues(current, previous, hadEarlierFn) {
  if (current > 0 && previous > 0) {
    const delta = (current - previous) / previous;
    let status = 'stable';
    if (delta >= GROWTH_THRESHOLD) status = 'growth';
    else if (delta <= DECLINE_THRESHOLD) status = 'decline';
    return { status, current, previous, delta };
  }
  if (current > 0 && previous === 0) {
    const hadEarlier = hadEarlierFn();
    return { status: hadEarlier ? 'growth' : 'new', current, previous, delta: null };
  }
  if (current === 0 && previous > 0) {
    return { status: 'stopped', current, previous, delta: -1 };
  }
  return { status: 'no-data', current, previous, delta: null };
}

const STATUS_LABEL = {
  growth: '成長', decline: '下滑', stopped: '停購',
  stable: '持平', new: '新客戶', 'no-data': '尚無資料'
};
const STATUS_LABEL_PRODUCT = {
  growth: '成長', decline: '下滑', stopped: '停購',
  stable: '持平', new: '新品', 'no-data': '尚無資料'
};

/* ---------------- 導覽切換 ---------------- */

let pageScrollPositions = {}; // 記住每個頁面「上次離開時」的捲動位置，key是頁面名稱（例如 'dashboard'）

function getCurrentActivePageKey() {
  const activePage = document.querySelector('.page.is-active');
  return activePage ? activePage.id.replace('page-', '') : null;
}

function initNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      // 手機版點了任一導覽項目後自動收合選單（桌面版沒有 is-open 這個狀態，不受影響）
      document.querySelector('.sidebar').classList.remove('is-open');
      document.getElementById('mobileNavBackdrop').classList.remove('is-active');
      // 離開目前頁面前，先記住捲動到哪裡，下次回來這一頁時才能還原
      const leavingKey = getCurrentActivePageKey();
      if (leavingKey) pageScrollPositions[leavingKey] = window.scrollY;

      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('is-active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('is-active'));
      btn.classList.add('is-active');
      document.getElementById('page-' + btn.dataset.page).classList.add('is-active');
      if (btn.dataset.page === 'dashboard') renderDashboard();
      if (btn.dataset.page === 'customers') renderCustomerPage();
      if (btn.dataset.page === 'products') renderProductPage();
      if (btn.dataset.page === 'reps') renderRepsPage();
      if (btn.dataset.page === 'import') populateRepOptions(document.getElementById('importRepSelect'), true, '（不指定）');
      if (btn.dataset.page === 'sales') renderSalesPage();
      if (btn.dataset.page === 'analysis') renderAnalysisPage();
      if (btn.dataset.page === 'trends') renderTrendsPage();
      // 還原這個頁面上次離開時的捲動位置；第一次進入（沒有紀錄過）就停在最上方
      window.scrollTo(0, pageScrollPositions[btn.dataset.page] || 0);
    });
  });
}

/* =========================================================
   1. Dashboard
   ========================================================= */

let dashSelectedYear = null;
let dashSelectedMonth = null;

function populateDashMonthSelectors() {
  const months = allMonthsInData(); // 已由新到舊排序
  const years = Array.from(new Set(months.map(mo => mo.y))).sort((a, b) => b - a);

  if (dashSelectedYear === null || !years.includes(dashSelectedYear)) {
    const now = new Date();
    dashSelectedYear = months.length ? months[0].y : now.getFullYear();
    dashSelectedMonth = months.length ? months[0].m : now.getMonth() + 1;
  }

  const yearSel = document.getElementById('dashYearSelect');
  const monthSel = document.getElementById('dashMonthSelect');
  yearSel.innerHTML = years.map(y => `<option value="${y}" ${y === dashSelectedYear ? 'selected' : ''}>${y} 年</option>`).join('');
  monthSel.innerHTML = Array.from({ length: 12 }, (_, i) => i + 1)
    .map(mo => `<option value="${mo}" ${mo === dashSelectedMonth ? 'selected' : ''}>${mo} 月</option>`).join('');
}

function getSelectedDashMonth() {
  return { y: dashSelectedYear, m: dashSelectedMonth };
}

function goToDashMonth(y, m) {
  dashSelectedYear = y;
  dashSelectedMonth = m;
  renderDashboard();
}

let dashboardCompareMode = 'mom'; // 'mom' 上月 | 'yoy' 去年同月

function fmtPctAbs(p) {
  if (p === null || p === undefined || !isFinite(p)) return '—';
  return (p * 100).toFixed(1) + '%';
}

function renderDashboard() {
  populateDashMonthSelectors();
  const { y, m } = getSelectedDashMonth();
  const cmpLabel = getCompareLabel(dashboardCompareMode);

  populateRepFilterOptions(document.getElementById('dashRegionFilter'), '全部（總覽）');
  const regionFilter = document.getElementById('dashRegionFilter').value;
  const rootCustomers = getRootCustomers().filter(c => matchesRegionFilter(c, regionFilter));
  const rows = rootCustomers.map(c => ({ c, st: computeStatus(c.id, y, m, dashboardCompareMode) }));

  const totalThisMonth = rows.reduce((a, r) => a + r.st.current, 0);

  // 總覽用：不論頂端選什麼比較基準，「本月總銷貨」固定同時顯示上月與去年同月
  const momPrev = prevMonth(y, m);
  const totalMomPrev = rootCustomers.reduce((a, c) => a + sumForMerged(c.id, momPrev.y, momPrev.m), 0);
  const totalYoyPrev = rootCustomers.reduce((a, c) => a + sumForMerged(c.id, y - 1, m), 0);
  const momDelta = totalMomPrev > 0 ? (totalThisMonth - totalMomPrev) / totalMomPrev : null;
  const yoyDelta = totalYoyPrev > 0 ? (totalThisMonth - totalYoyPrev) / totalYoyPrev : null;
  const momDeltaAmount = totalThisMonth - totalMomPrev;

  const orderingCount = rows.filter(r => r.st.current > 0).length;
  const momOrderingCount = rootCustomers.filter(c => sumForMerged(c.id, momPrev.y, momPrev.m) > 0).length;
  const yoyOrderingCount = rootCustomers.filter(c => sumForMerged(c.id, y - 1, m) > 0).length;
  const orderingDeltaCount = orderingCount - momOrderingCount;

  const growthRows = rows.filter(r => r.st.status === 'growth');
  const declineRows = rows.filter(r => r.st.status === 'decline');
  const stoppedRows = rows.filter(r => r.st.status === 'stopped');

  const growthStreakCount = rootCustomers.filter(c => computeMomStreak(c.id, y, m, 'growth') >= 3).length;
  const growthRevenue = growthRows.reduce((a, r) => a + (r.st.current - r.st.previous), 0);
  const declineRevenue = declineRows.reduce((a, r) => a + (r.st.previous - r.st.current), 0);
  const declineImpactPct = totalThisMonth > 0 ? declineRevenue / totalThisMonth : null;
  const stoppedPrevRevenue = stoppedRows.reduce((a, r) => a + r.st.previous, 0);

  // 高價值客戶：依近12個月累積營收排名前20%
  const trailing12Map = new Map();
  rootCustomers.forEach(c => trailing12Map.set(c.id, getTrailing12MonthRevenue(c.id, y, m)));
  const sortedByTrailing = rootCustomers.slice().sort((a, b) => trailing12Map.get(b.id) - trailing12Map.get(a.id));
  const highValueCount = rootCustomers.length ? Math.max(1, Math.ceil(sortedByTrailing.length * 0.2)) : 0;
  const highValueIds = new Set(sortedByTrailing.slice(0, highValueCount).map(c => c.id));
  const highValueStoppedCount = stoppedRows.filter(r => highValueIds.has(r.c.id)).length;

  document.getElementById('kpiGrid').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">本月總銷貨</div>
      <div class="kpi-value">$${fmtMoney(totalThisMonth)}</div>
      <div class="kpi-sub-row">
        <span class="kpi-tag ${momDelta === null ? '' : (momDelta >= 0 ? 'good' : 'bad')}">較上月 ${momDelta === null ? '—' : fmtPct(momDelta)}</span>
        <span class="kpi-tag ${yoyDelta === null ? '' : (yoyDelta >= 0 ? 'good' : 'bad')}">較去年同月 ${yoyDelta === null ? '—' : fmtPct(yoyDelta)}</span>
      </div>
      <div class="kpi-delta">${momDeltaAmount >= 0 ? '增加' : '減少'} $${fmtMoney(Math.abs(momDeltaAmount))}（較上月）</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">本月下單客戶數</div>
      <div class="kpi-value">${orderingCount} <span style="font-size:14px;color:var(--muted)">/ ${rootCustomers.length}</span></div>
      <div class="kpi-delta">較上月 ${orderingDeltaCount >= 0 ? '+' : ''}${orderingDeltaCount} 家</div>
      <div class="kpi-delta">去年同月下單 ${yoyOrderingCount} 家</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">成長客戶（較${cmpLabel}）</div>
      <div class="kpi-value good">${growthRows.length}</div>
      <div class="kpi-delta">連續 3 個月成長 ${growthStreakCount} 家</div>
      <div class="kpi-delta">成長營收 +$${fmtMoney(growthRevenue)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">下滑客戶（較${cmpLabel}）</div>
      <div class="kpi-value bad">${declineRows.length}</div>
      <div class="kpi-delta">減少營收 -$${fmtMoney(declineRevenue)}</div>
      <div class="kpi-delta">影響總營收 ${fmtPctAbs(declineImpactPct)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">停購客戶（較${cmpLabel}）</div>
      <div class="kpi-value warn">${stoppedRows.length}</div>
      <div class="kpi-delta">${cmpLabel}營收 $${fmtMoney(stoppedPrevRevenue)}</div>
      <div class="kpi-delta">高價值停購 ${highValueStoppedCount} 家</div>
    </div>
  `;

  renderTrendChart(y, m, rootCustomers);
  renderMoversSection(rows, y, m, dashboardCompareMode);
  renderAlertList(rows, y, m, cmpLabel, highValueIds);
  renderPulseTable(rows, cmpLabel);

  document.getElementById('dashYearSelect').onchange = (e) => goToDashMonth(Number(e.target.value), dashSelectedMonth);
  document.getElementById('dashMonthSelect').onchange = (e) => goToDashMonth(dashSelectedYear, Number(e.target.value));
  document.getElementById('dashMonthPrev').onclick = () => { const p = prevMonth(dashSelectedYear, dashSelectedMonth); goToDashMonth(p.y, p.m); };
  document.getElementById('dashMonthNext').onclick = () => { const n = dashSelectedMonth === 12 ? { y: dashSelectedYear + 1, m: 1 } : { y: dashSelectedYear, m: dashSelectedMonth + 1 }; goToDashMonth(n.y, n.m); };
  document.getElementById('dashRegionFilter').onchange = renderDashboard;
  document.getElementById('dashJumpLatest').onclick = () => {
    const months = allMonthsInData();
    if (months.length) goToDashMonth(months[0].y, months[0].m);
  };
  document.getElementById('pulseSearch').oninput = () => renderPulseTable(rows, cmpLabel);
  document.getElementById('pulseStatusFilter').onchange = () => renderPulseTable(rows, cmpLabel);
  document.getElementById('pulseSort').onchange = () => renderPulseTable(rows, cmpLabel);
  document.getElementById('alertTagFilter').onchange = () => renderAlertList(rows, y, m, cmpLabel, highValueIds);

  document.querySelectorAll('#dashCompareToggle .segmented-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.mode === dashboardCompareMode);
    btn.onclick = () => {
      if (dashboardCompareMode === btn.dataset.mode) return;
      dashboardCompareMode = btn.dataset.mode;
      renderDashboard();
    };
  });
}

/* 中文姓名筆畫排序（瀏覽器不支援時自動退回一般排序） */
let strokeCollator = null;
try { strokeCollator = new Intl.Collator('zh-Hant-TW-u-co-stroke'); } catch (e) { strokeCollator = null; }
function strokeCompare(a, b) {
  if (strokeCollator) return strokeCollator.compare(a || '', b || '');
  return (a || '').localeCompare(b || '', 'zh-Hant');
}

/* 客戶編號欄位顯示：若有合併子帳號，附加徽章顯示還包含哪些編號 */
function pulseCodeCell(rootId) {
  const root = customers.find(c => c.id === rootId);
  if (!root) return '—';
  const memberCodes = getMergedMemberIds(rootId)
    .filter(id => id !== rootId)
    .map(id => customers.find(c => c.id === id))
    .filter(Boolean)
    .map(c => c.code || c.name);
  const mainCode = escapeHtml(root.code || '—');
  if (memberCodes.length === 0) return mainCode;
  return `${mainCode} <span class="merge-badge" title="已合併：${escapeHtml(memberCodes.join('、'))}">+${memberCodes.length}</span>`;
}

function renderTrendChart(y, m, rootCustomers) {
  const months = last12Months(y, m);
  const labels = months.map(mo => `${mo.y}/${mo.m}`);
  // 依「檢視區域」篩選後的客戶清單加總，而不是固定用全公司月度總額索引，
  // 這樣選了某個業務時，這張圖才會只反映那個業務底下客戶的走勢
  const sumForCustomers = (yy, mm) => rootCustomers.reduce((a, c) => a + sumForMerged(c.id, yy, mm), 0);
  const data = months.map(mo => sumForCustomers(mo.y, mo.m));
  const dataLastYear = months.map(mo => sumForCustomers(mo.y - 1, mo.m));
  const hasLastYear = dataLastYear.some(v => v > 0);

  const datasets = [{ label: '本期銷貨金額', data, borderColor: '#2F6FED', backgroundColor: 'rgba(47,111,237,0.08)', borderWidth: 2, pointRadius: 3, pointHoverRadius: 6, pointBackgroundColor: '#2F6FED', fill: true, tension: 0.25 }];
  if (hasLastYear) {
    datasets.push({ label: '去年同期', data: dataLastYear, borderColor: '#B7C2CE', backgroundColor: 'transparent', borderWidth: 2, borderDash: [5, 4], pointRadius: 2, pointHoverRadius: 6, pointBackgroundColor: '#B7C2CE', fill: false, tension: 0.25 });
  }

  const ctx = document.getElementById('trendChart');
  if (trendChartInstance) trendChartInstance.destroy();
  trendChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: hasLastYear, position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: {
          mode: 'index', intersect: false,
          callbacks: {
            title: function (items) {
              if (!items.length) return '';
              // 兩條線共用同一個 x 軸位置，標題統一用「本期」那個月份代表這個位置，各線實際年份在下面 label 各自標明
              const mo = months[items[0].dataIndex];
              return `${mo.y}/${mo.m}`;
            },
            label: function (item) {
              const mo = months[item.dataIndex];
              const actualLabel = item.datasetIndex === 1 ? `${mo.y - 1}/${mo.m}` : `${mo.y}/${mo.m}`;
              return `${item.dataset.label}（${actualLabel}）：$${fmtMoney(item.parsed.y)}`;
            }
          }
        }
      },
      scales: { y: { beginAtZero: true, ticks: { callback: v => '$' + (v / 1000) + 'k' } }, x: { grid: { display: false } } }
    }
  });
}

/* 營收變動來源 Top 10（增加 / 減少） */
function renderMoversSection(rows, y, m, mode, customRange) {
  const withDelta = rows.map(r => ({
    c: r.c,
    current: r.st.current,
    previous: r.st.previous,
    deltaAmount: r.st.current - r.st.previous,
    deltaPct: r.st.previous > 0 ? (r.st.current - r.st.previous) / r.st.previous : null
  }));
  const increases = withDelta.filter(r => r.deltaAmount > 0).sort((a, b) => b.deltaAmount - a.deltaAmount).slice(0, 10);
  const decreases = withDelta.filter(r => r.deltaAmount < 0).sort((a, b) => a.deltaAmount - b.deltaAmount).slice(0, 10);

  const buildList = (list, isIncrease) => {
    if (list.length === 0) return `<div class="empty-mini">本期沒有明顯${isIncrease ? '成長' : '下滑'}來源</div>`;
    return list.map(r => {
      const prod = getTopProductDelta(r.c.id, y, m, mode, customRange);
      const prodText = prod ? productName(prod.productId) : '—';
      return `<div class="mover-item ${isIncrease ? 'good' : 'bad'}">
        <div>
          <div class="alert-name">${escapeHtml(r.c.name)}</div>
          <div class="alert-meta">主要來自 ${escapeHtml(prodText)}</div>
        </div>
        <div style="text-align:right">
          <div class="mover-amount">${r.deltaAmount >= 0 ? '+' : '-'}$${fmtMoney(Math.abs(r.deltaAmount))}</div>
          <div class="alert-meta">${r.deltaPct === null ? '—' : fmtPct(r.deltaPct)}</div>
        </div>
      </div>`;
    }).join('');
  };

  document.getElementById('moversIncreaseTitle').textContent = `本月營收增加來源 Top ${Math.min(10, increases.length)}`;
  document.getElementById('moversDecreaseTitle').textContent = `本月營收減少來源 Top ${Math.min(10, decreases.length)}`;
  document.getElementById('moversIncreaseList').innerHTML = buildList(increases, true);
  document.getElementById('moversDecreaseList').innerHTML = buildList(decreases, false);
}

const WATCH_TAG_LABEL = { severeDecline: '大幅下滑', stopped: '停購', consecutiveDecline: '連續下滑', highValueAnomaly: '高價值異常' };

function renderAlertList(rows, y, m, cmpLabel, highValueIds) {
  const tagFilter = document.getElementById('alertTagFilter').value;
  const box = document.getElementById('alertList');

  const tagged = rows.map(r => {
    const isStopped = r.st.status === 'stopped';
    const severeDecline = r.st.status === 'decline' && r.st.delta !== null && r.st.delta <= -0.20;
    const consecutiveDecline = computeMomStreak(r.c.id, y, m, 'decline') >= 3;
    const highValueAnomaly = highValueIds.has(r.c.id) && (isStopped || (r.st.status === 'decline' && r.st.delta !== null && r.st.delta <= -0.15));
    const tags = [];
    if (severeDecline) tags.push('severeDecline');
    if (isStopped) tags.push('stopped');
    if (consecutiveDecline) tags.push('consecutiveDecline');
    if (highValueAnomaly) tags.push('highValueAnomaly');
    return { r, tags, isStopped };
  }).filter(t => t.tags.length > 0);

  const filtered = tagFilter === 'all' ? tagged : tagged.filter(t => t.tags.includes(tagFilter));
  filtered.sort((a, b) => {
    const aScore = a.isStopped ? -1000 : (a.r.st.delta ?? 0) * 100;
    const bScore = b.isStopped ? -1000 : (b.r.st.delta ?? 0) * 100;
    return aScore - bScore;
  });

  if (filtered.length === 0) {
    box.innerHTML = `<div class="empty-mini">目前沒有符合條件的客戶</div>`;
    return;
  }
  box.innerHTML = filtered.map(t => {
    const r = t.r;
    const cls = t.isStopped ? 'warn' : 'bad';
    const metaText = t.isStopped ? `${cmpLabel} $${fmtMoney(r.st.previous)}，本月無下單` : `$${fmtMoney(r.st.previous)} → $${fmtMoney(r.st.current)}`;
    const rightText = t.isStopped ? '停購' : (r.st.delta === null ? '—' : fmtPct(r.st.delta));
    const tagsHtml = t.tags.map(tg => `<span class="mini-tag ${tg === 'highValueAnomaly' ? 'accent' : (tg === 'stopped' ? 'warn' : 'bad')}">${WATCH_TAG_LABEL[tg]}</span>`).join(' ');
    return `<div class="alert-item ${cls}">
      <div>
        <div class="alert-name">${escapeHtml(r.c.name)}</div>
        <div class="alert-meta">${metaText}</div>
        <div class="alert-tags">${tagsHtml}</div>
      </div>
      <div class="alert-meta">${rightText}</div>
    </div>`;
  }).join('');
}

function renderPulseTable(rows, cmpLabel) {
  document.getElementById('pulsePrevHeader').textContent = `${cmpLabel}銷貨`;
  const search = document.getElementById('pulseSearch').value.trim().toLowerCase();
  const statusFilter = document.getElementById('pulseStatusFilter').value;
  const sortMode = document.getElementById('pulseSort').value;
  const body = document.getElementById('pulseBody');

  let filtered = rows.filter(r => r.c.name.toLowerCase().includes(search) || (r.c.code || '').toLowerCase().includes(search));
  if (statusFilter) filtered = filtered.filter(r => r.st.status === statusFilter);

  if (sortMode === 'codeAsc') {
    filtered = filtered.slice().sort((a, b) => (a.c.code || '').localeCompare(b.c.code || '', 'en', { numeric: true }) || a.c.name.localeCompare(b.c.name, 'zh-Hant'));
  } else if (sortMode === 'nameStroke') {
    filtered = filtered.slice().sort((a, b) => strokeCompare(a.c.name, b.c.name));
  } else {
    filtered = filtered.slice().sort((a, b) => {
      const order = { decline: 0, stopped: 1, growth: 2, stable: 3, new: 4, 'no-data': 5 };
      return order[a.st.status] - order[b.st.status];
    });
  }

  if (filtered.length === 0) {
    body.innerHTML = `<tr><td colspan="7" class="empty-mini">沒有符合條件的客戶資料</td></tr>`;
    return;
  }
  body.innerHTML = filtered.map(r => {
    const st = r.st;
    const trendClass = st.status === 'growth' ? 'trend-up' : st.status === 'decline' ? 'trend-down' : '';
    return `<tr>
      <td class="num-cell" style="text-align:left">${pulseCodeCell(r.c.id)}</td>
      <td>${escapeHtml(r.c.name)}</td>
      <td><span class="status-pill ${st.status}">${STATUS_LABEL[st.status]}</span></td>
      <td class="num-cell">$${fmtMoney(st.previous)}</td>
      <td class="num-cell">$${fmtMoney(st.current)}</td>
      <td class="num-cell ${trendClass}">${st.delta === null ? '—' : fmtPct(st.delta)}</td>
      <td><button class="icon-btn" onclick="goToAnalysis('${r.c.id}')">查看分析</button></td>
    </tr>`;
  }).join('');
}

function goToAnalysis(customerId) {
  // 離開 Dashboard 前先記住捲動位置，這樣之後從側邊選單點回「首頁 Dashboard」時能還原到同樣的地方
  const leavingKey = getCurrentActivePageKey();
  if (leavingKey) pageScrollPositions[leavingKey] = window.scrollY;

  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('is-active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('is-active'));
  document.querySelector('.nav-item[data-page="analysis"]').classList.add('is-active');
  document.getElementById('page-analysis').classList.add('is-active');
  window.scrollTo(0, 0); // 這個入口是「鑽進去看新客戶」，固定跳到最上方，不套用「還原上次位置」的規則

  document.getElementById('analysisRegionFilter').value = ''; // 重設為「全部」，確保目標客戶一定在選單裡
  populateAnalysisSelect(); // 先建立好選項清單
  document.getElementById('analysisCustomerSelect').value = customerId; // 選單值先設成目標客戶，避免下方 renderAnalysisPage 內部用到舊的選單值渲染、觸發預設月份重置

  // 帶入 Dashboard 目前檢視的年月，讓客戶分析直接停在同一個月份，不用再手動調整
  if (dashSelectedYear && dashSelectedMonth) {
    analysisSelectedCustomerId = customerId;
    analysisSelectedYear = dashSelectedYear;
    analysisSelectedMonth = dashSelectedMonth;
  }

  renderAnalysisPage();
}

/* =========================================================
   2. 客戶管理
   ========================================================= */

let selectedCustomerIds = new Set();

let customerCurrentPage = 1;
const CUSTOMER_PAGE_SIZE = 20;

function renderCustomerPage() {
  const search = document.getElementById('customerSearch').value.trim().toLowerCase();
  const regionFilter = document.getElementById('customerRegionFilter').value;
  populateRepFilterOptions(document.getElementById('customerRegionFilter'), '全部業務／區域');
  document.getElementById('customerRegionFilter').value = regionFilter;

  const body = document.getElementById('customerBody');
  const filtered = customers.filter(c =>
    ((c.name || '').toLowerCase().includes(search) ||
      (c.code || '').toLowerCase().includes(search) ||
      (c.contact || '').toLowerCase().includes(search)) &&
    matchesRegionFilter(c, regionFilter)
  ).sort((a, b) => (a.code || '').localeCompare(b.code || '') || a.name.localeCompare(b.name, 'zh-Hant'));

  document.getElementById('customerCount').textContent = `共 ${customers.length} 位客戶（${getRootCustomers().length} 個獨立主帳號）`;

  // 清掉已經不存在（例如被刪除）的選取狀態
  const validIds = new Set(customers.map(c => c.id));
  Array.from(selectedCustomerIds).forEach(id => { if (!validIds.has(id)) selectedCustomerIds.delete(id); });
  updateCustomerBulkBar();

  const pageCount = Math.max(1, Math.ceil(filtered.length / CUSTOMER_PAGE_SIZE));
  if (customerCurrentPage > pageCount) customerCurrentPage = pageCount;
  const pageItems = filtered.slice((customerCurrentPage - 1) * CUSTOMER_PAGE_SIZE, customerCurrentPage * CUSTOMER_PAGE_SIZE);

  if (filtered.length === 0) {
    body.innerHTML = `<tr><td colspan="9" class="empty-mini">${customers.length === 0 ? '尚未建立任何客戶，點選右上角「+ 新增客戶」開始' : '沒有符合條件的客戶'}</td></tr>`;
    syncCustomerSelectAllCheckbox([]);
    renderPagination('customerPagination', filtered.length, customerCurrentPage, CUSTOMER_PAGE_SIZE, (p) => { customerCurrentPage = p; renderCustomerPage(); });
    return;
  }
  body.innerHTML = pageItems.map(c => {
    const rootId = getRootId(c.id);
    const isAuto = !c.mergeToId && rootId !== c.id;
    const memberCount = getMergedMemberIds(c.id).length - 1;
    let mergeInfo = '<span style="color:var(--muted)">—</span>';
    if (rootId !== c.id) {
      const root = customers.find(x => x.id === rootId);
      const rootLabel = root ? (root.code ? root.code + '・' + root.name : root.name) : '（未知）';
      mergeInfo = `<span class="status-pill stable">↳ 合併至 ${escapeHtml(rootLabel)}${isAuto ? '（依編號自動）' : '（手動指定）'}</span>`;
    } else if (memberCount > 0) {
      mergeInfo = `<span class="status-pill new">🔗 主帳號・含 ${memberCount} 個子帳號</span>`;
    }
    const checked = selectedCustomerIds.has(c.id) ? 'checked' : '';
    return `
    <tr>
      <td><input type="checkbox" class="customer-select-checkbox" value="${c.id}" ${checked}></td>
      <td>${escapeHtml(c.code || '—')}</td>
      <td><strong>${escapeHtml(c.name)}</strong></td>
      <td>${escapeHtml(repName(c.repId))}</td>
      <td>${escapeHtml(c.category || '—')}</td>
      <td>${escapeHtml(c.contact || '—')}</td>
      <td>${escapeHtml(c.phone || '—')}</td>
      <td>${mergeInfo}</td>
      <td class="row-actions">
        <button class="icon-btn" onclick="openCustomerModal('${c.id}')">編輯</button>
        <button class="icon-btn danger" onclick="deleteCustomer('${c.id}')">刪除</button>
      </td>
    </tr>
  `;
  }).join('');

  document.querySelectorAll('.customer-select-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) selectedCustomerIds.add(cb.value); else selectedCustomerIds.delete(cb.value);
      updateCustomerBulkBar();
      syncCustomerSelectAllCheckbox(pageItems.map(c => c.id));
    });
  });
  syncCustomerSelectAllCheckbox(pageItems.map(c => c.id));
  renderPagination('customerPagination', filtered.length, customerCurrentPage, CUSTOMER_PAGE_SIZE, (p) => { customerCurrentPage = p; renderCustomerPage(); });
}

function syncCustomerSelectAllCheckbox(visibleIds) {
  const selectAll = document.getElementById('customerSelectAll');
  if (visibleIds.length === 0) { selectAll.checked = false; selectAll.indeterminate = false; return; }
  const selectedVisibleCount = visibleIds.filter(id => selectedCustomerIds.has(id)).length;
  selectAll.checked = selectedVisibleCount === visibleIds.length;
  selectAll.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleIds.length;
}

function toggleSelectAllCustomers() {
  const selectAll = document.getElementById('customerSelectAll');
  document.querySelectorAll('.customer-select-checkbox').forEach(cb => {
    cb.checked = selectAll.checked;
    if (selectAll.checked) selectedCustomerIds.add(cb.value); else selectedCustomerIds.delete(cb.value);
  });
  updateCustomerBulkBar();
}

function updateCustomerBulkBar() {
  const bar = document.getElementById('customerBulkBar');
  const count = selectedCustomerIds.size;
  if (count === 0) { bar.style.display = 'none'; return; }
  bar.style.display = '';
  populateRepOptions(document.getElementById('customerBulkRepSelect'), true, '（未指定）');
  document.getElementById('customerSelectedCount').textContent = `已選擇 ${count} 位客戶`;
}

function bulkAssignSelectedCustomers() {
  const repId = document.getElementById('customerBulkRepSelect').value;
  const count = selectedCustomerIds.size;
  if (count === 0) return;
  const label = repId ? repName(repId) : '（未指定）';
  if (!confirm(`確定要把選取的 ${count} 位客戶指派給「${label}」嗎？`)) return;
  customers.forEach(c => { if (selectedCustomerIds.has(c.id)) c.repId = repId; });
  saveCustomers();
  selectedCustomerIds.clear();
  renderCustomerPage();
  showToast(`已將 ${count} 位客戶指派給「${label}」`);
}

function populateCustomerMergeSelect(excludeId, selectedId) {
  const sel = document.getElementById('customerMergeTo');
  const options = customers.filter(c => c.id !== excludeId && isRootCustomer(c.id));
  sel.innerHTML = `<option value="">（不合併，獨立客戶）</option>` +
    options.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))
      .map(c => `<option value="${c.id}">${escapeHtml(c.code ? c.code + '・' + c.name : c.name)}</option>`).join('');
  sel.value = selectedId || '';
}

function openCustomerModal(id) {
  const overlay = document.getElementById('customerModalOverlay');
  document.getElementById('customerId').value = id || '';
  populateRepOptions(document.getElementById('customerRep'), true, '（未指定）');
  if (id) {
    const c = customers.find(c => c.id === id);
    document.getElementById('customerModalTitle').textContent = '編輯客戶';
    document.getElementById('customerCode').value = c.code || '';
    document.getElementById('customerName').value = c.name || '';
    document.getElementById('customerRep').value = c.repId || '';
    document.getElementById('customerCategory').value = c.category || '';
    document.getElementById('customerContact').value = c.contact || '';
    document.getElementById('customerPhone').value = c.phone || '';
    document.getElementById('customerNote').value = c.note || '';
    populateCustomerMergeSelect(id, c.mergeToId || '');
  } else {
    document.getElementById('customerModalTitle').textContent = '新增客戶';
    ['customerCode', 'customerName', 'customerCategory', 'customerContact', 'customerPhone', 'customerNote'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('customerRep').value = '';
    populateCustomerMergeSelect('', '');
  }
  overlay.classList.add('is-active');
}
function closeCustomerModal() { document.getElementById('customerModalOverlay').classList.remove('is-active'); }

function saveCustomerFromModal() {
  const id = document.getElementById('customerId').value;
  const name = document.getElementById('customerName').value.trim();
  const code = document.getElementById('customerCode').value.trim();
  const mergeToId = document.getElementById('customerMergeTo').value;
  const repId = document.getElementById('customerRep').value;
  if (!name) { showToast('請輸入客戶名稱'); return; }
  if (mergeToId && mergeToId === id) { showToast('不能合併到自己'); return; }

  if (code) {
    const dupCode = customers.find(c => c.code && c.code === code && c.id !== id);
    if (dupCode) { showToast('已有相同客戶編號存在：' + dupCode.name); return; }
  }
  // 若此客戶目前是別人的主帳號（有子帳號），不允許再把它合併到別人身上，避免多層合併
  if (mergeToId) {
    const hasMembers = getMergedMemberIds(id).length > 1;
    if (hasMembers) { showToast('此客戶目前是其他客戶的主帳號，請先取消底下子帳號的合併設定'); return; }
  }

  const payload = {
    code, name, mergeToId, repId,
    category: document.getElementById('customerCategory').value.trim(),
    contact: document.getElementById('customerContact').value.trim(),
    phone: document.getElementById('customerPhone').value.trim(),
    note: document.getElementById('customerNote').value.trim(),
  };

  if (id) {
    Object.assign(customers.find(c => c.id === id), payload);
    showToast('已更新客戶資料');
  } else {
    customers.push({ id: uid(), ...payload });
    showToast('已新增客戶');
  }
  saveCustomers();
  closeCustomerModal();
  renderCustomerPage();
}

function deleteCustomer(id) {
  const relatedSales = sales.filter(s => s.customerId === id).length;
  const memberCount = customers.filter(c => c.mergeToId === id).length;
  let msg = relatedSales > 0 ? `此客戶有 ${relatedSales} 筆銷貨紀錄，刪除客戶將一併刪除這些紀錄，確定要刪除嗎？` : '確定要刪除此客戶嗎？';
  if (memberCount > 0) msg += `\n（此客戶為主帳號，底下 ${memberCount} 個子帳號將自動變回獨立客戶）`;
  if (!confirm(msg)) return;
  customers.forEach(c => { if (c.mergeToId === id) c.mergeToId = ''; });
  customers = customers.filter(c => c.id !== id);
  sales = sales.filter(s => s.customerId !== id);
  saveCustomers(); saveSales();
  renderCustomerPage();
  showToast('已刪除客戶');
}

/* ---------------- 顯示目前依客戶編號自動合併的分組（唯讀，僅供確認） ---------------- */

function showMergeGroupsOverview() {
  const roots = getRootCustomers().filter(c => getMergedMemberIds(c.id).length > 1);
  const body = document.getElementById('duplicateGroupsBody');
  if (roots.length === 0) {
    body.innerHTML = `<p style="font-size:13px;color:var(--muted);margin:0">目前沒有客戶被合併計算。當客戶編號去掉結尾的 -1、-2 等序號後，與另一位客戶的編號完全相同時，系統會自動合併兩者的銷貨數字。</p>`;
  } else {
    body.innerHTML = `<p style="font-size:12.5px;color:var(--muted);margin:0 0 14px">系統依「客戶編號去掉 -1 等序號後是否相同」自動合併以下客戶，銷貨數字已加總計算（不比對客戶名稱）：</p>` +
      roots.map(root => {
        const members = getMergedMemberIds(root.id).map(id => customers.find(c => c.id === id)).filter(Boolean);
        return `<div class="dup-group">
          <div class="dup-group-title">主帳號：${escapeHtml(root.code ? root.code + '・' + root.name : root.name)}</div>
          ${members.map(m => `<div class="dup-group-option"><span>${escapeHtml(m.code || '（無編號）')} － ${escapeHtml(m.name)}${m.id === root.id ? '　（主帳號）' : (m.mergeToId ? '　（手動合併）' : '　（依編號自動合併）')}</span></div>`).join('')}
        </div>`;
      }).join('');
  }
  document.getElementById('duplicateModalOverlay').classList.add('is-active');
}
function closeDuplicateModal() { document.getElementById('duplicateModalOverlay').classList.remove('is-active'); }

/* =========================================================
   3. 產品管理
   ========================================================= */

/* 產品分類固定顯示順序（依過往檢討的順序，不是依數量排序）；不在清單裡的分類會排在最後面（依筆畫排序） */
const PRODUCT_CATEGORY_ORDER = [
  '雙液彈泥系列', '單液彈泥系列', '亮磁漆', '水性面漆系列', '水性底漆系列',
  '油性系列', '撥水劑系列', '添加劑系列', '柏油系列', '粉劑、塑膠系列'
];

function sortCategoriesByStandardOrder(categories) {
  return categories.slice().sort((a, b) => {
    const ia = PRODUCT_CATEGORY_ORDER.indexOf(a);
    const ib = PRODUCT_CATEGORY_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b, 'zh-Hant');
  });
}

let productCurrentPage = 1;
const PRODUCT_PAGE_SIZE = 20;

function renderProductPage() {
  const search = document.getElementById('productSearch').value.trim().toLowerCase();
  const categoryFilter = document.getElementById('productCategoryFilter').value;
  const body = document.getElementById('productBody');

  const categoryCounts = {};
  products.forEach(p => { if (p.category) categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1; });
  const distinctCategories = sortCategoriesByStandardOrder(Object.keys(categoryCounts));
  const catSel = document.getElementById('productCategoryFilter');
  const prevCatVal = catSel.value;
  catSel.innerHTML = `<option value="">全部分類</option>` +
    distinctCategories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}(${categoryCounts[c]})</option>`).join('');
  if (prevCatVal && (distinctCategories.includes(prevCatVal))) catSel.value = prevCatVal;

  const filtered = products.filter(p =>
    ((p.name || '').toLowerCase().includes(search) || (p.code || '').toLowerCase().includes(search)) &&
    (!categoryFilter || p.category === categoryFilter)
  ).sort((a, b) => (a.code || '').localeCompare(b.code || '') || a.name.localeCompare(b.name, 'zh-Hant'));

  document.getElementById('productCount').textContent = `共 ${filtered.length} 項產品`;

  const pageCount = Math.max(1, Math.ceil(filtered.length / PRODUCT_PAGE_SIZE));
  if (productCurrentPage > pageCount) productCurrentPage = pageCount;
  const pageItems = filtered.slice((productCurrentPage - 1) * PRODUCT_PAGE_SIZE, productCurrentPage * PRODUCT_PAGE_SIZE);

  if (filtered.length === 0) {
    body.innerHTML = `<tr><td colspan="4" class="empty-mini">${products.length === 0 ? '尚未建立任何產品，可手動新增，或透過 Excel 匯入自動建立' : '沒有符合條件的產品'}</td></tr>`;
    renderPagination('productPagination', filtered.length, productCurrentPage, PRODUCT_PAGE_SIZE, (p) => { productCurrentPage = p; renderProductPage(); });
    return;
  }
  body.innerHTML = pageItems.map(p => `
    <tr>
      <td>${escapeHtml(p.code || '—')}</td>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td>${escapeHtml(p.category || '—')}</td>
      <td class="row-actions">
        <button class="icon-btn" onclick="openProductModal('${p.id}')">編輯</button>
        <button class="icon-btn danger" onclick="deleteProduct('${p.id}')">刪除</button>
      </td>
    </tr>
  `).join('');
  renderPagination('productPagination', filtered.length, productCurrentPage, PRODUCT_PAGE_SIZE, (p) => { productCurrentPage = p; renderProductPage(); });
}

function populateProductCategoryDatalist() {
  const distinctCategories = sortCategoriesByStandardOrder(Array.from(new Set(products.map(p => p.category).filter(Boolean))));
  document.getElementById('productCategoryOptions').innerHTML = distinctCategories.map(c => `<option value="${escapeHtml(c)}">`).join('');
}

function openProductModal(id) {
  const overlay = document.getElementById('productModalOverlay');
  document.getElementById('productId').value = id || '';
  populateProductCategoryDatalist();
  if (id) {
    const p = products.find(p => p.id === id);
    document.getElementById('productModalTitle').textContent = '編輯產品';
    document.getElementById('productCode').value = p.code || '';
    document.getElementById('productName').value = p.name || '';
    document.getElementById('productCategory').value = p.category || '';
  } else {
    document.getElementById('productModalTitle').textContent = '新增產品';
    document.getElementById('productCode').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('productCategory').value = '';
  }
  overlay.classList.add('is-active');
}
function closeProductModal() { document.getElementById('productModalOverlay').classList.remove('is-active'); }

function saveProductFromModal() {
  const id = document.getElementById('productId').value;
  const name = document.getElementById('productName').value.trim();
  const code = document.getElementById('productCode').value.trim();
  const category = document.getElementById('productCategory').value.trim();
  if (!name) { showToast('請輸入產品名稱'); return; }
  if (code) {
    const dup = products.find(p => p.code && p.code === code && p.id !== id);
    if (dup) { showToast('已有相同產品編號存在：' + dup.name); return; }
  }
  if (id) {
    Object.assign(products.find(p => p.id === id), { code, name, category });
    showToast('已更新產品資料');
  } else {
    products.push({ id: uid(), code, name, category });
    showToast('已新增產品');
  }
  saveProducts();
  closeProductModal();
  renderProductPage();
}

function deleteProduct(id) {
  const relatedSales = sales.filter(s => s.productId === id).length;
  const msg = relatedSales > 0 ? `此產品有 ${relatedSales} 筆銷貨紀錄，刪除產品後這些紀錄會變成「未分類」，確定要刪除嗎？` : '確定要刪除此產品嗎？';
  if (!confirm(msg)) return;
  products = products.filter(p => p.id !== id);
  sales.forEach(s => { if (s.productId === id) s.productId = ''; });
  saveProducts(); saveSales();
  renderProductPage();
  showToast('已刪除產品');
}

/* 套用標準產品分類：依內建的產品編號對照表，幫系統裡已存在的產品補上分類，
   並可選擇把對照表裡「系統中還沒有」的產品也一併建立進來（預建完整產品目錄） */
function applyStandardProductCategories() {
  const refByCode = new Map(PRODUCT_CATEGORY_REFERENCE.map(r => [r.code, r]));
  let matchCount = 0, updateCount = 0;
  products.forEach(p => {
    if (!p.code) return;
    const ref = refByCode.get(p.code);
    if (ref) {
      matchCount++;
      if (p.category !== ref.category) { p.category = ref.category; updateCount++; }
    }
  });

  const existingCodes = new Set(products.map(p => p.code).filter(Boolean));
  const missing = PRODUCT_CATEGORY_REFERENCE.filter(r => !existingCodes.has(r.code));

  let msg = `對照表共 ${PRODUCT_CATEGORY_REFERENCE.length} 項產品，系統中比對到 ${matchCount} 項，其中 ${updateCount} 項分類將被更新／補上。`;
  if (missing.length > 0) {
    msg += `\n\n另外對照表裡有 ${missing.length} 項產品目前系統中還沒有（尚未被賣過）。\n要一併把這些產品建立進系統嗎？（預建完整產品目錄）\n\n按「確定」＝更新分類＋建立缺少的產品\n按「取消」＝只更新分類，不建立新產品`;
    const createMissing = confirm(msg);
    if (createMissing) {
      missing.forEach(r => { products.push({ id: uid(), code: r.code, name: r.name, category: r.category }); });
    }
    saveProducts();
    renderProductPage();
    showToast(`已更新 ${updateCount} 項產品分類${createMissing ? `，新建立 ${missing.length} 項產品` : ''}`);
  } else {
    if (!confirm(msg + '\n\n確定要套用嗎？')) return;
    saveProducts();
    renderProductPage();
    showToast(`已更新 ${updateCount} 項產品分類`);
  }
}

/* =========================================================
   3b. 業務／區域管理
   ========================================================= */

function renderRepsPage() {
  const search = document.getElementById('repSearch').value.trim().toLowerCase();
  const body = document.getElementById('repBody');
  const filtered = reps.filter(r => (r.name || '').toLowerCase().includes(search))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));

  document.getElementById('repCount').textContent = `共 ${reps.length} 個業務／區域`;

  if (filtered.length === 0) {
    body.innerHTML = `<tr><td colspan="3" class="empty-mini">${reps.length === 0 ? '尚未建立任何業務／區域，點選右上角「+ 新增業務／區域」開始' : '沒有符合搜尋的項目'}</td></tr>`;
    return;
  }
  body.innerHTML = filtered.map(r => {
    const custCount = customers.filter(c => c.repId === r.id).length;
    return `
    <tr>
      <td><strong>${escapeHtml(r.name)}</strong></td>
      <td class="num-cell" style="text-align:left">${custCount}</td>
      <td class="row-actions">
        <button class="icon-btn" onclick="openRepModal('${r.id}')">編輯</button>
        <button class="icon-btn danger" onclick="deleteRep('${r.id}')">刪除</button>
      </td>
    </tr>
  `;
  }).join('');
}

function openRepModal(id) {
  const overlay = document.getElementById('repModalOverlay');
  document.getElementById('repId').value = id || '';
  if (id) {
    const r = reps.find(r => r.id === id);
    document.getElementById('repModalTitle').textContent = '編輯業務／區域';
    document.getElementById('repName').value = r.name || '';
  } else {
    document.getElementById('repModalTitle').textContent = '新增業務／區域';
    document.getElementById('repName').value = '';
  }
  overlay.classList.add('is-active');
}
function closeRepModal() { document.getElementById('repModalOverlay').classList.remove('is-active'); }

function saveRepFromModal() {
  const id = document.getElementById('repId').value;
  const name = document.getElementById('repName').value.trim();
  if (!name) { showToast('請輸入業務／區域名稱'); return; }
  const dup = reps.find(r => r.name === name && r.id !== id);
  if (dup) { showToast('已有相同名稱的業務／區域存在'); return; }
  if (id) {
    Object.assign(reps.find(r => r.id === id), { name });
    showToast('已更新業務／區域資料');
  } else {
    reps.push({ id: uid(), name });
    showToast('已新增業務／區域');
  }
  saveReps();
  closeRepModal();
  renderRepsPage();
}

function deleteRep(id) {
  const relatedCustomers = customers.filter(c => c.repId === id).length;
  const msg = relatedCustomers > 0 ? `目前有 ${relatedCustomers} 位客戶指定給此業務／區域，刪除後這些客戶會變成「未指定」，確定要刪除嗎？` : '確定要刪除此業務／區域嗎？';
  if (!confirm(msg)) return;
  reps = reps.filter(r => r.id !== id);
  customers.forEach(c => { if (c.repId === id) c.repId = ''; });
  saveReps(); saveCustomers();
  renderRepsPage();
  showToast('已刪除業務／區域');
}

/* 各頁面共用：填入「業務／區域」下拉選單選項 */
function populateRepOptions(selectEl, includeEmpty, emptyLabel) {
  const prevVal = selectEl.value;
  const sortedReps = reps.slice().sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
  selectEl.innerHTML = (includeEmpty ? `<option value="">${emptyLabel}</option>` : '') +
    sortedReps.map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('');
  if (prevVal && (prevVal === '' || sortedReps.some(r => r.id === prevVal))) selectEl.value = prevVal;
}

/* 用於「檢視區域」這類篩選下拉：除了全部與各業務，額外加一個「未指定業務」選項，
   方便對帳時檢查是否有客戶還沒被分類（這類客戶會計入「全部」但不會出現在任何單一業務底下）。
   配合 matchesRegionFilter() 使用。 */
const UNASSIGNED_REGION = '__unassigned__';

function populateRepFilterOptions(selectEl, allLabel) {
  const prevVal = selectEl.value;
  const sortedReps = reps.slice().sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
  selectEl.innerHTML = `<option value="">${allLabel}</option>` +
    `<option value="${UNASSIGNED_REGION}">⚠ 未指定業務</option>` +
    sortedReps.map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('');
  if (prevVal && (prevVal === '' || prevVal === UNASSIGNED_REGION || sortedReps.some(r => r.id === prevVal))) selectEl.value = prevVal;
}

function matchesRegionFilter(customer, regionFilter) {
  if (!regionFilter) return true;
  if (regionFilter === UNASSIGNED_REGION) return !customer.repId;
  return customer.repId === regionFilter;
}

/* =========================================================
   4. 每月銷貨資料
   ========================================================= */

let salesCurrentPage = 1;
const SALES_PAGE_SIZE = 50;

const STORAGE_KEY_SALES_FILTERS = 'cst_salesFilterState_v1';
let salesFiltersLoaded = false;

function loadSalesFilterState() {
  let state = {};
  try { state = JSON.parse(localStorage.getItem(STORAGE_KEY_SALES_FILTERS)) || {}; } catch (e) { state = {}; }
  document.getElementById('salesFilterYear').value = state.year || '';
  document.getElementById('salesFilterMonth').value = state.month || '';
  document.getElementById('salesFilterCustomer').value = state.customer || '';
  document.getElementById('salesFilterProduct').value = state.product || '';
  document.getElementById('salesRegionFilter').value = state.region || '';
}

function saveSalesFilterState() {
  const state = {
    year: document.getElementById('salesFilterYear').value,
    month: document.getElementById('salesFilterMonth').value,
    customer: document.getElementById('salesFilterCustomer').value,
    product: document.getElementById('salesFilterProduct').value,
    region: document.getElementById('salesRegionFilter').value
  };
  localStorage.setItem(STORAGE_KEY_SALES_FILTERS, JSON.stringify(state));
}

function populateSalesFilters() {
  const months = allMonthsInData();
  const years = Array.from(new Set(months.map(mo => mo.y))).sort((a, b) => b - a);
  const yearSel = document.getElementById('salesFilterYear');
  const prevY = yearSel.value;
  yearSel.innerHTML = `<option value="">全部年份</option>` + years.map(y => `<option value="${y}">${y}</option>`).join('');
  if (prevY && years.some(y => String(y) === prevY)) yearSel.value = prevY;

  const monthSel = document.getElementById('salesFilterMonth');
  if (!monthSel.dataset.init) {
    monthSel.innerHTML = `<option value="">全部月份</option>` + Array.from({ length: 12 }, (_, i) => i + 1).map(m => `<option value="${m}">${m} 月</option>`).join('');
    monthSel.dataset.init = '1';
  }
  populateRepOptions(document.getElementById('salesRegionFilter'), true, '全部業務／區域');
}

/* 建立客戶/產品的 id -> 顯示字串 查詢表（Map，O(1)查詢）。
   每月銷貨資料的排序、篩選如果直接呼叫 customerName()/customerLabel() 等函式，
   這些函式內部是 customers.find(...) 線性搜尋，資料量一大（例如上萬筆交易 排序時
   要比對好幾十萬次）就會變得很卡。改成先把整份客戶/產品名單建成查詢表，排序/篩選時
   改查表即可，效能差非常多。 */
function getCustomerNameMap() {
  const map = new Map();
  customers.forEach(c => map.set(c.id, c.name));
  return map;
}
function getCustomerLabelMap() {
  const map = new Map();
  customers.forEach(c => map.set(c.id, c.code ? `${c.code}・${c.name}` : c.name));
  return map;
}
function getCustomerRepMap() {
  const map = new Map();
  customers.forEach(c => map.set(c.id, c.repId));
  return map;
}
function getProductLabelMap() {
  const map = new Map();
  products.forEach(p => map.set(p.id, p.code ? `${p.name}（${p.code}）` : p.name));
  return map;
}

function getFilteredSales() {
  const yearVal = document.getElementById('salesFilterYear').value;
  const monthVal = document.getElementById('salesFilterMonth').value;
  const custVal = document.getElementById('salesFilterCustomer').value.trim().toLowerCase();
  const prodVal = document.getElementById('salesFilterProduct').value.trim().toLowerCase();
  const regionVal = document.getElementById('salesRegionFilter').value;

  const custLabelMap = getCustomerLabelMap();
  const custRepMap = getCustomerRepMap();
  const prodLabelMap = getProductLabelMap();

  let filtered = sales.slice();
  if (yearVal) filtered = filtered.filter(s => String(s.year) === yearVal);
  if (monthVal) filtered = filtered.filter(s => String(s.month) === monthVal);
  if (custVal) filtered = filtered.filter(s => (custLabelMap.get(s.customerId) || '').toLowerCase().includes(custVal));
  if (prodVal) filtered = filtered.filter(s => (prodLabelMap.get(s.productId) || '').toLowerCase().includes(prodVal));
  if (regionVal) filtered = filtered.filter(s => custRepMap.get(s.customerId) === regionVal);
  return filtered;
}

let salesResultCache = { key: null, sorted: null };

function renderSalesPage() {
  populateSalesFilters();
  if (!salesFiltersLoaded) {
    salesFiltersLoaded = true;
    loadSalesFilterState(); // 選單選項就緒後，才套用上次記住的篩選條件
  }
  const body = document.getElementById('salesBody');

  // 篩選＋排序的結果快取起來：只要篩選條件、比較資料版本沒有變，單純換頁就直接沿用上次算好的結果，
  // 不用每次都重新篩選、排序一次上萬筆交易紀錄——手機處理器比較弱，這個重算的成本感受會更明顯。
  const cacheKey = [
    salesDataVersion,
    document.getElementById('salesFilterYear').value,
    document.getElementById('salesFilterMonth').value,
    document.getElementById('salesFilterCustomer').value,
    document.getElementById('salesFilterProduct').value,
    document.getElementById('salesRegionFilter').value
  ].join('|');

  let sorted, custLabelMap, prodLabelMap, total;
  if (salesResultCache.key === cacheKey) {
    sorted = salesResultCache.sorted;
    custLabelMap = salesResultCache.custLabelMap;
    prodLabelMap = salesResultCache.prodLabelMap;
    total = salesResultCache.total;
  } else {
    const filtered = getFilteredSales();
    total = filtered.reduce((a, s) => a + Number(s.amount || 0), 0);

    // 排序改用查詢表（O(1)查詢），避免每次比較都重新線性搜尋 customers 陣列，
    // 資料量一大（上萬筆交易）排序會變得很慢、切換這頁時明顯卡頓，這是主要瓶頸
    const custNameMap = getCustomerNameMap();
    custLabelMap = getCustomerLabelMap();
    prodLabelMap = getProductLabelMap();
    sorted = filtered.slice().sort((a, b) => {
      const k = monthKey(b.year, b.month) - monthKey(a.year, a.month);
      if (k !== 0) return k;
      const an = custNameMap.get(a.customerId) || '（已刪除客戶）';
      const bn = custNameMap.get(b.customerId) || '（已刪除客戶）';
      return an.localeCompare(bn, 'zh-Hant');
    });

    salesResultCache = { key: cacheKey, sorted, custLabelMap, prodLabelMap, total };
  }

  document.getElementById('salesTotalLabel').textContent = `共 ${sorted.length} 筆・合計 $${fmtMoney(total)}`;

  const pageCount = Math.max(1, Math.ceil(sorted.length / SALES_PAGE_SIZE));
  if (salesCurrentPage > pageCount) salesCurrentPage = pageCount;
  const pageItems = sorted.slice((salesCurrentPage - 1) * SALES_PAGE_SIZE, salesCurrentPage * SALES_PAGE_SIZE);

  if (sorted.length === 0) {
    body.innerHTML = `<tr><td colspan="8" class="empty-mini">沒有符合條件的銷貨紀錄</td></tr>`;
  } else {
    body.innerHTML = pageItems.map(s => `
      <tr>
        <td>${escapeHtml(s.date || '—')}</td>
        <td>${s.year} / ${s.month}</td>
        <td>${escapeHtml(custLabelMap.get(s.customerId) || '（已刪除客戶）')}</td>
        <td>${escapeHtml(prodLabelMap.get(s.productId) || (s.productId ? '（已刪除產品）' : '未分類'))}</td>
        <td class="num-cell">${s.quantity === null || s.quantity === undefined || s.quantity === '' ? '—' : s.quantity}</td>
        <td class="num-cell">${s.unitPrice === null || s.unitPrice === undefined || s.unitPrice === '' ? '—' : fmtMoney(s.unitPrice)}</td>
        <td class="num-cell">$${fmtMoney(s.amount)}</td>
        <td class="row-actions">
          <button class="icon-btn" onclick="openSaleModal('${s.id}')">編輯</button>
          <button class="icon-btn danger" onclick="deleteSale('${s.id}')">刪除</button>
        </td>
      </tr>
    `).join('');
  }
  renderPagination('salesPagination', sorted.length, salesCurrentPage, SALES_PAGE_SIZE, (p) => { salesCurrentPage = p; renderSalesPage(); });

  const resetPageAnd = (fn) => () => { salesCurrentPage = 1; saveSalesFilterState(); fn(); };
  document.getElementById('salesFilterYear').onchange = resetPageAnd(renderSalesPage);
  document.getElementById('salesFilterMonth').onchange = resetPageAnd(renderSalesPage);
  document.getElementById('salesFilterCustomer').oninput = resetPageAnd(renderSalesPage);
  document.getElementById('salesFilterProduct').oninput = resetPageAnd(renderSalesPage);
  document.getElementById('salesRegionFilter').onchange = resetPageAnd(renderSalesPage);
}

/* 一鍵清空全部篩選條件 */
function clearSalesFilters() {
  document.getElementById('salesFilterYear').value = '';
  document.getElementById('salesFilterMonth').value = '';
  document.getElementById('salesFilterCustomer').value = '';
  document.getElementById('salesFilterProduct').value = '';
  document.getElementById('salesRegionFilter').value = '';
  salesCurrentPage = 1;
  saveSalesFilterState();
  renderSalesPage();
}

/* 通用分頁控制元件 */
function renderPagination(containerId, totalItems, currentPage, pageSize, onChange) {
  const el = document.getElementById(containerId);
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  if (pageCount <= 1) { el.innerHTML = ''; return; }

  const buttons = [];
  buttons.push(`<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">‹ 上一頁</button>`);

  const pages = new Set([1, pageCount, currentPage, currentPage - 1, currentPage + 1]);
  let lastShown = 0;
  Array.from(pages).filter(p => p >= 1 && p <= pageCount).sort((a, b) => a - b).forEach(p => {
    if (lastShown && p - lastShown > 1) buttons.push(`<span class="page-ellipsis">…</span>`);
    buttons.push(`<button class="page-btn ${p === currentPage ? 'is-active' : ''}" data-page="${p}">${p}</button>`);
    lastShown = p;
  });

  buttons.push(`<button class="page-btn" ${currentPage === pageCount ? 'disabled' : ''} data-page="${currentPage + 1}">下一頁 ›</button>`);
  el.innerHTML = buttons.join('');
  el.querySelectorAll('.page-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = Number(btn.dataset.page);
      if (p < 1 || p > pageCount) return;
      onChange(p);
      // 換頁後自動把表格捲回頂端，不用手動往上滑才看得到新一頁的資料
      const card = el.closest('.card');
      if (card) card.scrollIntoView({ behavior: 'auto', block: 'start' });
      else window.scrollTo(0, 0);
    });
  });
}

function populateSaleCustomerSelect(selectedId) {
  const sel = document.getElementById('saleCustomer');
  if (customers.length === 0) {
    sel.innerHTML = `<option value="">請先至「客戶管理」新增客戶</option>`;
    return;
  }
  sel.innerHTML = customers.slice().sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))
    .map(c => `<option value="${c.id}">${escapeHtml(customerLabel(c.id))}</option>`).join('');
  if (selectedId) sel.value = selectedId;
}
function populateSaleProductSelect(selectedId) {
  const sel = document.getElementById('saleProduct');
  sel.innerHTML = `<option value="">（未分類）</option>` + products.slice().sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))
    .map(p => `<option value="${p.id}">${escapeHtml(productLabel(p.id))}</option>`).join('');
  sel.value = selectedId || '';
}

function openSaleModal(id) {
  if (customers.length === 0) { showToast('請先至「客戶管理」新增客戶'); return; }
  const overlay = document.getElementById('saleModalOverlay');
  document.getElementById('saleId').value = id || '';
  const now = new Date();

  if (id) {
    const s = sales.find(s => s.id === id);
    document.getElementById('saleModalTitle').textContent = '編輯銷貨紀錄';
    populateSaleCustomerSelect(s.customerId);
    populateSaleProductSelect(s.productId);
    document.getElementById('saleYear').value = s.year;
    document.getElementById('saleMonth').value = s.month;
    document.getElementById('saleQty').value = s.quantity ?? '';
    document.getElementById('saleUnitPrice').value = s.unitPrice ?? '';
    document.getElementById('saleAmount').value = s.amount;
    document.getElementById('saleNote').value = s.note || '';
  } else {
    document.getElementById('saleModalTitle').textContent = '新增銷貨紀錄';
    populateSaleCustomerSelect();
    populateSaleProductSelect();
    document.getElementById('saleYear').value = now.getFullYear();
    document.getElementById('saleMonth').value = now.getMonth() + 1;
    document.getElementById('saleQty').value = '';
    document.getElementById('saleUnitPrice').value = '';
    document.getElementById('saleAmount').value = '';
    document.getElementById('saleNote').value = '';
  }
  overlay.classList.add('is-active');
}
function closeSaleModal() { document.getElementById('saleModalOverlay').classList.remove('is-active'); }

/* 數量 x 單價 自動帶入金額（若金額欄位是空的） */
function attachSaleAutoCalc() {
  const qtyEl = document.getElementById('saleQty');
  const priceEl = document.getElementById('saleUnitPrice');
  const amountEl = document.getElementById('saleAmount');
  function recalc() {
    const q = Number(qtyEl.value), p = Number(priceEl.value);
    if (qtyEl.value !== '' && priceEl.value !== '' && !isNaN(q) && !isNaN(p)) {
      amountEl.value = Math.round(q * p);
    }
  }
  qtyEl.addEventListener('input', recalc);
  priceEl.addEventListener('input', recalc);
}

function saveSaleFromModal() {
  const id = document.getElementById('saleId').value;
  const customerId = document.getElementById('saleCustomer').value;
  const productId = document.getElementById('saleProduct').value;
  const year = Number(document.getElementById('saleYear').value);
  const month = Number(document.getElementById('saleMonth').value);
  const qtyRaw = document.getElementById('saleQty').value;
  const priceRaw = document.getElementById('saleUnitPrice').value;
  const amount = Number(document.getElementById('saleAmount').value);
  const note = document.getElementById('saleNote').value.trim();

  if (!customerId) { showToast('請選擇客戶'); return; }
  if (!year || year < 2000 || year > 2100) { showToast('請輸入正確的年份'); return; }
  if (!amount && amount !== 0) { showToast('請輸入銷貨金額'); return; }
  if (amount < 0) { showToast('銷貨金額不可為負數'); return; }

  const payload = {
    customerId, productId, year, month,
    quantity: qtyRaw === '' ? null : Number(qtyRaw),
    unitPrice: priceRaw === '' ? null : Number(priceRaw),
    amount, note
  };

  if (id) {
    const s = sales.find(s => s.id === id);
    Object.assign(s, payload);
    showToast('已更新銷貨紀錄');
  } else {
    sales.push({ id: uid(), date: '', ...payload });
    showToast('已新增銷貨紀錄');
  }
  saveSales();
  closeSaleModal();
  renderSalesPage();
}

function deleteSale(id) {
  if (!confirm('確定要刪除這筆銷貨紀錄嗎？')) return;
  sales = sales.filter(s => s.id !== id);
  saveSales();
  renderSalesPage();
  showToast('已刪除銷貨紀錄');
}

/* =========================================================
   5. Excel 批次匯入（交易明細格式）
   ========================================================= */

function downloadTemplate() {
  const wsData = [
    ['單據日期', '客戶編號', '客戶簡稱', '產品名稱(含編號)', '數量', '單價', '金額'],
    ['2026/07/04', 'B009', '柏強商行', '防水能 立裝 草綠色(A1001-1.11)', 12, 120, 1440],
    ['2026/07/05', 'B027', '復陞五金企業有限公司', '聖山防漏膠 加侖 透明(A1002-2)', 6, 290, 1740]
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 30 }, { wch: 8 }, { wch: 10 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '銷貨明細匯入範本');
  XLSX.writeFile(wb, '客戶銷貨明細匯入範本.xlsx');
}

function handleImportFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      processImportRows(rows);
    } catch (err) {
      showToast('讀取 Excel 檔案失敗，請確認檔案格式');
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(file);
}

function findColumn(row, candidates) {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const k = keys.find(k => k.trim() === cand);
    if (k) return k;
  }
  return null;
}

/* 將 Excel 日期（字串或序號或 Date 物件）轉為 {y,m,dateStr} */
function parseExcelDate(val) {
  if (val instanceof Date && !isNaN(val)) {
    return { y: val.getFullYear(), m: val.getMonth() + 1, dateStr: `${val.getFullYear()}/${val.getMonth() + 1}/${val.getDate()}` };
  }
  const s = String(val).trim();
  const m1 = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m1) {
    return { y: Number(m1[1]), m: Number(m1[2]), dateStr: s };
  }
  // Excel 序號日期
  const num = Number(s);
  if (!isNaN(num) && num > 0) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + num * 86400000);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, dateStr: `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}` };
  }
  return null;
}

/* 將「產品名稱(產品編號)」拆解成 {name, code} */
function parseProductNameCode(text) {
  const s = String(text || '').trim();
  const m = s.match(/^(.*)\(([^()]+)\)\s*$/);
  if (m) return { name: m[1].trim(), code: m[2].trim() };
  return { name: s, code: '' };
}

function processImportRows(rows) {
  if (!rows || rows.length === 0) { showToast('這個 Excel 檔案沒有資料'); return; }

  const dateKey = findColumn(rows[0], ['單據日期', '日期', '交易日期']);
  const custCodeKey = findColumn(rows[0], ['客戶編號', '客戶代號', '客戶代碼']);
  const custNameKey = findColumn(rows[0], ['客戶簡稱', '客戶名稱', '客戶']);
  const prodKey = findColumn(rows[0], ['產品名稱(含編號)', '產品名稱', '品名']);
  const qtyKey = findColumn(rows[0], ['數量']);
  const priceKey = findColumn(rows[0], ['單價']);
  const amountKey = findColumn(rows[0], ['金額', '本幣金額']);
  const noteKey = findColumn(rows[0], ['備註', '說明']);

  if (!dateKey || !custNameKey || !amountKey) {
    showToast('找不到必要欄位，請確認欄位名稱包含：單據日期 / 客戶簡稱 / 金額');
    return;
  }

  pendingImportRows = [];

  // 預先把「現有銷貨紀錄」整理成一組簽章集合，之後每一列只要 O(1) 查表即可判斷是否重複，
  // 不用像以前那樣每一列都重新把全部銷貨紀錄掃一遍（資料量大時匯入會很慢）
  const existingSaleSignatures = new Set(
    sales.map(s => `${s.customerId}|${s.productId || ''}|${s.date}|${Math.round(Number(s.amount) || 0)}|${s.quantity === null || s.quantity === undefined ? '' : s.quantity}`)
  );

  rows.forEach(r => {
    const dateInfo = parseExcelDate(r[dateKey]);
    const custCode = custCodeKey ? String(r[custCodeKey] || '').trim() : '';
    const custName = String(r[custNameKey] || '').trim();
    const prodText = prodKey ? String(r[prodKey] || '').trim() : '';
    const qty = qtyKey && r[qtyKey] !== '' ? Number(r[qtyKey]) : null;
    const price = priceKey && r[priceKey] !== '' ? Number(String(r[priceKey]).replace(/,/g, '')) : null;
    const amount = Number(String(r[amountKey]).replace(/,/g, ''));
    const note = noteKey ? String(r[noteKey] || '').trim() : '';

    if (!dateInfo || !custName || isNaN(amount)) return;

    const { name: prodName, code: prodCode } = parseProductNameCode(prodText);

    // 客戶比對：優先用客戶編號，沒有編號則用名稱
    let existingCustomer = null;
    if (custCode) existingCustomer = customers.find(c => c.code && c.code === custCode);
    if (!existingCustomer && !custCode) existingCustomer = customers.find(c => !c.code && c.name === custName);

    // 產品比對：優先用產品編號，沒有編號則用名稱
    let existingProduct = null;
    if (prodCode) existingProduct = products.find(p => p.code && p.code === prodCode);
    if (!existingProduct && !prodCode && prodName) existingProduct = products.find(p => !p.code && p.name === prodName);

    // 重複匯入偵測（同客戶+產品+日期+金額+數量已存在則略過）
    let isDuplicate = false;
    if (existingCustomer) {
      const productIdForCheck = existingProduct ? existingProduct.id : (!prodName ? '' : null);
      if (productIdForCheck !== null) {
        const sig = `${existingCustomer.id}|${productIdForCheck}|${dateInfo.dateStr}|${Math.round(amount)}|${qty === null || qty === undefined ? '' : qty}`;
        isDuplicate = existingSaleSignatures.has(sig);
      }
    }

    let status = 'new';
    if (isDuplicate) status = 'duplicate';
    else if (!existingCustomer) status = existingCustomer === null && custCode ? 'new-customer' : (custName && !custCode ? 'new-customer' : 'new');

    pendingImportRows.push({
      dateInfo, custCode, custName, prodName, prodCode, qty, price, amount, note,
      existingCustomerId: existingCustomer ? existingCustomer.id : null,
      existingProductId: existingProduct ? existingProduct.id : null,
      status
    });
  });

  renderImportPreview();
}

function renderImportPreview() {
  const card = document.getElementById('importPreviewCard');
  if (pendingImportRows.length === 0) {
    card.style.display = 'none';
    showToast('沒有可匯入的有效資料，請確認欄位內容');
    return;
  }
  card.style.display = '';

  const newCustCodes = new Set(pendingImportRows.filter(r => !r.existingCustomerId).map(r => r.custCode || r.custName));
  const newProdCodes = new Set(pendingImportRows.filter(r => r.prodName && !r.existingProductId).map(r => r.prodCode || r.prodName));
  const dupCount = pendingImportRows.filter(r => r.status === 'duplicate').length;
  const newCount = pendingImportRows.filter(r => r.status !== 'duplicate').length;

  document.getElementById('importSummary').textContent =
    `共 ${pendingImportRows.length} 筆・將新增 ${newCount} 筆交易・略過重複 ${dupCount} 筆・新客戶 ${newCustCodes.size}・新產品 ${newProdCodes.size}`;

  document.getElementById('importPreviewBody').innerHTML = pendingImportRows.map(r => {
    const statusLabel = r.status === 'duplicate' ? '重複・略過' : (!r.existingCustomerId ? '新客戶・新增' : '新增');
    const statusClass = r.status === 'duplicate' ? 'stable' : (!r.existingCustomerId ? 'new' : 'growth');
    return `<tr>
      <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
      <td>${escapeHtml(r.dateInfo.dateStr)}</td>
      <td>${escapeHtml(r.custCode ? r.custCode + '・' + r.custName : r.custName)}</td>
      <td>${escapeHtml(r.prodName || '未分類')}</td>
      <td class="num-cell">${r.qty === null ? '—' : r.qty}</td>
      <td class="num-cell">$${fmtMoney(r.amount)}</td>
    </tr>`;
  }).join('');

  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function confirmImport() {
  if (!pendingImportRows || pendingImportRows.length === 0) {
    showToast('沒有待匯入的資料，請重新選擇檔案');
    return;
  }
  try {
    let createdCust = 0, createdProd = 0, added = 0, skipped = 0;
    const importRepSelectEl = document.getElementById('importRepSelect');
    const importRepId = importRepSelectEl ? importRepSelectEl.value : '';

    pendingImportRows.forEach(r => {
      if (r.status === 'duplicate') { skipped++; return; }

      let customerId = r.existingCustomerId;
      if (!customerId) {
        let cust = r.custCode ? customers.find(c => c.code === r.custCode) : customers.find(c => !c.code && c.name === r.custName);
        if (!cust) {
          cust = { id: uid(), code: r.custCode, name: r.custName, mergeToId: '', repId: importRepId, category: '', contact: '', phone: '', note: '' };
          customers.push(cust);
          createdCust++;
        }
        customerId = cust.id;
      }

      let productId = '';
      if (r.prodName) {
        productId = r.existingProductId;
        if (!productId) {
          let prod = r.prodCode ? products.find(p => p.code === r.prodCode) : products.find(p => !p.code && p.name === r.prodName);
          if (!prod) {
            prod = { id: uid(), code: r.prodCode, name: r.prodName, category: '' };
            products.push(prod);
            createdProd++;
          }
          productId = prod.id;
        }
      }

      sales.push({
        id: uid(), customerId, productId,
        year: r.dateInfo.y, month: r.dateInfo.m, date: r.dateInfo.dateStr,
        quantity: r.qty, unitPrice: r.price, amount: r.amount, note: r.note
      });
      added++;
    });

    saveCustomers(); saveProducts(); saveSales();
    pendingImportRows = [];
    document.getElementById('importPreviewCard').style.display = 'none';
    document.getElementById('fileInput').value = '';
    const repNote = importRepId ? `，新客戶已指定為「${repName(importRepId)}」` : '';
    showToast(`匯入完成：新增 ${added} 筆交易、略過重複 ${skipped} 筆、新建客戶 ${createdCust} 位、新建產品 ${createdProd} 項${repNote}`);
    refreshCurrentPage();
  } catch (err) {
    console.error('匯入失敗：', err);
    showToast('匯入失敗：' + (err && err.message ? err.message : '發生未預期的錯誤，請按 F12 查看主控台錯誤訊息並回報'));
  }
}

function cancelImport() {
  pendingImportRows = [];
  document.getElementById('importPreviewCard').style.display = 'none';
  document.getElementById('fileInput').value = '';
}

/* =========================================================
   6. 客戶分析
   ========================================================= */

let analysisCompareMode = 'mom'; // 'mom' 上月 | 'yoy' 去年同月
let analysisSelectedYear = null;
let analysisSelectedMonth = null;
let analysisSelectedCustomerId = null;

function populateAnalysisSelect() {
  const sel = document.getElementById('analysisCustomerSelect');
  const prevVal = sel.value;
  const regionFilter = document.getElementById('analysisRegionFilter').value;
  const rootCustomers = getRootCustomers().filter(c => matchesRegionFilter(c, regionFilter));
  if (rootCustomers.length === 0) {
    sel.innerHTML = `<option value="">尚無客戶</option>`;
    return;
  }
  sel.innerHTML = `<option value="">請選擇客戶...</option>` +
    rootCustomers.slice().sort((a, b) => (a.code || '').localeCompare(b.code || '', 'en', { numeric: true }) || a.name.localeCompare(b.name, 'zh-Hant'))
      .map(c => `<option value="${c.id}">${escapeHtml(mergedCustomerLabel(c.id))}</option>`).join('');
  if (prevVal && rootCustomers.some(c => c.id === prevVal)) sel.value = prevVal;
}

function renderAnalysisPage() {
  populateRepFilterOptions(document.getElementById('analysisRegionFilter'), '全部');
  populateAnalysisSelect();
  const sel = document.getElementById('analysisCustomerSelect');
  sel.onchange = () => renderAnalysisForCustomer(sel.value);
  document.getElementById('analysisRegionFilter').onchange = () => {
    populateAnalysisSelect();
    if (sel.value) renderAnalysisForCustomer(sel.value);
    else {
      document.getElementById('analysisEmpty').style.display = '';
      document.getElementById('analysisContent').style.display = 'none';
      document.getElementById('analysisMonthControls').style.display = 'none';
    }
  };

  document.querySelectorAll('#analysisCompareToggle .segmented-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.mode === analysisCompareMode);
    btn.onclick = () => {
      if (analysisCompareMode === btn.dataset.mode) return;
      analysisCompareMode = btn.dataset.mode;
      // 立即同步高亮狀態，不用等下一次整頁重繪
      document.querySelectorAll('#analysisCompareToggle .segmented-btn').forEach(b => b.classList.toggle('is-active', b.dataset.mode === analysisCompareMode));
      if (sel.value) renderAnalysisForCustomer(sel.value);
    };
  });

  if (sel.value) renderAnalysisForCustomer(sel.value);
  else {
    document.getElementById('analysisEmpty').style.display = '';
    document.getElementById('analysisContent').style.display = 'none';
    document.getElementById('analysisMonthControls').style.display = 'none';
  }
}

function renderAnalysisForCustomer(customerId) {
  if (!customerId) {
    document.getElementById('analysisEmpty').style.display = '';
    document.getElementById('analysisContent').style.display = 'none';
    document.getElementById('analysisMonthControls').style.display = 'none';
    return;
  }
  document.getElementById('analysisEmpty').style.display = 'none';
  document.getElementById('analysisContent').style.display = '';
  document.getElementById('analysisMonthControls').style.display = '';

  const custSales = salesForMergedCustomer(customerId).sort((a, b) => monthKey(a.year, a.month) - monthKey(b.year, b.month));

  // 只有在「切換客戶」時才重設預設檢視月份；一律預設為系統目前最新月份，不是該客戶自己最後叫貨的月份
  if (analysisSelectedCustomerId !== customerId) {
    analysisSelectedCustomerId = customerId;
    const latestMonths = allMonthsInData();
    if (latestMonths.length) {
      analysisSelectedYear = latestMonths[0].y;
      analysisSelectedMonth = latestMonths[0].m;
    } else {
      const now = new Date();
      analysisSelectedYear = now.getFullYear();
      analysisSelectedMonth = now.getMonth() + 1;
    }
  }

  document.getElementById('analysisChartTitle').textContent = `${mergedCustomerLabel(customerId)}・近 12 個月銷貨趨勢`;
  setupAnalysisMonthControls(customerId, custSales);
  renderAnalysisMonthDependent(customerId, custSales);
}

/* 頁面共用的「檢視月份」控制項：年/月選單 + 前後箭頭 + 回到最新月份 */
function setupAnalysisMonthControls(customerId, custSales) {
  const allMonths = allMonthsInData(); // 讓箭頭可自由前後翻，不受此客戶自己資料範圍侷限
  let years = Array.from(new Set(allMonths.map(mo => mo.y))).sort((a, b) => b - a);
  if (!years.includes(analysisSelectedYear)) years = [analysisSelectedYear, ...years].sort((a, b) => b - a);

  const yearSel = document.getElementById('analysisYearSelect');
  const monthSel = document.getElementById('analysisMonthSelect');
  const renderYearOptions = () => {
    yearSel.innerHTML = years.map(y => `<option value="${y}">${y} 年</option>`).join('');
    yearSel.value = String(analysisSelectedYear);
  };
  renderYearOptions();
  monthSel.innerHTML = Array.from({ length: 12 }, (_, i) => i + 1).map(mo => `<option value="${mo}">${mo} 月</option>`).join('');
  monthSel.value = String(analysisSelectedMonth);

  const goTo = (y, m) => {
    analysisSelectedYear = y;
    analysisSelectedMonth = m;
    if (!years.includes(y)) { years = [y, ...years].sort((a, b) => b - a); renderYearOptions(); }
    yearSel.value = String(y);
    monthSel.value = String(m);
    renderAnalysisMonthDependent(customerId, custSales);
  };

  yearSel.onchange = (e) => goTo(Number(e.target.value), analysisSelectedMonth);
  monthSel.onchange = (e) => goTo(analysisSelectedYear, Number(e.target.value));
  document.getElementById('analysisMonthPrev').onclick = () => { const p = prevMonth(analysisSelectedYear, analysisSelectedMonth); goTo(p.y, p.m); };
  document.getElementById('analysisMonthNext').onclick = () => { const n = analysisSelectedMonth === 12 ? { y: analysisSelectedYear + 1, m: 1 } : { y: analysisSelectedYear, m: analysisSelectedMonth + 1 }; goTo(n.y, n.m); };
  document.getElementById('analysisJumpLatest').onclick = () => {
    const months = allMonthsInData(); // 全系統目前最新月份，不是這位客戶自己最後叫貨的月份
    if (months.length) goTo(months[0].y, months[0].m);
  };
}

/* 隨「檢視月份」變化的所有區塊：KPI（當月狀態/當月銷貨）、趨勢圖、產品明細 */
function renderAnalysisMonthDependent(customerId, custSales) {
  const y = analysisSelectedYear, m = analysisSelectedMonth;
  const cmpLabel = analysisCompareMode === 'yoy' ? '去年同月' : '上月';
  const st = computeStatus(customerId, y, m, analysisCompareMode);

  // 這幾個是客戶「從有交易紀錄以來」的總覽數字，跟目前檢視哪個月無關，不隨月份變動
  const totalAll = custSales.reduce((a, s) => a + Number(s.amount || 0), 0);
  const monthsCount = new Set(custSales.map(s => monthKey(s.year, s.month))).size;
  const avgAll = monthsCount ? totalAll / monthsCount : 0;
  const firstOrder = custSales.length ? `${custSales[0].year}/${custSales[0].month}` : '—';
  const distinctProducts = new Set(custSales.map(s => s.productId || '')).size;
  const lastOrder = custSales.length ? custSales[custSales.length - 1] : null;
  const isCurrentIdle = st.current === 0; // 目前檢視月份沒有下單
  const lastOrderHint = (isCurrentIdle && lastOrder)
    ? `<div class="kpi-delta warn-text">最後叫貨：${lastOrder.year}/${lastOrder.month}</div>`
    : (isCurrentIdle && !lastOrder ? `<div class="kpi-delta warn-text">尚無任何交易紀錄</div>` : '');

  // 採購週期健康度：跟「客戶月度銷貨診斷」用同一套判斷函式，數字保證一致
  const cycleHealth = computePurchaseCycleHealth(y, m, custSales);
  let cycleValueHtml = '', cycleDeltaHtml = '';
  if (cycleHealth.status === 'none') {
    cycleValueHtml = `<span style="color:var(--muted);font-size:18px">尚無交易紀錄</span>`;
  } else if (cycleHealth.status === 'insufficient') {
    cycleValueHtml = `<span style="color:var(--muted);font-size:18px">資料不足</span>`;
    cycleDeltaHtml = `歷史交易不足3個月，無法判斷週期`;
  } else if (cycleHealth.status === 'current') {
    cycleValueHtml = `<span class="status-pill growth" style="font-size:14px">正常</span>`;
    cycleDeltaHtml = `本月有下單・平常約每 ${cycleHealth.avgGap.toFixed(1)} 個月下單一次`;
  } else if (cycleHealth.status === 'anomaly') {
    cycleValueHtml = `<span class="status-pill decline" style="font-size:14px">⚠ 異常</span>`;
    cycleDeltaHtml = `已超出平常週期 ${(cycleHealth.gap / cycleHealth.avgGap).toFixed(1)} 倍（平常約每 ${cycleHealth.avgGap.toFixed(1)} 個月下單一次）`;
  } else { // 'normal'
    cycleValueHtml = `<span class="status-pill stable" style="font-size:14px">正常</span>`;
    cycleDeltaHtml = `平常約每 ${cycleHealth.avgGap.toFixed(1)} 個月下單一次，還在正常範圍內`;
  }

  document.getElementById('analysisKpi').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">當月狀態（${y}/${m}）</div>
      <div class="kpi-value"><span class="status-pill ${st.status}" style="font-size:14px">${STATUS_LABEL[st.status]}</span></div>
      <div class="kpi-delta">${st.delta === null ? '—' : `較${cmpLabel} ` + fmtPct(st.delta)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">當月銷貨</div>
      <div class="kpi-value">$${fmtMoney(st.current)}</div>
      <div class="kpi-delta">${y} 年 ${m} 月</div>
      ${lastOrderHint}
    </div>
    <div class="kpi-card">
      <div class="kpi-label">歷史月均銷貨</div>
      <div class="kpi-value">$${fmtMoney(avgAll)}</div>
      <div class="kpi-delta">共 ${custSales.length} 筆交易・${distinctProducts} 項產品</div>
      <div class="kpi-delta">累計銷貨 $${fmtMoney(totalAll)}・自 ${firstOrder} 開始交易</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">採購週期健康度</div>
      <div class="kpi-value">${cycleValueHtml}</div>
      <div class="kpi-delta">${cycleDeltaHtml}</div>
    </div>
  `;

  renderAnalysisChart(customerId, y, m);
  renderAnalysisProductMix(customerId, y, m);
  renderAnalysisDiagnosis(customerId, y, m, custSales);
  renderAnalysisProductTable(customerId, y, m);

  document.querySelectorAll('#analysisProductMixModeToggle .segmented-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.mode === analysisProductMixMode);
    btn.onclick = () => {
      if (analysisProductMixMode === btn.dataset.mode) return;
      analysisProductMixMode = btn.dataset.mode;
      document.querySelectorAll('#analysisProductMixModeToggle .segmented-btn').forEach(b => b.classList.toggle('is-active', b.dataset.mode === analysisProductMixMode));
      renderAnalysisProductMix(customerId, y, m);
    };
  });

  document.getElementById('analysisProductStatusFilter').onchange = () => renderAnalysisProductTable(customerId, analysisSelectedYear, analysisSelectedMonth);
  document.getElementById('analysisProductSort').onchange = () => renderAnalysisProductTable(customerId, analysisSelectedYear, analysisSelectedMonth);
}

/* 在跨年份的月份交界處畫一條分隔虛線＋年份標籤（折線圖專用的內嵌 plugin，不需額外套件） */
function makeYearBoundaryPlugin(months) {
  return {
    id: 'yearBoundaryLine',
    afterDraw(chart) {
      const boundaryIndex = months.findIndex((mo, i) => i > 0 && mo.y !== months[i - 1].y);
      if (boundaryIndex <= 0) return;
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;
      if (!xScale || !yScale) return;
      const step = xScale.getPixelForValue(1) - xScale.getPixelForValue(0);
      const x = xScale.getPixelForValue(boundaryIndex) - step / 2;
      const ctx = chart.ctx;
      ctx.save();
      ctx.strokeStyle = 'rgba(107,118,132,0.45)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yScale.top);
      ctx.lineTo(x, yScale.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(85,97,112,0.9)';
      ctx.font = '10.5px "Noto Sans TC", sans-serif';
      ctx.fillText(`${months[boundaryIndex].y} 年 ▸`, x + 5, yScale.top + 12);
      ctx.restore();
    }
  };
}

function renderAnalysisChart(customerId, refY, refM) {
  const months = last12Months(refY, refM);
  const labels = months.map(mo => `${mo.y}/${mo.m}`);
  const data = months.map(mo => sumForMerged(customerId, mo.y, mo.m));
  const dataLastYear = months.map(mo => sumForMerged(customerId, mo.y - 1, mo.m));
  const hasLastYear = dataLastYear.some(v => v > 0);

  const CURRENT_YEAR_COLOR = '#2F6FED';   // 本年度：維持原本的品牌藍（深）
  const PRIOR_YEAR_COLOR = '#A9C4F5';     // 去年度：同色系但較淺（在同一個12個月視窗內跨年時使用）
  const STOPPED_COLOR = '#C0392B';        // 深紅：當月無交易，跟年份顏色無關，是另一種警示訊號

  const pointColors = months.map((mo, i) => data[i] === 0 ? STOPPED_COLOR : (mo.y === refY ? CURRENT_YEAR_COLOR : PRIOR_YEAR_COLOR));
  const pointRadii = data.map(v => v === 0 ? 4.5 : 3);

  const datasets = [{
    label: '本期', data,
    borderWidth: 2.5,
    // 線段依「後端那個點屬於今年還是去年」決定顏色，讓12個月視窗跨年時一眼可辨
    segment: { borderColor: (segCtx) => months[segCtx.p1DataIndex].y === refY ? CURRENT_YEAR_COLOR : PRIOR_YEAR_COLOR },
    pointRadius: pointRadii, pointHoverRadius: 6, pointBackgroundColor: pointColors, pointBorderColor: pointColors,
    fill: false, tension: 0.25
  }];
  if (hasLastYear) {
    datasets.push({
      label: '去年同期', data: dataLastYear,
      borderColor: '#9AA6B2', backgroundColor: 'transparent',
      borderWidth: 2, borderDash: [5, 4], pointRadius: 2.5, pointHoverRadius: 6, pointBackgroundColor: '#9AA6B2',
      fill: false, tension: 0.25
    });
  }

  const ctx = document.getElementById('analysisChart');
  if (analysisChartInstance) analysisChartInstance.destroy();
  analysisChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    plugins: [makeYearBoundaryPlugin(months)],
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true, position: 'top', align: 'end',
          onClick: () => {}, // 自訂圖例項目非一一對應資料集，停用預設的點擊切換行為
          labels: {
            boxWidth: 12, font: { size: 11 },
            generateLabels: (chart) => {
              const base = [
                { text: `本年度（${refY}）`, fillStyle: CURRENT_YEAR_COLOR, strokeStyle: CURRENT_YEAR_COLOR, lineWidth: 0 },
                { text: `去年度（${refY - 1}）`, fillStyle: PRIOR_YEAR_COLOR, strokeStyle: PRIOR_YEAR_COLOR, lineWidth: 0 }
              ];
              if (hasLastYear) base.push({ text: '去年同期比較', fillStyle: '#9AA6B2', strokeStyle: '#9AA6B2', lineWidth: 0 });
              return base;
            }
          }
        },
        tooltip: {
          mode: 'index', intersect: false,
          callbacks: {
            title: function (items) {
              if (!items.length) return '';
              // 兩條線共用同一個 x 軸位置，標題統一用「本期」那個月份代表這個位置，各線實際年份在下面 label 各自標明
              const mo = months[items[0].dataIndex];
              return `${mo.y}/${mo.m}`;
            },
            label: function (item) {
              const mo = months[item.dataIndex];
              const actualLabel = item.datasetIndex === 1 ? `${mo.y - 1}/${mo.m}` : `${mo.y}/${mo.m}`;
              return `${item.dataset.label}（${actualLabel}）：$${fmtMoney(item.parsed.y)}`;
            }
          }
        }
      },
      scales: { y: { beginAtZero: true, ticks: { callback: v => '$' + (v / 1000) + 'k' } }, x: { grid: { display: false } } }
    }
  });
}

/* 品項集中度：近12個月依產品彙總，取前6大＋其他，甜甜圈圖 */
let analysisProductMixChartInstance = null;
let analysisProductMixMode = 'amount'; // 'amount' 依金額｜'frequency' 依回購月數
const MIX_SLICE_COLORS = ['#2F6FED', '#5B93F5', '#7FB0FF', '#A6C6FB', '#1E9E6A', '#6BC79A', '#F0A83A', '#F5C27A', '#8A6FE0', '#B49CEF'];
const MIX_OTHER_COLOR = '#C7CDD6';
const MIX_TOP_N = 10; // 切割顆粒度：前10大產品各自畫一塊，其餘歸為「其他」

function renderAnalysisProductMix(customerId, refY, refM) {
  const months = last12Months(refY, refM);
  const memberIds = getMergedMemberIds(getRootId(customerId));
  const byProduct = {}; // pid -> { amount, monthsPurchased: Set(monthKey) }
  let totalAmount = 0;
  months.forEach(mo => {
    const k = monthKey(mo.y, mo.m);
    memberIds.forEach(id => {
      const entry = salesIndex.byCustomer.get(id);
      const mEntry = entry && entry.monthly.get(k);
      if (mEntry) mEntry.byProduct.forEach((amt, pid) => {
        if (!byProduct[pid]) byProduct[pid] = { amount: 0, monthsPurchased: new Set() };
        byProduct[pid].amount += amt;
        byProduct[pid].monthsPurchased.add(k);
        totalAmount += amt;
      });
    });
  });

  const summaryEl = document.getElementById('analysisProductMixSummary');
  const ctx = document.getElementById('analysisProductMixChart');
  if (analysisProductMixChartInstance) { analysisProductMixChartInstance.destroy(); analysisProductMixChartInstance = null; }

  const productIds = Object.keys(byProduct);
  if (totalAmount <= 0 || productIds.length === 0) {
    summaryEl.textContent = '近12個月沒有交易資料';
    ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
    return;
  }

  const isFreq = analysisProductMixMode === 'frequency';
  // 依金額：金額由高到低；依頻率：回購月數由多到少（月數相同時再依金額排序當次要依據）
  const entries = productIds
    .map(pid => ({ pid, amount: byProduct[pid].amount, months: byProduct[pid].monthsPurchased.size }))
    .sort((a, b) => isFreq ? (b.months - a.months || b.amount - a.amount) : (b.amount - a.amount));

  const valueOf = (e) => isFreq ? e.months : e.amount;

  const topN = entries.slice(0, MIX_TOP_N);
  const rest = entries.slice(MIX_TOP_N);
  const restValue = rest.reduce((a, e) => a + valueOf(e), 0);

  const labels = topN.map(e => productName(e.pid));
  const data = topN.map(e => valueOf(e));
  const colors = topN.map((_, i) => MIX_SLICE_COLORS[i % MIX_SLICE_COLORS.length]);
  if (restValue > 0) { labels.push('其他'); data.push(restValue); colors.push(MIX_OTHER_COLOR); }

  if (isFreq) {
    const topProductText = entries.length > 0 ? `最常回購「${productName(entries[0].pid)}」（近12個月買了${entries[0].months}個月）` : '';
    summaryEl.textContent = `依回購月數排序・共 ${entries.length} 項產品・${topProductText}`;
  } else {
    const topNSum = topN.reduce((a, e) => a + e.amount, 0);
    const concentrationPct = topNSum / totalAmount;
    summaryEl.textContent = `前 ${topN.length} 大產品佔營收 ${fmtPctAbs(concentrationPct)}（近12個月・共 ${entries.length} 項產品）`;
  }

  analysisProductMixChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10.5 }, padding: 8 } },
        tooltip: {
          callbacks: {
            label: (item) => {
              if (isFreq) {
                const v = item.parsed;
                return ` 近12個月買了 ${v} 個月（共${months.length}個月）`;
              }
              const v = item.parsed;
              const pct = totalAmount > 0 ? (v / totalAmount * 100).toFixed(1) : 0;
              return ` $${fmtMoney(v)}（${pct}%）`;
            }
          }
        }
      }
    }
  });
}

/* =========================================================
   客戶月度銷貨診斷（單一客戶，五段式敘述）
   ========================================================= */

function monthKeyDiff(y1, m1, y2, m2) { return (y2 * 12 + m2) - (y1 * 12 + m1); }

/* 採購週期健康度：判斷「這位客戶目前的下單間隔，相對於他自己過去的節奏算不算正常」。
   只用「檢視月份」當下、以及當下之前的購買紀錄計算，不看之後才發生的購買（避免看歷史月份時被未來資料影響判斷）。
   status: 'none'（尚無交易）｜'insufficient'（歷史不足3個月，抓不出規律）｜'current'（當月就有下單）｜
           'normal'（沒下單但還在正常範圍內）｜'anomaly'（沒下單且已超過平常週期1.5倍）
   這個函式同時被「採購週期健康度」KPI卡片與「客戶月度銷貨診斷」段落使用，確保兩邊數字一致，不會各算各的。 */
function computePurchaseCycleHealth(y, m, custSales) {
  const selectedKey = monthKey(y, m);
  const allMonthKeys = Array.from(new Set(custSales.map(s => monthKey(s.year, s.month)))).sort((a, b) => a - b);
  const monthKeysUpToSelected = allMonthKeys.filter(k => k <= selectedKey);

  if (allMonthKeys.length === 0 || monthKeysUpToSelected.length === 0) return { status: 'none' };
  if (monthKeysUpToSelected.length < 3) return { status: 'insufficient' };

  const gaps = [];
  for (let i = 1; i < monthKeysUpToSelected.length; i++) {
    const py = Math.floor(monthKeysUpToSelected[i - 1] / 100), pm = monthKeysUpToSelected[i - 1] % 100;
    const cy = Math.floor(monthKeysUpToSelected[i] / 100), cm = monthKeysUpToSelected[i] % 100;
    gaps.push(monthKeyDiff(py, pm, cy, cm));
  }
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

  const lastKey = monthKeysUpToSelected[monthKeysUpToSelected.length - 1];
  const ly = Math.floor(lastKey / 100), lm = lastKey % 100;
  const gap = monthKeyDiff(ly, lm, y, m);

  if (gap === 0) return { status: 'current', avgGap };

  const isAnomaly = avgGap > 0 && gap > avgGap * 1.5 && gap >= 2;
  return { status: isAnomaly ? 'anomaly' : 'normal', avgGap, gap };
}

function renderAnalysisDiagnosis(customerId, y, m, custSales) {
  const cmpLabel = analysisCompareMode === 'yoy' ? '去年同月' : '上月';
  const custSt = computeStatus(customerId, y, m, analysisCompareMode);
  const selectedKey = monthKey(y, m);

  // 依產品彙總近12個月金額與購買月份紀錄，供多個判斷共用
  const months12 = last12Months(y, m);
  const byProduct = {}; // pid -> { total12, monthsSet(monthKey), firstMonth, lastMonth }
  custSales.forEach(s => {
    const pid = s.productId || '';
    if (!byProduct[pid]) byProduct[pid] = { total12: 0, months: new Set(), firstMonth: null, lastMonth: null };
    const rec = byProduct[pid];
    const k = monthKey(s.year, s.month);
    rec.months.add(k);
    if (rec.firstMonth === null || k < rec.firstMonth) rec.firstMonth = k;
    if (rec.lastMonth === null || k > rec.lastMonth) rec.lastMonth = k;
    if (months12.some(mo => mo.y === s.year && mo.m === s.month)) rec.total12 += Number(s.amount || 0);
  });
  const total12All = Object.values(byProduct).reduce((a, r) => a + r.total12, 0);
  const productIds = Object.keys(byProduct);

  /* ---- 候選事件清單（每個事件帶一個「影響力分數」供排序，最後只取前5個） ---- */
  const events = []; // { score, direction:'good'|'bad'|'neutral', text }

  // 產品層級增減
  productIds.forEach(pid => {
    const st = computeProductStatus(customerId, pid, y, m, analysisCompareMode);
    const delta = st.current - st.previous;
    if (Math.abs(delta) < 300) return; // 過濾雜訊
    const pct = st.previous > 0 ? (delta / st.previous) : null;
    const share = total12All > 0 ? byProduct[pid].total12 / total12All : 0;
    const shareNote = share >= 0.15 ? `，此品項約佔近12個月營收${(share * 100).toFixed(0)}%` : '';
    const pctNote = pct !== null ? `（${pct >= 0 ? '+' : ''}${(pct * 100).toFixed(0)}%）` : '';
    events.push({
      score: Math.abs(delta),
      direction: delta > 0 ? 'good' : 'bad',
      text: `${productName(pid)}${delta > 0 ? '增加' : '減少'} $${fmtMoney(Math.abs(delta))}${pctNote}${shareNote}`
    });
  });

  // 連續成長／下滑
  const growthStreak = computeMomStreak(customerId, y, m, 'growth');
  const declineStreak = computeMomStreak(customerId, y, m, 'decline');
  if (growthStreak >= 3) {
    events.push({ score: custSt.current * (growthStreak / 3), direction: 'good', text: `客戶已連續 ${growthStreak} 個月成長` });
  }
  if (declineStreak >= 3) {
    events.push({ score: custSt.previous * (declineStreak / 3), direction: 'bad', text: `客戶已連續 ${declineStreak} 個月下滑` });
  }

  // 品項流失（過去穩定購買，但已連續2個月以上沒再買）
  const churned = Object.entries(byProduct).filter(([pid, rec]) => {
    if (rec.months.size < 2 || rec.lastMonth > selectedKey) return false;
    const ly = Math.floor(rec.lastMonth / 100), lm = rec.lastMonth % 100;
    return monthKeyDiff(ly, lm, y, m) >= 2;
  }).sort((a, b) => b[1].total12 - a[1].total12);
  const hasChurn = churned.length > 0;
  if (hasChurn) {
    const churnSum = churned.reduce((a, [, r]) => a + r.total12, 0);
    events.push({
      score: churnSum,
      direction: 'bad',
      text: `${churned.length} 項過去常買的產品已連續2個月以上未購買（${churned.slice(0, 3).map(([pid]) => productName(pid)).join('、')}${churned.length > 3 ? '等' : ''}）`
    });
  }

  // 營收集中度過高
  const sorted12 = Object.entries(byProduct).sort((a, b) => b[1].total12 - a[1].total12);
  const top2Sum = sorted12.slice(0, 2).reduce((a, [, r]) => a + r.total12, 0);
  const top2Pct = total12All > 0 ? top2Sum / total12All : 0;
  const hasConcentration = total12All > 0 && sorted12.length >= 2 && top2Pct >= 0.70;
  if (hasConcentration) {
    events.push({
      score: top2Sum * 0.6,
      direction: 'neutral',
      text: `營收過度集中在前2大產品（${sorted12.slice(0, 2).map(([pid]) => productName(pid)).join('、')}，合計佔${fmtPctAbs(top2Pct)}）`
    });
  }

  // 新品項導入成功
  const newProducts = Object.entries(byProduct).filter(([pid, rec]) => {
    const fy = Math.floor(rec.firstMonth / 100), fm = rec.firstMonth % 100;
    const monthsSinceFirst = monthKeyDiff(fy, fm, y, m);
    return monthsSinceFirst >= 0 && monthsSinceFirst <= 2 && rec.months.has(selectedKey);
  });
  const hasNewProduct = newProducts.length > 0;
  if (hasNewProduct) {
    const newSum = newProducts.reduce((a, [pid]) => a + sumForProductMerged(customerId, pid, y, m), 0);
    events.push({
      score: newSum,
      direction: 'good',
      text: `${newProducts.length} 項新產品近3個月內成功導入，本月仍持續下單（${newProducts.slice(0, 3).map(([pid]) => productName(pid)).join('、')}）`
    });
  }

  // 採購週期異常（改用共用函式，跟上方「採購週期健康度」KPI卡片同一套算法，數字保證一致）
  const custMonthKeys = Array.from(new Set(custSales.map(s => monthKey(s.year, s.month)))).sort((a, b) => a - b);
  const cycleHealth = computePurchaseCycleHealth(y, m, custSales);
  const hasCycleAnomaly = cycleHealth.status === 'anomaly';
  if (hasCycleAnomaly) {
    events.push({
      score: custSt.previous || (total12All / 12),
      direction: 'bad',
      text: `距上次下單已 ${cycleHealth.gap} 個月，平常約每 ${cycleHealth.avgGap.toFixed(1)} 個月下單一次`
    });
  }

  // 回升客戶
  let hasRecovered = false;
  {
    const prevGapEnd = prevMonth(y, m);
    const hadRecentOrder = custSt.current > 0 || sumForMerged(customerId, prevGapEnd.y, prevGapEnd.m) > 0;
    if (hadRecentOrder && custMonthKeys.length >= 2) {
      for (let i = 1; i < custMonthKeys.length; i++) {
        if (custMonthKeys[i] > selectedKey) break;
        const py = Math.floor(custMonthKeys[i - 1] / 100), pm = custMonthKeys[i - 1] % 100;
        const cy = Math.floor(custMonthKeys[i] / 100), cm = custMonthKeys[i] % 100;
        if (monthKeyDiff(py, pm, cy, cm) >= 3) { hasRecovered = true; break; }
      }
      if (hasRecovered) {
        events.push({ score: custSt.current, direction: 'good', text: '此客戶曾有長期空窗期，近期已重新下單' });
      }
    }
  }

  /* ---- 排序，取前5個真正夠格的變化（不硬湊） ---- */
  events.sort((a, b) => b.score - a.score);
  const topEvents = events.slice(0, 5);

  /* ---- 1. 當月銷貨總結 ---- */
  const summaryEl = document.getElementById('diagSummary');
  if (custSt.current === 0 && custSt.previous === 0 && custMonthKeys.length === 0) {
    summaryEl.textContent = '此客戶目前尚無任何交易紀錄。';
  } else if (custSt.delta === null) {
    summaryEl.textContent = `本月銷貨 $${fmtMoney(custSt.current)}，較${cmpLabel}無資料可比較。`;
  } else {
    const dirWord = custSt.delta >= 0 ? '成長' : '下滑';
    const driver = topEvents.length > 0 ? `，主要因「${topEvents[0].text.split('（')[0].split('，')[0]}」所致` : '';
    summaryEl.textContent = `本月銷貨 $${fmtMoney(custSt.current)}，較${cmpLabel}${dirWord} ${fmtPctAbs(Math.abs(custSt.delta))}${driver}。`;
  }

  /* ---- 2. 主要變化 ---- */
  const changesEl = document.getElementById('diagChanges');
  if (topEvents.length === 0) {
    changesEl.innerHTML = `<div class="empty-mini">本期沒有偵測到值得留意的變化</div>`;
  } else {
    changesEl.innerHTML = `<div class="diagnosis-list">${topEvents.map(ev =>
      `<div class="diagnosis-item"><span class="diagnosis-dot ${ev.direction}"></span><span>${escapeHtml(ev.text)}</span></div>`
    ).join('')}</div>`;
  }

  /* ---- 3/4/5. 原因、需確認資料、建議行動（依整體狀態＋偵測到的旗標套用對應模板） ---- */
  const causes = [];
  const checks = [];
  const actions = [];

  if (custSt.status === 'decline' || custSt.status === 'stopped') {
    causes.push('主力品項相關工程專案可能已結束或進入淡季');
    causes.push('客戶可能轉單其他供應商或調整採購週期');
    checks.push('請業務確認客戶近期工程專案進度');
    checks.push('請確認主要下滑產品近期庫存與報價狀況');
    actions.push(`本週安排業務致電或拜訪，了解${custSt.status === 'stopped' ? '停止下單' : '訂單減少'}原因`);
    actions.push('列入下月追蹤名單，觀察是否持續下滑');
  } else if (custSt.status === 'growth' || custSt.status === 'new') {
    causes.push('客戶可能有新專案啟動或訂單需求增加');
    checks.push('請確認客戶近期是否有新專案或擴大採購計畫');
    checks.push('請確認目前產能／庫存是否能穩定供應此客戶需求');
    actions.push('掌握成長動能，評估是否可加碼推廣相關品項');
    actions.push('維持穩定交期與服務品質，鞏固客戶關係');
  } else {
    causes.push('客戶採購狀況穩定，無明顯異常波動');
    actions.push('維持現有服務節奏，定期關注即可');
  }

  if (hasConcentration) {
    causes.push('營收過度集中在少數品項，單一產品波動就會直接拉動整體表現');
    checks.push('請確認前2大產品的訂單是否有異動風險');
    actions.push('評估分散品項組合，降低單一產品依賴風險');
  }
  if (hasChurn) {
    causes.push('部分過去常買的品項可能已被其他供應商取代，或該應用場景需求已結束');
    checks.push('請確認流失品項是否有替代方案或競品切入');
  }
  if (hasCycleAnomaly) {
    checks.push('請確認客戶採購窗口或聯繫窗口是否異動');
  }
  if (hasNewProduct) {
    causes.push('新導入品項獲得客戶採用，可能是成長的重要來源');
    actions.push('追蹤新品項後續採購穩定度，評估擴大導入其他品項');
  }
  if (hasRecovered) {
    causes.push('客戶先前有一段空窗期，近期恢復下單，可能有新的採購需求出現');
    checks.push('請確認此次回購是單次性訂單，還是穩定恢復合作關係');
    actions.push('掌握回購原因，評估是否可加碼經營');
  }

  const listOrEmpty = (arr, emptyText) => arr.length === 0
    ? `<div class="empty-mini">${emptyText}</div>`
    : `<div class="diagnosis-list">${arr.map(t => `<div class="diagnosis-item"><span class="diagnosis-dot neutral"></span><span>${escapeHtml(t)}</span></div>`).join('')}</div>`;

  document.getElementById('diagCauses').innerHTML = listOrEmpty(causes, '目前沒有特別的假設原因');
  document.getElementById('diagChecks').innerHTML = listOrEmpty(checks, '目前沒有特別需要確認的項目');
  document.getElementById('diagActions').innerHTML = listOrEmpty(actions, '維持現有服務節奏即可');
}

function renderAnalysisProductTable(customerId, y, m) {
  const cmpLabel = analysisCompareMode === 'yoy' ? '去年同月' : '上月';
  document.getElementById('analysisProductPrevHeader').textContent = `${cmpLabel}金額`;
  const body = document.getElementById('analysisProductBody');
  const statusFilter = document.getElementById('analysisProductStatusFilter').value;
  const sortMode = document.getElementById('analysisProductSort').value;
  const custSales = salesForMergedCustomer(customerId);
  const productIds = Array.from(new Set(custSales.map(s => s.productId || '')));

  let rows = productIds.map(pid => ({ pid, st: computeProductStatus(customerId, pid, y, m, analysisCompareMode) }))
    .filter(r => r.st.status !== 'no-data');
  if (statusFilter) rows = rows.filter(r => r.st.status === statusFilter);

  if (sortMode === 'nameStroke') {
    rows.sort((a, b) => strokeCompare(productName(a.pid), productName(b.pid)));
  } else {
    rows.sort((a, b) => {
      const order = { decline: 0, stopped: 1, growth: 2, stable: 3, new: 4 };
      return order[a.st.status] - order[b.st.status] || b.st.current - a.st.current;
    });
  }

  if (rows.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="empty-mini">此客戶在 ${y} 年 ${m} 月沒有符合條件的產品交易紀錄</td></tr>`;
    return;
  }
  body.innerHTML = rows.map(r => {
    const trendClass = r.st.status === 'growth' ? 'trend-up' : r.st.status === 'decline' ? 'trend-down' : '';
    return `<tr>
      <td>${escapeHtml(productLabel(r.pid))}</td>
      <td><span class="status-pill ${r.st.status}">${STATUS_LABEL_PRODUCT[r.st.status]}</span></td>
      <td class="num-cell">$${fmtMoney(r.st.previous)}</td>
      <td class="num-cell">$${fmtMoney(r.st.current)}</td>
      <td class="num-cell ${trendClass}">${r.st.delta === null ? '—' : fmtPct(r.st.delta)}</td>
    </tr>`;
  }).join('');
}

/* =========================================================
   備份匯出 / 還原
   ========================================================= */

/* 檢查目前瀏覽器 localStorage 實際使用量，協助判斷是否接近容量上限（一般約 5-10MB，依瀏覽器而定） */
async function checkStorageUsage() {
  // 本系統資料量（概估）：客戶／產品／銷貨／業務資料序列化後的大小
  const ourChars = JSON.stringify(customers).length + JSON.stringify(products).length + JSON.stringify(sales).length + JSON.stringify(reps).length;
  const ourMB = (ourChars * 2 / 1024 / 1024).toFixed(2); // UTF-16 概估：每字元約 2 bytes

  let usageMB = null, quotaMB = null, pct = null;
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      if (est.usage !== undefined) usageMB = (est.usage / 1024 / 1024).toFixed(2);
      if (est.quota !== undefined) quotaMB = (est.quota / 1024 / 1024).toFixed(0);
      if (est.usage !== undefined && est.quota) pct = Math.round(est.usage / est.quota * 100);
    } catch (e) { /* 部分瀏覽器不支援，忽略即可 */ }
  }

  const noteText = usageMB !== null ? `儲存用量約 ${usageMB} MB` : `本系統資料約 ${ourMB} MB`;
  document.getElementById('storageUsageNote').textContent = noteText;

  let msg = `【儲存空間使用狀況（IndexedDB）】\n\n`;
  msg += `本系統資料量：約 ${ourMB} MB（客戶 ${customers.length} 位、產品 ${products.length} 項、銷貨紀錄 ${sales.length} 筆）\n`;
  if (usageMB !== null) {
    msg += `瀏覽器回報此網站總用量：約 ${usageMB} MB\n`;
    if (quotaMB !== null) msg += `瀏覽器配額上限：約 ${quotaMB} MB${pct !== null ? `（已用 ${pct}%）` : ''}\n`;
  } else {
    msg += `（此瀏覽器不支援查詢詳細用量，僅顯示本系統資料的概估大小）\n`;
  }
  msg += `\n目前使用 IndexedDB 儲存，容量上限通常是幾百MB到數GB，一般不會再遇到像 localStorage 那樣容易存滿的問題。`;

  alert(msg);
}

function exportBackup() {
  const payload = { customers, products, sales, reps, exportedAt: new Date().toISOString(), version: 3 };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `客戶銷貨資料備份_${today}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('已匯出備份檔');
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const payload = JSON.parse(e.target.result);
      if (!Array.isArray(payload.customers) || !Array.isArray(payload.sales)) throw new Error('格式錯誤');
      const prodCount = Array.isArray(payload.products) ? payload.products.length : 0;
      const repCount = Array.isArray(payload.reps) ? payload.reps.length : 0;
      const repNote = Array.isArray(payload.reps) ? `、${repCount} 個業務/區域` : '（此備份檔為舊版格式，不含業務/區域清單，客戶的業務指派可能會顯示未指定）';
      if (!confirm(`此備份檔包含 ${payload.customers.length} 位客戶、${prodCount} 項產品、${payload.sales.length} 筆銷貨紀錄${repNote}，還原將覆蓋目前所有資料，確定要還原嗎？`)) return;
      customers = payload.customers;
      products = Array.isArray(payload.products) ? payload.products : [];
      sales = payload.sales;
      reps = Array.isArray(payload.reps) ? payload.reps : [];
      saveCustomers(); saveProducts(); saveSales(); saveReps();
      showToast('已還原備份資料');
      refreshCurrentPage();
    } catch (err) {
      showToast('備份檔格式錯誤，無法還原');
    }
  };
  reader.readAsText(file);
}

/* =========================================================
   歷年趨勢比較（多客戶拖拉選擇 + 自訂區間）
   ========================================================= */

const TREND_PALETTE = ['#2F6FED', '#1E9E6A', '#E08B2F', '#E0483E', '#8B5FBF', '#2AA8C4', '#C77DA0', '#5B8C3A', '#D4A017', '#4A6FA5'];
const TREND_MAX_PRODUCT_SELECTION = 8;

let trendsState = {
  category: null,
  search: '',
  compareUnit: 'product', // 'product' | 'category'
  selectedIds: [],           // 目前作用中的選擇清單（依 compareUnit 而定，內容是客戶id、產品id或分類名稱）
  _stash: { product: null, category: [] }, // 切換比較單位時，暫存另一邊的選擇，避免互相清空
  compareMode: 'continuous', // 'continuous' | 'recurring'
  granularity: 'year',
  metric: 'amount',
  startYear: null, startMonth: 1,
  endYear: null, endMonth: 12,
  activePreset: 'thisYear',
  recurStartMonth: 1, recurEndMonth: 6,
  recurStartYear: null, recurEndYear: null,
  showSum: false,
  // 單一客戶深入模式（依客戶模式下，剛好選了1位客戶時自動進入）：
  deepDiveCustomerId: null,     // 設定時代表目前是深入模式，selectedIds 這時放的是「產品id」而不是「客戶id」
  deepDiveProductCategory: null, // 深入模式下，目前選的產品分類
  forceCustomerBrowse: false,   // 使用者按過「＋加入其他客戶比較」後為 true，暫時阻止自動再跳回深入模式
};
trendsState._stash.product = trendsState.selectedIds;
let trendCompareChartInstance = null;

function getTrendMaxSelection() {
  return trendsState.compareUnit === 'category' ? getAllCustomerRepGroups().length : TREND_MAX_PRODUCT_SELECTION;
}

function switchTrendCompareUnit(newUnit) {
  if (newUnit === trendsState.compareUnit) return;
  if (trendsState.compareUnit === 'product' && trendsState.deepDiveCustomerId) {
    // 切換比較單位前，先把深入模式裡的客戶放回選擇清單，避免這位客戶的選取狀態憑空消失
    trendsState.selectedIds = [trendsState.deepDiveCustomerId];
    trendsState.deepDiveCustomerId = null;
    trendsState.deepDiveProductCategory = null;
  }
  trendsState._stash[trendsState.compareUnit] = trendsState.selectedIds;
  trendsState.compareUnit = newUnit;
  trendsState.selectedIds = trendsState._stash[newUnit] || [];
  trendsState._stash[newUnit] = trendsState.selectedIds;
  renderTrendsPage();
}

/* 選取內容有變動時（新增/移除客戶或產品）呼叫：若「依客戶」模式下剛好只剩1位客戶、且目前不是深入模式，
   自動切換成單一客戶深入模式（把這位客戶移出 selectedIds，改放進 deepDiveCustomerId，讓 selectedIds 空出來給產品用）。
   只有在使用者沒有主動要求維持瀏覽客戶清單（forceCustomerBrowse）時才會自動觸發。 */
function maybeAutoToggleDeepDive() {
  if (trendsState.compareUnit !== 'product') return;
  if (trendsState.forceCustomerBrowse) return;
  if (!trendsState.deepDiveCustomerId && trendsState.selectedIds.length === 1) {
    trendsState.deepDiveCustomerId = trendsState.selectedIds[0];
    trendsState.selectedIds = [];
    trendsState.deepDiveProductCategory = null;
    trendsState.search = '';
  }
}

/* 「＋加入其他客戶比較」：離開深入模式，把原本分析的客戶放回選擇清單第一位，
   左側面板切回客戶瀏覽，讓使用者可以再加其他客戶進行一般的客戶vs客戶比較 */
function exitTrendDeepDive() {
  if (!trendsState.deepDiveCustomerId) return;
  const anchorId = trendsState.deepDiveCustomerId;
  trendsState.deepDiveCustomerId = null;
  trendsState.deepDiveProductCategory = null;
  trendsState.selectedIds = [anchorId];
  trendsState.category = null;
  trendsState.search = '';
  trendsState.forceCustomerBrowse = true;
  trendCustomerListOpen = false;
  const searchInput = document.getElementById('trendProductSearch');
  if (searchInput) searchInput.value = '';
  showToast('已清空產品選擇，改為客戶比較模式');
  renderTrendsPage();
}

/* 「✕ 清除，重新選擇」：完全放棄目前分析的客戶與已選產品，回到空白的客戶清單，方便換另一位客戶重新開始 */
function clearTrendDeepDive() {
  if (!trendsState.deepDiveCustomerId) return;
  trendsState.deepDiveCustomerId = null;
  trendsState.deepDiveProductCategory = null;
  trendsState.selectedIds = [];
  trendsState.category = null;
  trendsState.search = '';
  trendCustomerListOpen = false;
  const searchInput = document.getElementById('trendProductSearch');
  if (searchInput) searchInput.value = '';
  renderTrendsPage();
}

/* 依「比較單位」取得顯示用的標題／副標題／數值，讓圖表與表格程式碼不用分別處理客戶與分類兩種情況。
   注意：這裡的 id 一律是「主帳號」客戶 id，數值一律用「合併加總」版本（sumForMerged/sumQtyForMerged），
   跟 Dashboard、客戶分析頁的合併邏輯保持一致，避免同一位客戶因為有多個編號而被拆開計算。
   單一客戶深入模式時（deepDiveCustomerId 有值），selectedIds 放的是「產品id」，這裡 id 就要解讀成產品。 */
function getSelectionLabel(id) {
  if (trendsState.compareUnit === 'product' && trendsState.deepDiveCustomerId) return productName(id);
  if (trendsState.compareUnit === 'category') return repGroupLabel(id);
  const c = customers.find(c => c.id === id);
  return c ? c.name : '（已刪除客戶）';
}
function getSelectionSubLabel(id) {
  if (trendsState.compareUnit === 'product' && trendsState.deepDiveCustomerId) {
    const p = products.find(p => p.id === id);
    return p && p.code ? p.code : (p && p.category ? p.category : '—');
  }
  if (trendsState.compareUnit === 'category') {
    const cnt = getRootCustomers().filter(c => customerRepGroupKey(c) === id).length;
    return `${cnt}位客戶`;
  }
  return pulseCodeCell(id);
}
function getSelectionValue(id, period, metric) {
  if (trendsState.compareUnit === 'product' && trendsState.deepDiveCustomerId) {
    return getProductPeriodValue(trendsState.deepDiveCustomerId, id, period, metric);
  }
  if (trendsState.compareUnit === 'category') {
    return getRootCustomers().filter(c => customerRepGroupKey(c) === id)
      .reduce((sum, c) => sum + getPeriodValue(c.id, period, metric), 0);
  }
  return getPeriodValue(id, period, metric);
}
function getProductPeriodValue(customerId, productId, period, metric) {
  const fn = metric === 'amount' ? sumForProductMerged : sumProductQtyForMerged;
  let sum = 0;
  for (let m = period.mStart; m <= period.mEnd; m++) sum += fn(customerId, productId, period.y, m);
  return sum;
}

function initTrendsDefaults() {
  const latest = getLatestDataMonth();
  trendsState.startYear = latest.y; trendsState.startMonth = 1;
  trendsState.endYear = latest.y; trendsState.endMonth = 12;
  trendsState.granularity = 'month';
  trendsState.activePreset = 'thisYear';
  trendsState.recurStartMonth = 1; trendsState.recurEndMonth = 6;
  trendsState.recurEndYear = latest.y;
  trendsState.recurStartYear = latest.y - 1;
}

function applyTrendPreset(preset) {
  const latest = getLatestDataMonth();
  trendsState.activePreset = preset;
  if (preset === 'max') {
    const earliest = getEarliestDataMonth();
    trendsState.startYear = earliest.y; trendsState.startMonth = 1;
    trendsState.endYear = latest.y; trendsState.endMonth = 12;
    trendsState.granularity = 'year';
  } else if (preset === 'thisYear') {
    trendsState.startYear = latest.y; trendsState.startMonth = 1;
    trendsState.endYear = latest.y; trendsState.endMonth = 12;
    trendsState.granularity = 'month';
  } else if (preset === 'lastYear') {
    trendsState.startYear = latest.y - 1; trendsState.startMonth = 1;
    trendsState.endYear = latest.y - 1; trendsState.endMonth = 12;
    trendsState.granularity = 'month';
  } else if (preset === 'h1') {
    trendsState.startYear = latest.y; trendsState.startMonth = 1;
    trendsState.endYear = latest.y; trendsState.endMonth = 6;
    trendsState.granularity = 'month';
  } else if (preset === 'h2') {
    trendsState.startYear = latest.y; trendsState.startMonth = 7;
    trendsState.endYear = latest.y; trendsState.endMonth = 12;
    trendsState.granularity = 'month';
  } else if (preset === 'last12months') {
    trendsState.endYear = latest.y; trendsState.endMonth = latest.m;
    let y = latest.y, m = latest.m;
    for (let i = 0; i < 11; i++) { const pm = prevMonth(y, m); y = pm.y; m = pm.m; }
    trendsState.startYear = y; trendsState.startMonth = m;
    trendsState.granularity = 'month';
  }
  renderTrendsPage();
}

function populateTrendYearMonthSelects() {
  const years = new Set(allMonthsInData().map(mo => mo.y));
  years.add(trendsState.startYear); years.add(trendsState.endYear);
  years.add(trendsState.recurStartYear); years.add(trendsState.recurEndYear);
  years.add(new Date().getFullYear());
  const yearArr = Array.from(years).sort((a, b) => a - b);
  const monthOpts = Array.from({ length: 12 }, (_, i) => i + 1).map(m => `<option value="${m}">${m}月</option>`).join('');
  const yearOpts = yearArr.map(y => `<option value="${y}">${y}</option>`).join('');

  document.getElementById('trendStartYear').innerHTML = yearOpts;
  document.getElementById('trendStartYear').value = trendsState.startYear;
  document.getElementById('trendStartMonth').innerHTML = monthOpts;
  document.getElementById('trendStartMonth').value = trendsState.startMonth;
  document.getElementById('trendEndYear').innerHTML = yearOpts;
  document.getElementById('trendEndYear').value = trendsState.endYear;
  document.getElementById('trendEndMonth').innerHTML = monthOpts;
  document.getElementById('trendEndMonth').value = trendsState.endMonth;

  document.getElementById('trendRecurStartMonth').innerHTML = monthOpts;
  document.getElementById('trendRecurStartMonth').value = trendsState.recurStartMonth;
  document.getElementById('trendRecurEndMonth').innerHTML = monthOpts;
  document.getElementById('trendRecurEndMonth').value = trendsState.recurEndMonth;
  document.getElementById('trendRecurStartYear').innerHTML = yearOpts;
  document.getElementById('trendRecurStartYear').value = trendsState.recurStartYear;
  document.getElementById('trendRecurEndYear').innerHTML = yearOpts;
  document.getElementById('trendRecurEndYear').value = trendsState.recurEndYear;
}

/* 依「比較模式」產生期間清單：
   - continuous（連續區間）：依起訖年月＋顆粒度，產生連續的年度或月度期間
   - recurring（跨年同期比較）：同一段月份區間（例如1~6月），套用在多個年份上，各自加總，
     用來回答「比較兩年的上半年度」這類跨年同期比較的需求 */
function getTrendPeriods() {
  if (trendsState.compareMode === 'recurring') {
    const periods = [];
    if (trendsState.recurStartYear == null || trendsState.recurEndYear == null) return periods;
    const sY = Math.min(trendsState.recurStartYear, trendsState.recurEndYear);
    const eY = Math.max(trendsState.recurStartYear, trendsState.recurEndYear);
    const sM = trendsState.recurStartMonth, eM = trendsState.recurEndMonth;
    for (let y = sY; y <= eY; y++) {
      periods.push({ key: `${y}年（${sM}~${eM}月）`, y, mStart: sM, mEnd: eM });
    }
    return periods;
  }

  const periods = [];
  const startKey = trendsState.startYear * 100 + trendsState.startMonth;
  const endKey = trendsState.endYear * 100 + trendsState.endMonth;
  if (startKey > endKey) return periods;

  if (trendsState.granularity === 'year') {
    for (let y = trendsState.startYear; y <= trendsState.endYear; y++) {
      periods.push({ key: String(y), y, mStart: 1, mEnd: 12 });
    }
  } else {
    let y = trendsState.startYear, m = trendsState.startMonth;
    while (y * 100 + m <= endKey && periods.length < 240) {
      periods.push({ key: `${y}/${String(m).padStart(2, '0')}`, y, mStart: m, mEnd: m });
      m++; if (m > 12) { m = 1; y++; }
    }
  }
  return periods;
}

function getPeriodValue(customerId, period, metric) {
  const fn = metric === 'amount' ? sumForMerged : sumQtyForMerged;
  let sum = 0;
  for (let m = period.mStart; m <= period.mEnd; m++) sum += fn(customerId, period.y, m);
  return sum;
}

/* 「依客戶」一般瀏覽模式（非深入模式）：分類只是「選填的篩選」，不是強制的第一關卡。
   只有客戶分類數量大於1時才顯示篩選列，避免像「全部都是未分類」時多一層無意義的點擊。 */
function renderTrendCategoryList() {
  const cats = getAllCustomerCategories();
  const el = document.getElementById('trendCategoryList');

  if (cats.length <= 1) {
    // 只有一種分類（通常是大家都還沒填分類），篩選列沒有意義，直接隱藏
    el.innerHTML = '';
    el.style.display = 'none';
    trendsState.category = null;
    return;
  }
  el.style.display = '';

  const allCnt = getRootCustomers().length;
  el.innerHTML = `<button type="button" class="trend-category-item ${!trendsState.category ? 'is-active' : ''}" data-cat="">
      <span>全部</span><span class="cnt">${allCnt}</span>
    </button>` +
    cats.map(cat => {
      const cnt = getRootCustomers().filter(c => (c.category || '未分類') === cat).length;
      return `<button type="button" class="trend-category-item ${trendsState.category === cat ? 'is-active' : ''}" data-cat="${escapeHtml(cat)}">
        <span>${escapeHtml(cat)}</span><span class="cnt">${cnt}</span>
      </button>`;
    }).join('');

  el.querySelectorAll('.trend-category-item').forEach(btn => {
    btn.addEventListener('click', () => {
      trendsState.category = btn.dataset.cat || null;
      renderTrendCategoryList();
      renderTrendSourceList();
      const sourceList = document.getElementById('trendSourceList');
      if (sourceList) sourceList.scrollTop = 0;
    });
  });
}

let trendCustomerListOpen = false; // 客戶清單預設收合，點擊搜尋欄才展開，避免客戶數一多畫面就被長清單塞滿

function renderTrendSourceList() {
  const el = document.getElementById('trendSourceList');

  if (!trendCustomerListOpen) {
    el.innerHTML = `<div class="empty-mini">點擊上方搜尋欄查看客戶清單</div>`;
    return;
  }

  let list = getRootCustomers();
  if (trendsState.category) list = list.filter(c => (c.category || '未分類') === trendsState.category);
  const q = trendsState.search.trim().toLowerCase();
  if (q) list = list.filter(c => (c.code || '').toLowerCase().includes(q) || (c.name || '').toLowerCase().includes(q));
  list.sort((a, b) => (a.code || '').localeCompare(b.code || '', 'zh-Hant'));

  if (list.length === 0) { el.innerHTML = `<div class="empty-mini">沒有符合條件的客戶</div>`; return; }

  el.innerHTML = list.map(c => {
    const sel = trendsState.selectedIds.includes(c.id);
    return `<div class="trend-drag-item ${sel ? 'is-selected' : ''}" draggable="true" data-id="${c.id}">
      <span class="grip">⠿</span>
      <div class="info">
        <div class="code">${escapeHtml(c.code || '—')}</div>
        <div class="name">${escapeHtml(c.name)}</div>
      </div>
      ${sel ? '<span class="selected-badge">已選</span>' : ''}
    </div>`;
  }).join('');

  el.querySelectorAll('.trend-drag-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('source-product-id', item.dataset.id);
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
    item.addEventListener('click', () => toggleTrendSelection(item.dataset.id));
  });
}

/* ---- 單一客戶深入模式：步驟2（產品分類，顯示「已買/該分類總數」）與步驟3（該分類的產品） ---- */

function renderTrendDeepDiveCategoryList() {
  const el = document.getElementById('trendCategoryList');
  el.style.display = ''; // 這個容器跟一般客戶模式的分類篩選列共用，該模式可能把它設成 display:none，這裡要強制重設回可見
  const custId = trendsState.deepDiveCustomerId;
  if (!custId) return;

  const boughtProductIds = new Set(salesForMergedCustomer(custId).map(s => s.productId || '').filter(Boolean));
  const totalCountByCategory = {};
  const boughtCountByCategory = {};
  products.forEach(p => {
    const cat = p.category || '未分類';
    totalCountByCategory[cat] = (totalCountByCategory[cat] || 0) + 1;
    if (boughtProductIds.has(p.id)) boughtCountByCategory[cat] = (boughtCountByCategory[cat] || 0) + 1;
  });
  const cats = sortCategoriesByStandardOrder(Object.keys(totalCountByCategory));

  if (cats.length === 0) { el.innerHTML = `<div class="empty-mini">目前沒有任何產品，請先到「產品管理」建立產品</div>`; return; }

  el.innerHTML = cats.map(cat => {
    const bought = boughtCountByCategory[cat] || 0;
    const total = totalCountByCategory[cat] || 0;
    return `<button type="button" class="trend-category-item ${trendsState.deepDiveProductCategory === cat ? 'is-active' : ''}" data-cat="${escapeHtml(cat)}">
      <span>${escapeHtml(cat)}</span><span class="cnt">${bought}/${total}</span>
    </button>`;
  }).join('');

  el.querySelectorAll('.trend-category-item').forEach(btn => {
    btn.addEventListener('click', () => {
      trendsState.deepDiveProductCategory = btn.dataset.cat;
      trendsState.search = '';
      const searchInput = document.getElementById('trendProductSearch');
      if (searchInput) searchInput.value = '';
      renderTrendDeepDiveCategoryList();
      renderTrendDeepDiveSourceList();
      const sourceList = document.getElementById('trendSourceList');
      if (sourceList) sourceList.scrollTop = 0; // 換分類後，清單捲動位置重置到最上方，不要停在上一個分類捲到的地方
    });
  });
}

function renderTrendDeepDiveSourceList() {
  const el = document.getElementById('trendSourceList');
  const custId = trendsState.deepDiveCustomerId;
  if (!trendsState.deepDiveProductCategory) { el.innerHTML = `<div class="empty-mini">請先在上方選擇產品分類</div>`; return; }

  const boughtProductIds = new Set(salesForMergedCustomer(custId).map(s => s.productId || '').filter(Boolean));
  let list = products.filter(p => (p.category || '未分類') === trendsState.deepDiveProductCategory);
  const q = trendsState.search.trim().toLowerCase();
  if (q) list = list.filter(p => (p.code || '').toLowerCase().includes(q) || (p.name || '').toLowerCase().includes(q));
  // 這位客戶買過的產品排前面，方便優先查看熟悉的品項；其餘依編號排序
  list.sort((a, b) => {
    const ab = boughtProductIds.has(a.id) ? 0 : 1;
    const bb = boughtProductIds.has(b.id) ? 0 : 1;
    if (ab !== bb) return ab - bb;
    return (a.code || '').localeCompare(b.code || '', 'zh-Hant');
  });

  if (list.length === 0) { el.innerHTML = `<div class="empty-mini">此分類沒有符合條件的產品</div>`; return; }

  el.innerHTML = list.map(p => {
    const sel = trendsState.selectedIds.includes(p.id);
    const bought = boughtProductIds.has(p.id);
    return `<div class="trend-drag-item ${sel ? 'is-selected' : ''}" draggable="true" data-id="${p.id}">
      <span class="grip">⠿</span>
      <div class="info">
        <div class="code">${escapeHtml(p.code || '—')}${bought ? '　<span style="color:var(--good)">・已購買</span>' : ''}</div>
        <div class="name">${escapeHtml(p.name)}</div>
      </div>
      ${sel ? '<span class="selected-badge">已選</span>' : ''}
    </div>`;
  }).join('');

  el.querySelectorAll('.trend-drag-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('source-product-id', item.dataset.id);
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
    item.addEventListener('click', () => toggleTrendSelection(item.dataset.id));
  });
}

/* 統一調度：依目前是否為深入模式，決定左側步驟面板要顯示「客戶瀏覽」還是「產品瀏覽」，
   並負責顯示/隱藏頂部橫幅與步驟標題文字。所有需要重繪左側面板的地方都呼叫這個函式，
   不要再分別呼叫 renderTrendCategoryList／renderTrendSourceList，避免兩種模式的畫面同時殘留。 */
let lastDeepDiveCustomerId = null; // 用來判斷是否「換了新客戶」進入深入模式，只有換人時才重置步驟2的捲動位置

function renderTrendProductStepPanel() {
  const banner = document.getElementById('trendDeepDiveBanner');
  const title1 = document.getElementById('trendStepTitle1');
  const title2Row = document.getElementById('trendStepTitle2Row');
  const title2 = document.getElementById('trendStepTitle2');
  const searchInput = document.getElementById('trendProductSearch');

  if (trendsState.deepDiveCustomerId) {
    const isNewCustomer = trendsState.deepDiveCustomerId !== lastDeepDiveCustomerId;
    lastDeepDiveCustomerId = trendsState.deepDiveCustomerId;

    const c = customers.find(c => c.id === trendsState.deepDiveCustomerId);
    banner.style.display = '';
    banner.innerHTML = `
      <span>🔎 目前分析：<strong>${escapeHtml(c ? c.name : '（已刪除客戶）')}</strong>${c && c.code ? `（${escapeHtml(c.code)}）` : ''} 的產品組合</span>
      <div style="display:flex;gap:8px;">
        <button type="button" class="btn-ghost" id="trendExitDeepDiveBtn" style="font-size:12px;padding:6px 12px;">＋ 加入其他客戶比較</button>
        <button type="button" class="btn-ghost" id="trendClearDeepDiveBtn" style="font-size:12px;padding:6px 12px;">✕ 清除，重新選擇</button>
      </div>
    `;
    document.getElementById('trendExitDeepDiveBtn').addEventListener('click', exitTrendDeepDive);
    document.getElementById('trendClearDeepDiveBtn').addEventListener('click', clearTrendDeepDive);
    title1.textContent = '步驟2・選擇產品分類';
    title2Row.style.display = '';
    title2.textContent = '步驟3・拖拉產品到右側';
    searchInput.placeholder = '在此分類中搜尋產品...';
    renderTrendDeepDiveCategoryList();
    renderTrendDeepDiveSourceList();
    if (isNewCustomer) {
      // 換了新客戶才把步驟2的捲動位置重置到最上方；同一位客戶底下切換分類/勾選產品時不動它，避免清單一直跳回頂端
      const categoryList = document.getElementById('trendCategoryList');
      if (categoryList) categoryList.scrollTop = 0;
    }
  } else {
    lastDeepDiveCustomerId = null;
    banner.style.display = 'none';
    title1.textContent = '步驟1・選擇客戶';
    searchInput.placeholder = '搜尋客戶編號或名稱...';
    renderTrendCategoryList(); // 分類數量>1時才會顯示成篩選列，否則自動隱藏
    // 只有在存在多個分類（因此上方有篩選列可用）時，才需要第二段標題來區隔「篩選」跟「清單」；
    // 分類只有0或1種時，直接合併成一步，不顯示第二段標題
    const showTitle2 = getAllCustomerCategories().length > 1;
    title2Row.style.display = showTitle2 ? '' : 'none';
    if (showTitle2) title2.textContent = '客戶清單（可拖拉到右側）';
    renderTrendSourceList();
  }
}

function renderTrendCategorySourceList() {
  const el = document.getElementById('trendCategorySourceList');
  if (!el) return;
  const groups = getAllCustomerRepGroups();

  if (groups.length === 0) { el.innerHTML = `<div class="empty-mini">目前沒有任何業務</div>`; return; }

  el.innerHTML = groups.map(key => {
    const cnt = getRootCustomers().filter(c => customerRepGroupKey(c) === key).length;
    const sel = trendsState.selectedIds.includes(key);
    return `<div class="trend-drag-item ${sel ? 'is-selected' : ''}" draggable="true" data-id="${escapeHtml(key)}">
      <span class="grip">⠿</span>
      <div class="info">
        <div class="code">${cnt}位客戶</div>
        <div class="name">${escapeHtml(repGroupLabel(key))}</div>
      </div>
      ${sel ? '<span class="selected-badge">已選</span>' : ''}
    </div>`;
  }).join('');

  el.querySelectorAll('.trend-drag-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('source-product-id', item.dataset.id);
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
    item.addEventListener('click', () => toggleTrendSelection(item.dataset.id));
  });
}

function selectAllTrendCategories() {
  const groups = getAllCustomerRepGroups();
  const max = getTrendMaxSelection();
  if (groups.length > max) {
    showToast(`最多同時比較 ${max} 個業務，已選取前 ${max} 個`);
  }
  trendsState.selectedIds.length = 0;
  groups.slice(0, max).forEach(g => trendsState.selectedIds.push(g));
  renderTrendCategorySourceList();
  renderTrendSelectedPanel();
  renderTrendsChartAndTable();
}

function toggleTrendSelection(id) {
  const idx = trendsState.selectedIds.indexOf(id);
  if (idx >= 0) {
    trendsState.selectedIds.splice(idx, 1);
  } else {
    const max = getTrendMaxSelection();
    if (trendsState.selectedIds.length >= max) {
      showToast(`最多同時比較 ${max} ${getTrendUnitWord()}`);
      return;
    }
    trendsState.selectedIds.push(id);
  }
  trendsState.forceCustomerBrowse = false; // 使用者主動點選/移除了，重新啟用自動深入模式判斷
  maybeAutoToggleDeepDive();
  renderTrendProductStepPanel();
  renderTrendCategorySourceList();
  renderTrendSelectedPanel();
  renderTrendsChartAndTable();
}

/* 目前「已選擇比較」清單裡放的是什麼單位，用來組出提示文字（分類／客戶／產品） */
function getTrendUnitWord(withCount) {
  if (trendsState.compareUnit === 'category') return withCount ? '個業務' : '業務';
  if (trendsState.deepDiveCustomerId) return withCount ? '項產品' : '產品';
  return withCount ? '位客戶' : '客戶';
}

function moveTrendSelection(id, delta) {
  const idx = trendsState.selectedIds.indexOf(id);
  const newIdx = idx + delta;
  if (idx < 0 || newIdx < 0 || newIdx >= trendsState.selectedIds.length) return;
  const arr = trendsState.selectedIds;
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  renderTrendSelectedPanel();
  renderTrendsChartAndTable();
}

function renderTrendSelectedPanel() {
  const panel = document.getElementById('trendSelectedPanel');
  const max = getTrendMaxSelection();
  document.getElementById('trendSelectedCount').textContent = `${trendsState.selectedIds.length} / ${max} ${trendsState.compareUnit === 'category' ? '個' : '項'}`;

  if (trendsState.selectedIds.length === 0) {
    const hint = getTrendUnitWord();
    panel.innerHTML = `<div class="empty-mini">尚未選擇任何${hint}，請從左側拖拉${hint}到這裡（或直接點選${hint}）</div>`;
    return;
  }

  panel.innerHTML = trendsState.selectedIds.map((id, i) => {
    const color = TREND_PALETTE[i % TREND_PALETTE.length];
    return `<div class="trend-selected-chip" data-id="${id}">
      <span class="swatch" style="background:${color}"></span>
      <div class="info">
        <div class="code">${escapeHtml(getSelectionSubLabel(id))}</div>
        <div class="lbl">${escapeHtml(getSelectionLabel(id))}</div>
      </div>
      <div class="btn-group">
        <button type="button" class="trend-chip-btn" data-act="up" ${i === 0 ? 'disabled' : ''} style="${i === 0 ? 'opacity:.3' : ''}">▲</button>
        <button type="button" class="trend-chip-btn" data-act="down" ${i === trendsState.selectedIds.length - 1 ? 'disabled' : ''} style="${i === trendsState.selectedIds.length - 1 ? 'opacity:.3' : ''}">▼</button>
        <button type="button" class="trend-chip-btn" data-act="remove">✕</button>
      </div>
    </div>`;
  }).join('');

  panel.querySelectorAll('.trend-selected-chip').forEach(chip => {
    const id = chip.dataset.id;
    chip.querySelector('[data-act="remove"]').addEventListener('click', () => toggleTrendSelection(id));
    const upBtn = chip.querySelector('[data-act="up"]');
    const downBtn = chip.querySelector('[data-act="down"]');
    if (!upBtn.disabled) upBtn.addEventListener('click', () => moveTrendSelection(id, -1));
    if (!downBtn.disabled) downBtn.addEventListener('click', () => moveTrendSelection(id, 1));
  });
}

function renderTrendsChartAndTable() {
  const chartEmpty = document.getElementById('trendChartEmpty');
  const chartWrap = document.getElementById('trendChartWrap');
  const tableEmpty = document.getElementById('trendTableEmpty');
  const tableWrap = document.getElementById('trendTableWrap');

  if (trendsState.selectedIds.length === 0) {
    chartEmpty.style.display = ''; chartWrap.style.display = 'none';
    tableEmpty.style.display = ''; tableWrap.style.display = 'none';
    if (trendCompareChartInstance) { trendCompareChartInstance.destroy(); trendCompareChartInstance = null; }
    return;
  }
  chartEmpty.style.display = 'none'; chartWrap.style.display = '';
  tableEmpty.style.display = 'none'; tableWrap.style.display = '';

  const periods = getTrendPeriods();
  const metricLabel = trendsState.metric === 'amount' ? '金額' : '數量';
  if (trendsState.compareMode === 'recurring') {
    document.getElementById('trendChartTitle').textContent = `趨勢圖・${metricLabel}・跨年同期比較（每年 ${trendsState.recurStartMonth}~${trendsState.recurEndMonth} 月）`;
  } else {
    document.getElementById('trendChartTitle').textContent = periods.length > 0
      ? `趨勢圖・${metricLabel}（${periods[0].key} ~ ${periods[periods.length - 1].key}）`
      : `趨勢圖・${metricLabel}`;
  }

  const labels = periods.map(p => p.key);
  const datasets = trendsState.selectedIds.map((id, i) => {
    const color = TREND_PALETTE[i % TREND_PALETTE.length];
    return {
      label: getSelectionLabel(id),
      data: periods.map(period => getSelectionValue(id, period, trendsState.metric)),
      borderColor: color, backgroundColor: color + '22', tension: 0.25, pointRadius: 3, pointHoverRadius: 6, fill: false,
    };
  });

  const showSum = trendsState.showSum && trendsState.selectedIds.length >= 2;
  if (showSum) {
    datasets.push({
      label: `合計（已選 ${trendsState.selectedIds.length} ${getTrendUnitWord(true)}）`,
      data: periods.map(period => trendsState.selectedIds.reduce((sum, id) => sum + getSelectionValue(id, period, trendsState.metric), 0)),
      borderColor: '#1C2B39', backgroundColor: 'rgba(28,43,57,.08)',
      borderWidth: 3, borderDash: [6, 3], tension: 0.25, pointRadius: 3, pointHoverRadius: 6, fill: false,
    });
  }

  // 圖表永遠固定在卡片寬度內，不會因為資料點變多而變長／出現橫向捲軸；
  // 資料點很多時（例如月度且區間拉很長），改用「自動跳過部分標籤」讓 X 軸不會擠成一團
  const inner = document.getElementById('trendChartInner');
  inner.style.width = '100%';

  const ctx = document.getElementById('trendCompareChart').getContext('2d');
  if (trendCompareChartInstance) trendCompareChartInstance.destroy();
  trendCompareChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
        tooltip: {
          mode: 'index', intersect: false,
          callbacks: {
            label: (item) => {
              const v = item.parsed.y;
              const formatted = trendsState.metric === 'amount' ? '$' + fmtMoney(v) : fmtMoney(v);
              return `${item.dataset.label}：${formatted}`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { autoSkip: true, maxTicksLimit: 16, maxRotation: 45, minRotation: 0 } },
        y: { beginAtZero: true, ticks: { callback: v => trendsState.metric === 'amount' ? '$' + fmtMoney(v) : fmtMoney(v) } }
      }
    }
  });

  // 表格轉置：期間改成直向列（往下捲動），已選項目改成橫向欄，
  // 因為期間可能長達數十個月，但已選項目最多10個，這樣欄數才不會爆炸
  const SUM_COLOR = '#1C2B39';
  const primaryCls = 'trend-cell-primary';
  const secondaryCls = 'trend-cell-secondary';
  const qtyCls = trendsState.metric === 'quantity' ? primaryCls : secondaryCls;
  const amtCls = trendsState.metric === 'amount' ? primaryCls : secondaryCls;

  let theadHtml = '<thead><tr><th rowspan="2" class="trend-period-col" style="vertical-align:bottom">期間</th>';
  trendsState.selectedIds.forEach((id, i) => {
    const color = TREND_PALETTE[i % TREND_PALETTE.length];
    theadHtml += `<th colspan="2" class="trend-group-end" style="text-align:center;background:${tintColorOpaque(color, 0.16)};color:${color}">${escapeHtml(getSelectionLabel(id))}</th>`;
  });
  if (showSum) theadHtml += `<th colspan="2" style="text-align:center;background:${tintColorOpaque(SUM_COLOR, 0.12)};color:${SUM_COLOR}">合計（已選 ${trendsState.selectedIds.length} ${getTrendUnitWord(true)}）</th>`;
  theadHtml += '</tr><tr>';
  trendsState.selectedIds.forEach((id, i) => {
    const color = TREND_PALETTE[i % TREND_PALETTE.length];
    theadHtml += `<th style="text-align:right;background:${tintColorOpaque(color, 0.07)}">數量</th><th class="trend-group-end" style="text-align:right;background:${tintColorOpaque(color, 0.07)}">金額</th>`;
  });
  if (showSum) theadHtml += `<th style="text-align:right;background:${tintColorOpaque(SUM_COLOR, 0.05)}">數量</th><th style="text-align:right;background:${tintColorOpaque(SUM_COLOR, 0.05)}">金額</th>`;
  theadHtml += '</tr></thead>';

  let tbodyHtml = '<tbody>';
  const totalsQtyByItem = trendsState.selectedIds.map(() => 0);
  const totalsAmtByItem = trendsState.selectedIds.map(() => 0);
  let sumTotalQty = 0, sumTotalAmt = 0;

  periods.forEach(period => {
    tbodyHtml += `<tr><td class="trend-period-col">${escapeHtml(period.key)}</td>`;
    let periodSumQty = 0, periodSumAmt = 0;
    trendsState.selectedIds.forEach((id, i) => {
      const qty = getSelectionValue(id, period, 'quantity');
      const amt = getSelectionValue(id, period, 'amount');
      totalsQtyByItem[i] += qty; totalsAmtByItem[i] += amt;
      periodSumQty += qty; periodSumAmt += amt;
      tbodyHtml += `<td class="num-cell ${qtyCls}">${fmtMoney(qty)}</td><td class="num-cell ${amtCls} trend-group-end">$${fmtMoney(amt)}</td>`;
    });
    if (showSum) {
      sumTotalQty += periodSumQty; sumTotalAmt += periodSumAmt;
      tbodyHtml += `<td class="num-cell ${qtyCls}">${fmtMoney(periodSumQty)}</td><td class="num-cell ${amtCls}">$${fmtMoney(periodSumAmt)}</td>`;
    }
    tbodyHtml += '</tr>';
  });

  tbodyHtml += `<tr style="background:#F0F2F5;font-weight:700"><td class="trend-period-col" style="background:#F0F2F5">合計</td>`;
  trendsState.selectedIds.forEach((id, i) => {
    tbodyHtml += `<td class="num-cell ${qtyCls}">${fmtMoney(totalsQtyByItem[i])}</td><td class="num-cell ${amtCls} trend-group-end">$${fmtMoney(totalsAmtByItem[i])}</td>`;
  });
  if (showSum) {
    tbodyHtml += `<td class="num-cell ${qtyCls}">${fmtMoney(sumTotalQty)}</td><td class="num-cell ${amtCls}">$${fmtMoney(sumTotalAmt)}</td>`;
  }
  tbodyHtml += '</tr></tbody>';

  tableWrap.innerHTML = `<table class="data-table trend-detail-table">${theadHtml}${tbodyHtml}</table>`;
  fixTrendTableStickyHeader();
}

/* 表頭有兩列（項目名稱列＋數量/金額子標題列），兩列都需要「貼住」但不能貼在同一個位置，
   否則第二列會蓋住第一列，往下捲動時看不到客戶名稱。
   這裡量出第一列表頭實際的高度，讓第二列的 sticky top 疊在第一列下方，而不是重疊在一起。 */
function fixTrendTableStickyHeader() {
  const table = document.querySelector('#trendTableWrap table.trend-detail-table');
  if (!table) return;
  const theadRows = table.querySelectorAll('thead tr');
  if (theadRows.length < 2) return;
  const firstRowHeight = theadRows[0].getBoundingClientRect().height;
  theadRows[1].querySelectorAll('th').forEach(th => { th.style.top = firstRowHeight + 'px'; });
}

function applyTrendRecurMonthPreset(preset) {
  const map = {
    h1: [1, 6], h2: [7, 12], fullyear: [1, 12],
    q1: [1, 3], q2: [4, 6], q3: [7, 9], q4: [10, 12],
  };
  const range = map[preset];
  if (!range) return;
  trendsState.recurStartMonth = range[0];
  trendsState.recurEndMonth = range[1];
  renderTrendsPage();
}

function renderTrendsPage() {
  populateTrendYearMonthSelects();

  document.getElementById('trendContinuousControls').style.display = trendsState.compareMode === 'continuous' ? '' : 'none';
  document.getElementById('trendRecurringControls').style.display = trendsState.compareMode === 'recurring' ? '' : 'none';
  document.querySelectorAll('#trendCompareModeToggle .segmented-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.mode === trendsState.compareMode);
  });

  document.getElementById('trendProductStepPanel').style.display = trendsState.compareUnit === 'product' ? '' : 'none';
  document.getElementById('trendCategoryStepPanel').style.display = trendsState.compareUnit === 'category' ? '' : 'none';
  document.querySelectorAll('#trendCompareUnitToggle .segmented-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.unit === trendsState.compareUnit);
  });

  document.querySelectorAll('#trendRangePresets .trend-preset-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.preset === trendsState.activePreset);
  });
  document.querySelectorAll('#trendGranularityToggle .segmented-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.gran === trendsState.granularity);
  });
  document.querySelectorAll('#trendMetricToggle .segmented-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.metric === trendsState.metric);
  });
  document.querySelectorAll('#trendRecurMonthPresets .trend-preset-btn').forEach(btn => {
    const map = { h1: [1, 6], h2: [7, 12], fullyear: [1, 12], q1: [1, 3], q2: [4, 6], q3: [7, 9], q4: [10, 12] };
    const r = map[btn.dataset.preset];
    const active = r && r[0] === trendsState.recurStartMonth && r[1] === trendsState.recurEndMonth;
    btn.classList.toggle('is-active', !!active);
  });
  document.getElementById('trendShowSum').checked = trendsState.showSum;

  maybeAutoToggleDeepDive();
  renderTrendProductStepPanel();
  renderTrendCategorySourceList();
  renderTrendSelectedPanel();
  renderTrendsChartAndTable();
}

function refreshCurrentPage() {
  const activePage = document.querySelector('.page.is-active');
  if (!activePage) return;
  const id = activePage.id.replace('page-', '');
  if (id === 'dashboard') renderDashboard();
  if (id === 'customers') renderCustomerPage();
  if (id === 'products') renderProductPage();
  if (id === 'reps') renderRepsPage();
  if (id === 'sales') renderSalesPage();
  if (id === 'analysis') renderAnalysisPage();
  if (id === 'trends') renderTrendsPage();
}

/* =========================================================
   初始化
   ========================================================= */

function initEvents() {
  // 手機版側邊選單開關（桌面版這兩個元素本來就被 CSS 隱藏，這裡的邏輯不影響桌面版行為）
  document.getElementById('mobileNavToggle').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('is-open');
    document.getElementById('mobileNavBackdrop').classList.toggle('is-active');
  });
  document.getElementById('mobileNavBackdrop').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.remove('is-open');
    document.getElementById('mobileNavBackdrop').classList.remove('is-active');
  });

  document.getElementById('btnAddCustomer').addEventListener('click', () => openCustomerModal());
  document.getElementById('customerModalClose').addEventListener('click', closeCustomerModal);
  document.getElementById('customerCancelBtn').addEventListener('click', closeCustomerModal);
  document.getElementById('customerSaveBtn').addEventListener('click', saveCustomerFromModal);
  document.getElementById('customerSearch').addEventListener('input', () => { customerCurrentPage = 1; renderCustomerPage(); });
  document.getElementById('customerRegionFilter').addEventListener('change', () => { customerCurrentPage = 1; renderCustomerPage(); });
  document.getElementById('customerSelectAll').addEventListener('change', toggleSelectAllCustomers);
  document.getElementById('customerBulkAssignBtn').addEventListener('click', bulkAssignSelectedCustomers);
  document.getElementById('customerBulkClearBtn').addEventListener('click', () => { selectedCustomerIds.clear(); renderCustomerPage(); });
  document.getElementById('btnDetectDuplicates').addEventListener('click', showMergeGroupsOverview);
  document.getElementById('duplicateModalClose').addEventListener('click', closeDuplicateModal);
  document.getElementById('duplicateCloseBtn').addEventListener('click', closeDuplicateModal);

  document.getElementById('btnAddProduct').addEventListener('click', () => openProductModal());
  document.getElementById('productModalClose').addEventListener('click', closeProductModal);
  document.getElementById('productCancelBtn').addEventListener('click', closeProductModal);
  document.getElementById('productSaveBtn').addEventListener('click', saveProductFromModal);
  document.getElementById('productSearch').addEventListener('input', () => { productCurrentPage = 1; renderProductPage(); });
  document.getElementById('productCategoryFilter').addEventListener('change', () => { productCurrentPage = 1; renderProductPage(); });
  document.getElementById('btnApplyStandardCategories').addEventListener('click', applyStandardProductCategories);

  document.getElementById('btnAddRep').addEventListener('click', () => openRepModal());
  document.getElementById('repModalClose').addEventListener('click', closeRepModal);
  document.getElementById('repCancelBtn').addEventListener('click', closeRepModal);
  document.getElementById('repSaveBtn').addEventListener('click', saveRepFromModal);
  document.getElementById('repSearch').addEventListener('input', renderRepsPage);

  document.getElementById('btnAddSale').addEventListener('click', () => openSaleModal());
  document.getElementById('btnClearSalesFilters').addEventListener('click', clearSalesFilters);
  document.getElementById('saleModalClose').addEventListener('click', closeSaleModal);
  document.getElementById('saleCancelBtn').addEventListener('click', closeSaleModal);
  document.getElementById('saleSaveBtn').addEventListener('click', saveSaleFromModal);
  attachSaleAutoCalc();

  document.getElementById('btnDownloadTemplate').addEventListener('click', downloadTemplate);
  document.getElementById('btnCancelImport').addEventListener('click', cancelImport);
  document.getElementById('btnConfirmImport').addEventListener('click', confirmImport);

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => { if (e.target.files[0]) handleImportFile(e.target.files[0]); });
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('is-drag'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-drag'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('is-drag');
    if (e.dataTransfer.files[0]) handleImportFile(e.dataTransfer.files[0]);
  });

  document.getElementById('btnBackupExport').addEventListener('click', exportBackup);
  document.getElementById('btnBackupImport').addEventListener('change', (e) => {
    if (e.target.files[0]) importBackup(e.target.files[0]);
    e.target.value = '';
  });
  document.getElementById('btnCheckStorage').addEventListener('click', checkStorageUsage);

  /* 歷年趨勢比較 */
  document.getElementById('trendCompareModeToggle').addEventListener('click', (e) => {
    const btn = e.target.closest('.segmented-btn'); if (!btn) return;
    trendsState.compareMode = btn.dataset.mode;
    renderTrendsPage();
  });
  document.getElementById('trendCompareUnitToggle').addEventListener('click', (e) => {
    const btn = e.target.closest('.segmented-btn'); if (!btn) return;
    switchTrendCompareUnit(btn.dataset.unit);
  });
  document.getElementById('trendSelectAllCategories').addEventListener('click', selectAllTrendCategories);
  document.getElementById('trendRangePresets').addEventListener('click', (e) => {
    const btn = e.target.closest('.trend-preset-btn'); if (!btn) return;
    applyTrendPreset(btn.dataset.preset);
  });
  document.getElementById('trendGranularityToggle').addEventListener('click', (e) => {
    const btn = e.target.closest('.segmented-btn'); if (!btn) return;
    trendsState.granularity = btn.dataset.gran;
    renderTrendsPage();
  });
  document.getElementById('trendMetricToggle').addEventListener('click', (e) => {
    const btn = e.target.closest('.segmented-btn'); if (!btn) return;
    trendsState.metric = btn.dataset.metric;
    document.querySelectorAll('#trendMetricToggle .segmented-btn').forEach(b => b.classList.toggle('is-active', b === btn));
    renderTrendsChartAndTable();
  });
  ['trendStartYear', 'trendStartMonth', 'trendEndYear', 'trendEndMonth'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      trendsState.startYear = parseInt(document.getElementById('trendStartYear').value, 10);
      trendsState.startMonth = parseInt(document.getElementById('trendStartMonth').value, 10);
      trendsState.endYear = parseInt(document.getElementById('trendEndYear').value, 10);
      trendsState.endMonth = parseInt(document.getElementById('trendEndMonth').value, 10);
      trendsState.activePreset = null;
      renderTrendsPage();
    });
  });
  document.getElementById('trendRecurMonthPresets').addEventListener('click', (e) => {
    const btn = e.target.closest('.trend-preset-btn'); if (!btn) return;
    applyTrendRecurMonthPreset(btn.dataset.preset);
  });
  ['trendRecurStartMonth', 'trendRecurEndMonth', 'trendRecurStartYear', 'trendRecurEndYear'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      trendsState.recurStartMonth = parseInt(document.getElementById('trendRecurStartMonth').value, 10);
      trendsState.recurEndMonth = parseInt(document.getElementById('trendRecurEndMonth').value, 10);
      trendsState.recurStartYear = parseInt(document.getElementById('trendRecurStartYear').value, 10);
      trendsState.recurEndYear = parseInt(document.getElementById('trendRecurEndYear').value, 10);
      renderTrendsPage();
    });
  });
  document.getElementById('trendProductSearch').addEventListener('input', (e) => {
    trendsState.search = e.target.value;
    if (trendsState.deepDiveCustomerId) renderTrendDeepDiveSourceList();
    else renderTrendSourceList();
    const sourceList = document.getElementById('trendSourceList');
    if (sourceList) sourceList.scrollTop = 0;
  });
  document.getElementById('trendProductSearch').addEventListener('focus', () => {
    if (trendsState.deepDiveCustomerId) return; // 深入模式的產品清單不受這個收合機制影響，維持原本行為
    if (!trendCustomerListOpen) { trendCustomerListOpen = true; renderTrendSourceList(); }
  });
  document.addEventListener('click', (e) => {
    if (!trendCustomerListOpen || trendsState.deepDiveCustomerId) return;
    const panel = document.getElementById('trendProductStepPanel');
    if (panel && !panel.contains(e.target)) {
      trendCustomerListOpen = false;
      renderTrendSourceList();
    }
  });
  document.getElementById('trendClearSelected').addEventListener('click', () => {
    trendsState.selectedIds = [];
    trendsState._stash[trendsState.compareUnit] = trendsState.selectedIds;
    renderTrendProductStepPanel();
    renderTrendCategorySourceList();
    renderTrendSelectedPanel();
    renderTrendsChartAndTable();
  });
  document.getElementById('trendShowSum').addEventListener('change', (e) => {
    trendsState.showSum = e.target.checked;
    renderTrendsChartAndTable();
  });
  const trendPanel = document.getElementById('trendSelectedPanel');
  trendPanel.addEventListener('dragover', (e) => { e.preventDefault(); trendPanel.classList.add('is-dragover'); });
  trendPanel.addEventListener('dragleave', () => trendPanel.classList.remove('is-dragover'));
  trendPanel.addEventListener('drop', (e) => {
    e.preventDefault();
    trendPanel.classList.remove('is-dragover');
    const id = e.dataTransfer.getData('source-product-id');
    if (!id) return;
    if (trendsState.selectedIds.includes(id)) return;
    const max = getTrendMaxSelection();
    if (trendsState.selectedIds.length >= max) {
      showToast(`最多同時比較 ${max} ${getTrendUnitWord()}`);
      return;
    }
    trendsState.selectedIds.push(id);
    trendsState.forceCustomerBrowse = false;
    maybeAutoToggleDeepDive();
    renderTrendProductStepPanel();
    renderTrendCategorySourceList();
    renderTrendSelectedPanel();
    renderTrendsChartAndTable();
  });

  [document.getElementById('customerModalOverlay'), document.getElementById('productModalOverlay'), document.getElementById('repModalOverlay'), document.getElementById('saleModalOverlay'), document.getElementById('duplicateModalOverlay')].forEach(overlay => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('is-active'); });
  });
}

async function init() {
  await loadData();
  initTrendsDefaults();
  initNav();
  initEvents();
  renderDashboard();
  if (showToastQueued) { showToast(showToastQueued); showToastQueued = null; }
}

document.addEventListener('DOMContentLoaded', init);
