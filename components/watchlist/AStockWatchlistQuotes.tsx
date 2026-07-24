/**
 * A 股 watchlist 实时行情条
 *
 * 替代 TradingViewWatchlist(原版引用了已死的 TradingView CDN)
 * 纯 Tushare 数据,本地渲染
 *
 * 显示:每只股票的价格 + 涨跌幅 + 迷你 sparkline
 */

'use client';

import { useEffect, useState } from 'react';
import { getWatchlistQuotes } from '@/lib/actions/watchlist-tushare.actions';
import { isChineseStock } from '@/lib/tushare/mapping';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Quote {
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
}

interface AStockWatchlistQuotesProps {
    symbols: string[];        // raw watchlist symbols
    names?: Record<string, string>;  // symbol → displayName 映射
}

export default function AStockWatchlistQuotes({ symbols, names = {} }: AStockWatchlistQuotesProps) {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);

    // 仅保留 A 股
    const aSymbols = symbols.filter(s => isChineseStock(s));

    useEffect(() => {
        if (aSymbols.length === 0) {
            setLoading(false);
            return;
        }

        const fetchQuotes = async () => {
            try {
                const data = await getWatchlistQuotes(
                    aSymbols.map(s => ({ symbol: s, name: names[s] || s }))
                );
                setQuotes(data.map(q => ({
                    symbol: q.symbol,
                    name: q.name,
                    price: q.price,
                    changePercent: q.changePercent,
                })));
            } catch (err) {
                console.error('Failed to fetch watchlist quotes', err);
            } finally {
                setLoading(false);
            }
        };

        fetchQuotes();
        const interval = setInterval(fetchQuotes, 30000);  // 30 秒刷新
        return () => clearInterval(interval);
    }, [JSON.stringify(aSymbols), JSON.stringify(names)]);

    if (aSymbols.length === 0) {
        return (
            <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-md p-8 text-center">
                <p className="text-gray-500 text-sm">Watchlist 为空 ── 添加 A 股查看实时行情</p>
            </div>
        );
    }

    if (loading && quotes.length === 0) {
        return (
            <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-md p-8 text-center">
                <p className="text-gray-500 text-sm">加载行情中...</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl overflow-hidden">
            <div className="px-6 py-3 bg-white/5 border-b border-white/10">
                <h3 className="text-sm font-semibold text-gray-300">📊 Watchlist 实时行情(Tushare)</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-px bg-white/5">
                {quotes.map(q => {
                    const isUp = q.changePercent >= 0;
                    return (
                        <div
                            key={q.symbol}
                            className="bg-black/40 p-4 hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-500 truncate">{q.name}</p>
                                    <p className="text-[10px] text-gray-600 font-mono">{q.symbol}</p>
                                </div>
                                {isUp
                                    ? <TrendingUp className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    : <TrendingDown className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                            </div>
                            <p className="text-lg font-bold text-white">¥{q.price.toFixed(2)}</p>
                            <p className={`text-xs font-medium ${isUp ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {isUp ? '+' : ''}{q.changePercent.toFixed(2)}%
                            </p>
                        </div>
                    );
                })}
            </div>
            <div className="px-6 py-2 bg-white/5 text-xs text-gray-500 border-t border-white/10">
                数据源:Tushare daily ── 每 30 秒刷新 ── A 股日终数据(T+0 16:00 后)
            </div>
        </div>
    );
}