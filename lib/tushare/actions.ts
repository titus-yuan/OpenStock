/**
 * Tushare 业务层封装
 *
 * 包装 tushareQuery 为业务函数,返回强类型
 *
 * 用户积分:5111(5000 档)─ 50+ 接口可用(详见 37 号报告)
 */

import { tushareQuery, tushareQueryOne } from './client';
import { formatSymbolForTushare } from './mapping';

// ============================================================================
// 类型定义
// ============================================================================

export interface StockBasic {
    ts_code: string;
    symbol: string;
    name: string;
    industry?: string;
    area?: string;
    fullname?: string;
    cnspell?: string;
    market?: string;
    list_date?: string;
    act_name?: string;
    act_ent_type?: string;
}

export interface DailyCandle {
    ts_code: string;
    trade_date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    pre_close: number;
    change: number;
    pct_chg: number;
    vol: number;
    amount: number;
}

export interface DailyBasic {
    ts_code: string;
    trade_date: string;
    close: number;
    turnover_rate: number;
    turnover_rate_f: number;
    volume_ratio: number;
    pe: number;
    pe_ttm: number;
    pb: number;
    ps: number;
    ps_ttm: number;
    total_share: number;
    float_share: number;
    free_share: number;
    total_mv: number;
    circ_mv: number;
}

export interface AdjFactor {
    ts_code: string;
    trade_date: string;
    adj_factor: number;
}

export interface StockCompany {
    ts_code: string;
    com_name: string;
    com_id: string;
    chairman: string;
    manager: string;
    secretary: string;
    reg_capital: number;
    setup_date: string;
    province: string;
    city: string;
    introduction: string;
    website: string;
    email: string;
    office: string;
    business_scope: string;
    main_business: string;
}

export interface MajorNews {
    id: string;
    pub_time?: string;
    title: string;
    content?: string;
    src?: string;
    url?: string;
}

export interface IndexBasic {
    ts_code: string;
    name: string;
    market: string;
    publisher?: string;
    category?: string;
    base_date?: string;
    base_point?: number;
    list_date?: string;
}

export interface ThsIndex {
    ts_code: string;
    name: string;
    count: number;
    exchange: string;
    list_date: string;
    type: string;
}

// ============================================================================
// 辅助函数
// ============================================================================

/** 拿数组结果(空数组兜底) */
async function rows<T>(
    api: string,
    params: Record<string, string | number | undefined> = {},
    opts: { revalidate?: number } = {}
): Promise<T[]> {
    const result = await tushareQuery<T>(api, params, opts);
    if (!result || !Array.isArray(result)) return [];
    return result;
}

/** 拿单值结果 */
async function one<T>(
    api: string,
    params: Record<string, string | number | undefined> = {},
    opts: { revalidate?: number } = {}
): Promise<T | null> {
    const result = await tushareQueryOne<T>(api, params, opts);
    if (!result) return null;
    if (Array.isArray(result)) return (result[0] ?? null) as T;
    return result as T;
}

/** 日期格式化 YYYYMMDD */
function fmtDate(d: Date): string {
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/** 取 daysBack 天前 */
function daysBackDate(daysBack: number): Date {
    return new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
}

// ============================================================================
// A. 股票基础信息
// ============================================================================

/** 拉所有股票列表(5531 只 A 股)─ 缓存 24 小时 */
export async function getAllStocks(): Promise<StockBasic[]> {
    return rows<StockBasic>(
        'stock_basic',
        { list_status: 'L', fields: 'ts_code,symbol,name,industry,area,cnspell,market,list_date,act_name,act_ent_type' },
        { revalidate: 86400 }
    );
}

/** 拉 1 只股票基本信息 */
export async function getStockBasic(symbol: string): Promise<StockBasic | null> {
    const tsCode = formatSymbolForTushare(symbol);
    return one<StockBasic>(
        'stock_basic',
        { ts_code: tsCode, fields: 'ts_code,symbol,name,industry,area,fullname,cnspell,market,list_date' },
        { revalidate: 86400 }
    );
}

/** 搜索股票(symbol 或 name LIKE)*/
export async function searchStocks(query: string, limit = 20): Promise<StockBasic[]> {
    const all = await getAllStocks();
    if (!query) return all.slice(0, limit);
    const q = query.toUpperCase();
    return all.filter(s =>
        s.ts_code.includes(q) ||
        s.symbol.includes(q) ||
        s.name.includes(query) ||
        (s.cnspell && s.cnspell.includes(q))
    ).slice(0, limit);
}

/** 公司基本信息(stock_company)*/
export async function getStockCompany(symbol: string): Promise<StockCompany | null> {
    const tsCode = formatSymbolForTushare(symbol);
    return one<StockCompany>(
        'stock_company',
        { ts_code: tsCode },
        { revalidate: 86400 }
    );
}

// ============================================================================
// B. 行情数据
// ============================================================================

/** 日 K 线(默认最近 1 年)─ 缓存 1 小时 */
export async function getDailyCandles(
    symbol: string,
    daysBack = 365,
    adj?: 'qfq' | 'hfq'
): Promise<DailyCandle[]> {
    const tsCode = formatSymbolForTushare(symbol);
    const params: Record<string, string | number | undefined> = {
        ts_code: tsCode,
        start_date: fmtDate(daysBackDate(daysBack)),
        end_date: fmtDate(new Date()),
    };
    if (adj) params.adj = adj;
    return rows<DailyCandle>('daily', params, { revalidate: 3600 });
}

/** 单日全市场行情(用于首页 heatmap,watchlist 最新价)─ 缓存 1 小时 */
export async function getAllDailyByDate(tradeDate?: string): Promise<DailyCandle[]> {
    const params: Record<string, string | undefined> = {};
    if (tradeDate) params.trade_date = tradeDate;
    return rows<DailyCandle>('daily', params, { revalidate: 3600 });
}

/** 单只股票每日指标(PE/PB/换手率/市值)─ 缓存 1 小时 */
export async function getDailyBasic(symbol: string, daysBack = 30): Promise<DailyBasic[]> {
    const tsCode = formatSymbolForTushare(symbol);
    return rows<DailyBasic>(
        'daily_basic',
        {
            ts_code: tsCode,
            start_date: fmtDate(daysBackDate(daysBack)),
            end_date: fmtDate(new Date()),
        },
        { revalidate: 3600 }
    );
}

/** 全市场每日指标(用于 heatmap 市值/换手)─ 缓存 1 小时 */
export async function getAllDailyBasicByDate(tradeDate?: string): Promise<DailyBasic[]> {
    const params: Record<string, string | undefined> = {};
    if (tradeDate) params.trade_date = tradeDate;
    return rows<DailyBasic>('daily_basic', params, { revalidate: 3600 });
}

/** 复权因子 */
export async function getAdjFactor(symbol: string, daysBack = 365): Promise<AdjFactor[]> {
    const tsCode = formatSymbolForTushare(symbol);
    return rows<AdjFactor>(
        'adj_factor',
        {
            ts_code: tsCode,
            start_date: fmtDate(daysBackDate(daysBack)),
            end_date: fmtDate(new Date()),
        },
        { revalidate: 3600 }
    );
}

// ============================================================================
// C. 财务数据
// ============================================================================

/** 利润表(返回任意结构,不强类型) */
export async function getIncome(symbol: string, limit = 8): Promise<unknown[]> {
    const tsCode = formatSymbolForTushare(symbol);
    return rows(
        'income',
        { ts_code: tsCode, limit: String(limit) },
        { revalidate: 86400 }
    );
}

/** 资产负债表 */
export async function getBalanceSheet(symbol: string, limit = 8): Promise<unknown[]> {
    const tsCode = formatSymbolForTushare(symbol);
    return rows(
        'balancesheet',
        { ts_code: tsCode, limit: String(limit) },
        { revalidate: 86400 }
    );
}

/** 现金流量表 */
export async function getCashFlow(symbol: string, limit = 8): Promise<unknown[]> {
    const tsCode = formatSymbolForTushare(symbol);
    return rows(
        'cashflow',
        { ts_code: tsCode, limit: String(limit) },
        { revalidate: 86400 }
    );
}

/** 财务指标(ROE/ROA/PE/PB) */
export async function getFinaIndicator(symbol: string, limit = 8): Promise<unknown[]> {
    const tsCode = formatSymbolForTushare(symbol);
    return rows(
        'fina_indicator',
        { ts_code: tsCode, limit: String(limit) },
        { revalidate: 86400 }
    );
}

/** 分红 */
export async function getDividend(symbol: string): Promise<unknown[]> {
    const tsCode = formatSymbolForTushare(symbol);
    return rows(
        'dividend',
        { ts_code: tsCode },
        { revalidate: 86400 }
    );
}

// ============================================================================
// D. 指数 / 行业
// ============================================================================

/** 所有指数(8000 条) */
export async function getAllIndices(market?: 'SH' | 'SZ'): Promise<IndexBasic[]> {
    const params: Record<string, string | undefined> = {};
    if (market) params.market = market;
    return rows<IndexBasic>('index_basic', params, { revalidate: 86400 });
}

/** 主要指数(上证/深证/创业板/科创 50/沪深 300/中证 500) */
export async function getMainIndices(): Promise<IndexBasic[]> {
    const all = await getAllIndices();
    const mainCodes = ['000001.SH', '399001.SZ', '399006.SZ', '000688.SH', '000300.SH', '000905.SH'];
    return all.filter(i => mainCodes.includes(i.ts_code));
}

/** 同花顺行业(用于 heatmap 分组)─ 缓存 24 小时 */
export async function getThsIndustries(): Promise<ThsIndex[]> {
    return rows<ThsIndex>(
        'ths_index',
        { exchange: 'A', type: 'N' },
        { revalidate: 86400 }
    );
}

// ============================================================================
// E. 新闻
// ============================================================================

/** 财经新闻(大盘)─ 缓存 1 小时 */
export async function getMajorNews(daysBack = 7): Promise<MajorNews[]> {
    return rows<MajorNews>(
        'major_news',
        {
            start_date: fmtDate(daysBackDate(daysBack)),
            end_date: fmtDate(new Date()),
        },
        { revalidate: 3600 }
    );
}