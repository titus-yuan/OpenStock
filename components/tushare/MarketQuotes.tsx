/**
 * 滚动报价(A 股活跃股)
 */

'use client';

import { useEffect, useState } from 'react';

interface Quote {
    ts_code: string;
    name: string;
    close: number;
    pct_chg: number;
    amount: number;
}

export default function MarketQuotes() {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/tushare/quotes?limit=30')
            .then((res) => res.json())
            .then((json) => {
                if (!json.ok) throw new Error(json.error || 'fetch failed');
                setQuotes(json.data);
            })
            .catch((err) => setError(String(err)))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="rounded-lg border border-white/10 bg-[#141414] p-6 min-h-[600px] text-gray-400 text-sm">Loading quotes...</div>;
    if (error) return <div className="rounded-lg border border-rose-500/30 bg-[#141414] p-6 min-h-[600px] text-rose-400 text-sm">⚠️ {error}</div>;

    return (
        <div className="rounded-lg border border-white/10 bg-[#141414] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">💹 A 股活跃股(按成交额)</h3>
            <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {quotes.map((q) => (
                    <a
                        key={q.ts_code}
                        href={`/stocks/${q.ts_code}`}
                        className="flex items-center justify-between px-3 py-2 rounded bg-white/5 hover:bg-white/10 transition text-sm"
                    >
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-white truncate">{q.name}</div>
                            <div className="text-xs text-gray-500">{q.ts_code}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-white font-semibold">{q.close?.toFixed(2) ?? '—'}</div>
                            <div className={q.pct_chg >= 0 ? 'text-rose-500' : 'text-emerald-500'}>
                                {q.pct_chg >= 0 ? '+' : ''}{q.pct_chg?.toFixed(2)}%
                            </div>
                        </div>
                    </a>
                ))}
            </div>
            <div className="text-xs text-gray-500 mt-2">数据源:Tushare daily | 按成交额排序</div>
        </div>
    );
}