/**
 * A 股热力图(OpenStock 美股风格 + 真实双权重)
 *
 * 面积算法(类似原版 OpenStock):
 * - 行业块面积 = 行业总市值(归一化到 100%)
 * - 股票块面积 = |涨跌幅|(板块内归一化)
 * - 颜色 = 涨跌幅正负(红涨绿跌)
 *
 * 行业数:12(按总市值排序)
 * 每行业最多 12 只股票
 *
 * 数据:Tushare daily + daily_basic + stock_basic
 */

'use client';

import { useEffect, useMemo, useState } from 'react';

interface Stock {
    ts_code: string;
    name: string;
    industry: string;
    pct_chg: number;
    total_mv: number;
    circ_mv?: number;
}

const INDUSTRY_COLORS: Record<string, string> = {
    '银行': '#1e88e5', '半导体': '#7b1fa2', '通信设备': '#00897b',
    '元器件': '#5e35b1', '电气设备': '#43a047', '石油开采': '#fb8c00',
    '保险': '#e53935', '电信运营': '#3949ab', '证券': '#00838f',
    '白酒': '#6a1b9a', '煤炭开采': '#5d4037', '家用电器': '#c62828',
    '汽车整车': '#0277bd', '小金属': '#f57c00', '医药': '#2e7d32',
    '钢铁': '#546e7a', '电力': '#00838f', '房地产': '#795548',
};

const INDUSTRY_EMOJI: Record<string, string> = {
    '银行': '🏦', '半导体': '💎', '通信设备': '📡', '元器件': '🔌',
    '电气设备': '⚡', '石油开采': '🛢️', '保险': '🛡️', '电信运营': '📱',
    '证券': '📊', '白酒': '🍶', '煤炭开采': '⛏️', '家用电器': '🏠',
    '汽车整车': '🚗', '小金属': '⚙️', '医药': '💊', '钢铁': '🏭',
    '电力': '💡', '房地产': '🏢',
};

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

    // 按 industry 分组 ── 行业内按 |pct_chg| 排序(让大涨幅的占大头)
    const groupedIndustries = useMemo(() => {
        if (stocks.length === 0) return [];

        const byIndustry = new Map<string, Stock[]>();
        for (const s of stocks) {
            const ind = s.industry || '其他';
            if (!byIndustry.has(ind)) byIndustry.set(ind, []);
            byIndustry.get(ind)!.push(s);
        }

        return Array.from(byIndustry.entries())
            .map(([ind, list]) => ({
                name: ind,
                // 行业内按 |pct_chg| 倒序(大涨幅的优先,占据主要视觉区域)
                stocks: list
                    .sort((a, b) => Math.abs(b.pct_chg) - Math.abs(a.total_mv > 0 ? a.pct_chg : 0))
                    .slice(0, 12),
                totalMv: list.reduce((sum, s) => sum + s.total_mv, 0),
                // 行业总涨跌幅度(用于主股票块颜色透明度)
                avgPctChg: list.reduce((sum, s) => sum + s.pct_chg, 0) / list.length,
            }))
            .sort((a, b) => b.totalMv - a.totalMv)
            .slice(0, 12);
    }, [stocks]);

    if (loading) return <div className="rounded-lg border border-white/10 bg-[#141414] p-6 min-h-[600px] text-gray-400 text-sm">Loading heatmap...</div>;
    if (error) return <div className="rounded-lg border border-rose-500/30 bg-[#141414] p-6 min-h-[600px] text-rose-400 text-sm">⚠️ {error}</div>;

    return (
        <div className="rounded-lg border border-white/10 bg-[#141414] p-3 h-full flex flex-col">
            <div className="flex justify-between items-center mb-2 px-1">
                <h3 className="text-sm font-semibold text-white">📊 Stock Heatmap</h3>
                <span className="text-[10px] text-gray-500">{stocks.length} 只 / 12 行业 / 双权重</span>
            </div>

            {/* 4×3 行业 grid ── 占满父容器高度 */}
            <div className="grid grid-cols-4 grid-rows-3 gap-1 flex-1 min-h-0">
                {groupedIndustries.map((ind) => {
                    const mainStock = ind.stocks[0];
                    const otherStocks = ind.stocks.slice(1);

                    if (!mainStock) return <div key={ind.name} />;

                    // 主股票块:占 60-70% 行业面积
                    const mainSize = 0.65;
                    const otherSize = 1 - mainSize;

                    return (
                        <div
                            key={ind.name}
                            className="rounded-md overflow-hidden bg-[#0a0a0a] border border-white/5 flex flex-col"
                        >
                            {/* 行业标题 */}
                            <div className="px-2 py-0.5 bg-white/[0.04] text-[10px] text-gray-400 font-medium flex items-center gap-0.5 shrink-0">
                                {ind.name} <span className="text-gray-600">{'>'}</span>
                            </div>

                            {/* 主股票块(占 65%) */}
                            <a
                                href={`/stocks/${mainStock.ts_code}`}
                                className="block px-2 py-1 hover:ring-1 hover:ring-white/40 transition-all relative"
                                style={{
                                    backgroundColor: getColor(mainStock.pct_chg),
                                    flex: `${mainSize * 100} 0 0`,
                                    minHeight: 0,
                                }}
                                title={`${mainStock.name} ${mainStock.pct_chg >= 0 ? '+' : ''}${mainStock.pct_chg.toFixed(2)}%`}
                            >
                                <div className="flex items-center gap-1.5 h-full">
                                    <div
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                        style={{
                                            backgroundColor: INDUSTRY_COLORS[ind.name] || '#666',
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                                        }}
                                    >
                                        {INDUSTRY_EMOJI[ind.name] || mainStock.name[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-white truncate">
                                            {mainStock.name}
                                        </div>
                                        <div className="text-[10px] text-white/95">
                                            {mainStock.pct_chg >= 0 ? '+' : ''}{mainStock.pct_chg.toFixed(2)}%
                                        </div>
                                    </div>
                                </div>
                            </a>

                            {/* 其他股票(占 35%)2 列 grid */}
                            {otherStocks.length > 0 && (
                                <div
                                    className="grid grid-cols-2 gap-px p-px bg-black/30"
                                    style={{ flex: `${otherSize * 100} 1 0`, minHeight: 0 }}
                                >
                                    {otherStocks.slice(0, 6).map(s => (
                                        <a
                                            key={s.ts_code}
                                            href={`/stocks/${s.ts_code}`}
                                            className="flex items-center px-1.5 hover:ring-1 hover:ring-white/40 transition-all min-h-0 overflow-hidden"
                                            style={{ backgroundColor: getColor(s.pct_chg) }}
                                            title={`${s.name} ${s.pct_chg >= 0 ? '+' : ''}${s.pct_chg.toFixed(2)}%`}
                                        >
                                            <span className="text-[10px] text-white font-medium truncate w-full leading-tight">
                                                {s.name}
                                            </span>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="text-[10px] text-gray-600 mt-2 px-1 flex justify-between shrink-0">
                <span>行业块 = 总市值 | 股票块 = |涨跌幅| | 颜色 = 正负</span>
                <span>红涨绿跌(A 股)</span>
            </div>
        </div>
    );
}

function getColor(pct: number): string {
    if (pct > 0) {
        const intensity = Math.min(Math.abs(pct) / 5, 1);
        return `rgba(220, 50, 50, ${0.45 + intensity * 0.45})`;
    } else if (pct < 0) {
        const intensity = Math.min(Math.abs(pct) / 5, 1);
        return `rgba(40, 167, 80, ${0.45 + intensity * 0.45})`;
    }
    return 'rgba(60, 60, 70, 0.5)';
}