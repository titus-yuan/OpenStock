/**
 * Watchlist 实时价格(混合:Tushare A 股 + Finnhub 美股)
 *
 * 路由规则:
 * - symbol 包含 .SH/.SZ/.BJ 或 6 位数字 → Tushare daily 最新 1 条
 * - 其他字母 → Finnhub /quote
 */

'use server';

import { cache } from 'react';
import { tushareQuery } from '@/lib/tushare/client';
import { formatSymbolForTushare, isChineseStock } from '@/lib/tushare/mapping';
import { getWatchlistData as finnhubGetWatchlistData } from './finnhub.actions';

export interface WatchlistStock {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    marketCap?: number;
    logo?: string;
    currency?: string;
    source: 'tushare' | 'finnhub';
}

/** 拉 A 股最新日终价(批量)─ 直接拉 daily */
async function fetchAStockQuotes(symbols: string[]): Promise<Map<string, WatchlistStock>> {
    const map = new Map<string, WatchlistStock>();
    if (symbols.length === 0) return map;

    // 找最近交易日(倒推 5 天)
    const today = new Date();
    const fmt = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

    let dailyData: any[] = [];
    let basicData: any[] = [];
    for (let i = 0; i < 5; i++) {
        const dt = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const tradeDate = fmt(dt);
        const [d, b] = await Promise.all([
            tushareQuery<any>('daily', { trade_date: tradeDate }, { revalidate: 3600 }),
            tushareQuery<any>('daily_basic', { trade_date: tradeDate }, { revalidate: 3600 }),
        ]);
        if (d && Array.isArray(d) && d.length > 0) dailyData = d;
        if (b && Array.isArray(b) && b.length > 0) basicData = b;
        if (dailyData.length > 0) break;
    }

    const basicMap = new Map(basicData.map((b: any) => [b.ts_code, b]));

    for (const sym of symbols) {
        const tsCode = formatSymbolForTushare(sym);
        const candle = dailyData.find((d: any) => d.ts_code === tsCode);
        const basic = basicMap.get(tsCode);
        if (candle) {
            map.set(sym, {
                symbol: sym,
                name: tsCode,  // WatchlistManager 会传 name 进来
                price: candle.close,
                change: candle.change,
                changePercent: candle.pct_chg,
                marketCap: basic?.total_mv ? basic.total_mv / 10000 : undefined,  // 万元 → 亿元
                currency: 'CNY',
                source: 'tushare',
            });
        }
    }
    return map;
}

/** 拉 watchlist 价格(混合 Finnhub + Tushare) */
export const getWatchlistQuotes = cache(async (
    symbols: { symbol: string; name?: string }[]
): Promise<WatchlistStock[]> => {
    if (!symbols || symbols.length === 0) return [];

    // 1. 分类:A 股 vs 美股
    const aStocks = symbols.filter(s => isChineseStock(s.symbol));
    const usStocks = symbols.filter(s => !isChineseStock(s.symbol));

    const results: WatchlistStock[] = [];

    // 2. A 股批量拉(1 次 Tushare 调用)
    if (aStocks.length > 0) {
        const aQuotes = await fetchAStockQuotes(aStocks.map(s => s.symbol));
        for (const s of aStocks) {
            const q = aQuotes.get(s.symbol);
            if (q) {
                // 用传入的 name(覆盖默认 tsCode)
                if (s.name) q.name = s.name;
                results.push(q);
            }
        }
    }

    // 3. 美股走 Finnhub(原行为)
    if (usStocks.length > 0) {
        try {
            const finnhubQuotes = await finnhubGetWatchlistData(usStocks.map(s => s.symbol));
            for (const q of finnhubQuotes) {
                results.push({
                    symbol: q.symbol,
                    name: q.name || q.symbol,
                    price: q.price,
                    change: q.change,
                    changePercent: q.changePercent,
                    marketCap: q.marketCap,
                    logo: q.logo,
                    currency: q.currency || 'USD',
                    source: 'finnhub',
                });
            }
        } catch (e) {
            console.error('Finnhub watchlist fetch failed:', e);
        }
    }

    return results;
});