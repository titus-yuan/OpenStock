/**
 * 首页 A 股大盘概览(Market Overview)
 * 上证综指 / 深证成指 / 创业板指 / 科创 50 / 沪深 300 / 中证 500
 */

'use client';

import { useEffect, useState } from 'react';

interface IndexQuote {
    ts_code: string;
    name: string;
    close: number;
    change: number;
    pct_chg: number;
    trade_date: string;
}

const MAIN_INDICES = [
    { ts_code: '000001.SH', name: '上证综指' },
    { ts_code: '399001.SZ', name: '深证成指' },
    { ts_code: '399006.SZ', name: '创业板指' },
    { ts_code: '000688.SH', name: '科创 50' },
    { ts_code: '000300.SH', name: '沪深 300' },
    { ts_code: '000905.SH', name: '中证 500' },
];

export default function MarketOverview() {
    const [indices, setIndices] = useState<IndexQuote[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/tushare/index_overview')
            .then((res) => res.json())
            .then((json) => {
                if (!json.ok) throw new Error(json.error || 'fetch failed');
                setIndices(json.data);
            })
            .catch((err) => setError(String(err)))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="rounded-lg border border-white/10 bg-[#141414] p-6 min-h-[400px] text-gray-400 text-sm">Loading market overview...</div>;
    if (error) return <div className="rounded-lg border border-rose-500/30 bg-[#141414] p-6 min-h-[400px] text-rose-400 text-sm">⚠️ {error}</div>;

    return (
        <div className="rounded-lg border border-white/10 bg-[#141414] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">📈 A 股主要指数</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {indices.map((idx) => (
                    <a
                        key={idx.ts_code}
                        href={`/stocks/${idx.ts_code}`}
                        className="rounded bg-white/5 p-3 hover:bg-white/10 transition"
                    >
                        <div className="text-xs text-gray-400">{idx.name}</div>
                        <div className="text-lg font-semibold text-white">{idx.close?.toFixed(2) ?? '—'}</div>
                        <div className={`text-sm ${idx.pct_chg >= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {idx.pct_chg >= 0 ? '+' : ''}{idx.change?.toFixed(2)} ({idx.pct_chg >= 0 ? '+' : ''}{idx.pct_chg?.toFixed(2)}%)
                        </div>
                    </a>
                ))}
            </div>
            <div className="text-xs text-gray-500 mt-3">数据源:Tushare index_daily | 数据日期: {indices[0]?.trade_date ?? '—'}</div>
        </div>
    );
}