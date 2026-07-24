/**
 * Watchlist 实时价格(纯 Tushare A 股)
 *
 * 仅支持 A 股 watchlist 报价
 */

'use server';

import { cache } from 'react';
import { tushareQuery } from '@/lib/tushare/client';
import { formatSymbolForTushare, isChineseStock } from '@/lib/tushare/mapping';

export interface WatchlistStock {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    marketCap?: number;
    currency?: string;
    source: 'tushare';
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
                name: tsCode,
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

/** 拉 watchlist 价格(纯 A 股 Tushare) */
export const getWatchlistQuotes = cache(async (
    symbols: { symbol: string; name?: string }[]
): Promise<WatchlistStock[]> => {
    if (!symbols || symbols.length === 0) return [];

    // 只保留 A 股
    const aStocks = symbols.filter(s => isChineseStock(s.symbol));
    if (aStocks.length === 0) return [];

    const aQuotes = await fetchAStockQuotes(aStocks.map(s => s.symbol));
    const results: WatchlistStock[] = [];

    for (const s of aStocks) {
        const q = aQuotes.get(s.symbol);
        if (q) {
            if (s.name) q.name = s.name;
            results.push(q);
        }
    }

    return results;
});