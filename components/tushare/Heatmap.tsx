/**
 * A 股全市场热力图(按行业分组 + 市值大小 + 涨跌色)
 *
 * 数据:Tushare daily + daily_basic + stock_basic
 * 用 SVG 自渲染(无第三方依赖)
 */

'use client';

import { useEffect, useMemo, useState } from 'react';

interface Stock {
    ts_code: string;
    name: string;
    industry: string;
    pct_chg: number;
    total_mv: number;
    circ_mv: number;
}

export default function Heatmap() {
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/tushare/heatmap')
            .then((res) => res.json())
            .then((json) => {
                if (!json.ok) throw new Error(json.error || 'fetch failed');
                setStocks(json.data);
            })
            .catch((err) => setError(String(err)))
            .finally(() => setLoading(false));
    }, []);

    // 按 industry 分组
    const grouped = useMemo(() => {
        const map = new Map<string, Stock[]>();
        for (const s of stocks) {
            const ind = s.industry || '其他';
            if (!map.has(ind)) map.set(ind, []);
            map.get(ind)!.push(s);
        }
        // 排序
        return Array.from(map.entries())
            .sort((a, b) => {
                const aMkt = a[1].reduce((sum, s) => sum + (s.total_mv || 0), 0);
                const bMkt = b[1].reduce((sum, s) => sum + (s.total_mv || 0), 0);
                return bMkt - aMkt;
            })
            .slice(0, 12); // 只显示前 12 个行业
    }, [stocks]);

    if (loading) return <div className="rounded-lg border border-white/10 bg-[#141414] p-6 min-h-[600px] text-gray-400 text-sm">Loading heatmap...</div>;
    if (error) return <div className="rounded-lg border border-rose-500/30 bg-[#141414] p-6 min-h-[600px] text-rose-400 text-sm">⚠️ {error}</div>;

    return (
        <div className="rounded-lg border border-white/10 bg-[#141414] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">🔥 A 股热力图(按行业)</h3>
            <div className="space-y-2">
                {grouped.map(([industry, stocks]) => {
                    const totalMv = stocks.reduce((sum, s) => sum + (s.total_mv || 0), 0);
                    return (
                        <div key={industry}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-gray-400">{industry}</span>
                                <span className="text-xs text-gray-500">
                                    {stocks.length} 只 | 总市值 ¥{(totalMv / 1e8).toFixed(0)} 亿
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {stocks.slice(0, 20).map((s) => {
                                    const pct = s.pct_chg;
                                    // 颜色:红涨绿跌(A 股惯例)
                                    // 强度根据 pct 绝对值
                                    const intensity = Math.min(Math.abs(pct) / 5, 1);
                                    let bgColor;
                                    if (pct > 0) {
                                        bgColor = `rgba(248, 73, 96, ${0.2 + intensity * 0.6})`;
                                    } else if (pct < 0) {
                                        bgColor = `rgba(0, 191, 128, ${0.2 + intensity * 0.6})`;
                                    } else {
                                        bgColor = 'rgba(120, 120, 120, 0.3)';
                                    }
                                    return (
                                        <a
                                            key={s.ts_code}
                                            href={`/stocks/${s.ts_code}`}
                                            className="relative rounded text-xs text-white overflow-hidden hover:ring-2 hover:ring-white/50 transition"
                                            style={{
                                                backgroundColor: bgColor,
                                                width: `${Math.max(40, Math.min(120, (s.total_mv / totalMv) * 800))}px`,
                                                height: '36px',
                                                padding: '4px 8px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                            }}
                                            title={`${s.name} ${s.ts_code}\n涨跌幅: ${pct?.toFixed(2)}%\n总市值: ¥${(s.total_mv / 1e8).toFixed(0)}亿`}
                                        >
                                            <span className="font-semibold truncate text-[10px]">{s.name}</span>
                                            <span className="text-[10px]">{pct >= 0 ? '+' : ''}{pct?.toFixed(2)}%</span>
                                        </a>
                                    );
                                })}
                                {stocks.length > 20 && (
                                    <span className="text-xs text-gray-500 px-2 py-1">+{stocks.length - 20}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="text-xs text-gray-500 mt-3">
                数据源:Tushare daily + daily_basic + stock_basic | 红涨绿跌(A 股惯例)
            </div>
        </div>
    );
}