/**
 * Tushare Symbol 格式转换工具
 *
 * Tushare 用的 ts_code 格式:
 *   - 沪市:600xxx.SH / 601xxx.SH / 603xxx.SH / 688xxx.SH(科创板)
 *   - 深市:000xxx.SZ / 002xxx.SZ(中小板)/ 300xxx.SZ(创业板)
 *   - 北交:830xxx.BJ / 836xxx.BJ
 *
 * 本文件专门处理 A 股
 */

/**
 * 判断是不是 A 股
 * - 6 位数字 → A 股
 * - 包含 .SH / .SZ / .BJ → A 股
 * - 含 : → 美股(NASDAQ:AAPL)
 */
export function isChineseStock(symbol: string): boolean {
    if (!symbol) return false;
    if (symbol.includes(':')) return false; // 美股
    const s = symbol.toUpperCase().replace(/\.(SH|SZ|BJ)$/, '');
    return /^\d{6}$/.test(s);
}

/**
 * 把用户输入的 symbol 补全成 Tushare ts_code
 *
 * 例子:
 *   "000001" → "000001.SZ"
 *   "600000" → "600000.SH"
 *   "688001" → "688001.SH"(科创板)
 *   "830xxx" → "830xxx.BJ"(北交)
 *   "000001.SZ" → "000001.SZ"(不动)
 *   "AAPL" → "AAPL"(美股,不动)
 */
export function formatSymbolForTushare(symbol: string): string {
    if (!symbol) return symbol;
    const s = symbol.toUpperCase().trim();
    // 已是 ts_code 格式,直接返回
    if (/\.(SH|SZ|BJ)$/.test(s)) return s;
    // 美股,不动
    if (/^[A-Z]+$/.test(s.replace(':', '')) && !/^\d+$/.test(s)) return s;
    // 6 位数字判断
    if (/^\d{6}$/.test(s)) {
        // 60xxxx 沪市 / 68xxxx 科创板(沪市)
        if (/^(60|68)\d{4}$/.test(s)) return `${s}.SH`;
        // 00xxxx / 002xxx 深市 / 30xxxx 创业板
        if (/^(00|02|03)\d{4}$/.test(s)) return `${s}.SZ`;
        // 43xxxx / 83xxxx / 87xxxx 北交
        if (/^(43|83|87)\d{4}$/.test(s)) return `${s}.BJ`;
    }
    return s; // 无法识别,原样返回
}

/**
 * 把 Tushare ts_code 还原成 display symbol(去掉后缀)
 *
 * 例子:
 *   "000001.SZ" → "000001"
 *   "600000.SH" → "600000"
 */
export function formatSymbolForDisplay(tsCode: string): string {
    if (!tsCode) return tsCode;
    return tsCode.replace(/\.(SH|SZ|BJ)$/, '');
}

/**
 * 从 ts_code 推出交易所
 *
 * 例子:
 *   "000001.SZ" → "SZ"
 *   "600000.SH" → "SH"
 *   "688001.SH" → "SH"(科创板)
 *   "830001.BJ" → "BJ"
 */
export function getExchange(tsCode: string): 'SH' | 'SZ' | 'BJ' | 'UNKNOWN' {
    if (!tsCode) return 'UNKNOWN';
    const m = tsCode.match(/\.(SH|SZ|BJ)$/);
    if (m) return m[1] as 'SH' | 'SZ' | 'BJ';
    return 'UNKNOWN';
}

/**
 * 推断股票所属板块
 *
 * @returns "主板" | "创业板" | "科创板" | "北交" | "未知"
 */
export function getBoard(tsCode: string): '主板' | '创业板' | '科创板' | '北交' | '未知' {
    const code = tsCode.replace(/\.(SH|SZ|BJ)$/, '');
    if (!/^\d{6}$/.test(code)) return '未知';

    // 沪市主板:600xxx, 601xxx, 603xxx, 605xxx
    if (/^(60[0135]|605)\d{3}\.SH$/.test(tsCode)) return '主板';
    // 科创板:688xxx.SH
    if (/^688\d{3}\.SH$/.test(tsCode)) return '科创板';
    // 深市主板:000xxx, 001xxx, 002xxx(中小板已合并到主板)
    if (/^(00[01]|002)\d{3}\.SZ$/.test(tsCode)) return '主板';
    // 创业板:300xxx.SZ
    if (/^300\d{3}\.SZ$/.test(tsCode)) return '创业板';
    // 北交:430xxx, 830xxx, 836xxx, 837xxx, 870xxx, 871xxx, 873xxx
    if (/\.(BJ)$/.test(tsCode)) return '北交';

    return '未知';
}

/**
 * 判断两个 symbol 是否等价(忽略后缀)
 *
 * 例子:
 *   "000001" === "000001.SZ" → true
 *   "000001.SZ" === "000001.SH" → false
 */
export function symbolEquals(a: string, b: string): boolean {
    return formatSymbolForDisplay(a) === formatSymbolForDisplay(b);
}

/**
 * Tushare API 需要的日期格式转换
 *
 * @param d 日期字符串 "2025-01-15" 或 Date 对象
 * @returns "20250115"
 */
export function toTushareDate(d: string | Date): string {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
}

/**
 * Tushare 月份格式
 *
 * @param d "2025-01-15" 或 Date 对象
 * @returns "202501"
 */
export function toTushareMonth(d: string | Date): string {
    return toTushareDate(d).slice(0, 6);
}