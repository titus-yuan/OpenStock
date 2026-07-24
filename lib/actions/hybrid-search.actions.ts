'use server';

/**
 * 混合股票搜索:Tushare(A 股) + Finnhub(美股)
 *
 * 路由规则:
 * - 输入是 6 位数字或包含中文 → 走 Tushare stock_basic LIKE
 * - 输入是字母(美股 symbol) → 走 Finnhub (保留原行为)
 * - 空输入 → A 股前 20 大市值 + 美股 popular 混合
 */

import { cache } from 'react';
import { searchStocks as finnhubSearchStocks } from './finnhub.actions';
import { getAllStocks, searchStocks as tushareSearchStocks } from '@/lib/tushare/actions';
import { isChineseStock } from '@/lib/tushare/mapping';

export interface HybridSearchResult {
    symbol: string;     // Tushare: 600519.SH, Finnhub: AAPL
    name: string;
    exchange: string;
    type: string;
    isInWatchlist?: boolean;
    source: 'tushare' | 'finnhub';
}

const isChineseQuery = (q: string) => {
    if (!q) return false;
    if (/[\u4e00-\u9fa5]/.test(q)) return true;  // 含中文
    if (/^\d{6}$/.test(q.trim())) return true;   // 6 位数字
    if (/\.(SH|SZ|BJ)$/i.test(q.trim())) return true;  // 已带后缀
    return false;
};

export const hybridSearchStocks = cache(async (query?: string): Promise<HybridSearchResult[]> => {
    const trimmed = typeof query === 'string' ? query.trim() : '';
    const results: HybridSearchResult[] = [];

    // 1. 中文 / 6 位数字 → Tushare
    if (!trimmed || isChineseQuery(trimmed)) {
        const tushareResults = await tushareSearchStocks(trimmed, 20);
        for (const r of tushareResults) {
            results.push({
                symbol: r.ts_code,
                name: r.name,
                exchange: r.market || 'A 股',
                type: r.industry || 'A 股',
                isInWatchlist: false,
                source: 'tushare',
            });
        }
    }

    // 2. 字母 → Finnhub(美股)
    if (trimmed && !isChineseQuery(trimmed)) {
        const finnhubResults = await finnhubSearchStocks(trimmed);
        for (const r of finnhubResults) {
            results.push({
                symbol: r.symbol,
                name: r.name,
                exchange: r.exchange,
                type: r.type,
                isInWatchlist: r.isInWatchlist,
                source: 'finnhub',
            });
        }
    }

    return results.slice(0, 20);
});

/**
 * 取热门股票(A 股)─ 用于空搜索时显示
 * 拉 A 股市值前 20(用 stock_basic × daily_basic)
 */
export const getPopularChineseStocks = cache(async (): Promise<HybridSearchResult[]> => {
    const all = await getAllStocks();
    // 简单的:取主板前 20
    const popular = all
        .filter(s => s.market === '主板')
        .slice(0, 20);

    return popular.map(r => ({
        symbol: r.ts_code,
        name: r.name,
        exchange: r.market || 'A 股',
        type: r.industry || 'A 股',
        isInWatchlist: false,
        source: 'tushare' as const,
    }));
});