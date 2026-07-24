'use server';

/**
 * 纯 A 股搜索(Tushare)
 *
 * 仅支持 A 股搜索(5531 只股票 LIKE 查询)
 */

import { cache } from 'react';
import { searchStocks as tushareSearchStocks } from '@/lib/tushare/actions';

export interface SearchResult {
    symbol: string;     // Tushare: 600519.SH
    name: string;
    exchange: string;
    type: string;
    isInWatchlist?: boolean;
    source: 'tushare';
}

export const searchStocksOnly = cache(async (query?: string): Promise<SearchResult[]> => {
    const trimmed = typeof query === 'string' ? query.trim() : '';
    const results: SearchResult[] = [];

    // 全部走 Tushare A 股搜索(支持中文/6 位数字/混合)
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

    return results.slice(0, 20);
});

/**
 * 取热门 A 股 ── 用于空搜索时显示
 */
export const getPopularChineseStocks = cache(async (): Promise<SearchResult[]> => {
    const { getAllStocks } = await import('@/lib/tushare/actions');
    const all = await getAllStocks();
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