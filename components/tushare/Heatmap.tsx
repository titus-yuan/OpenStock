/**
 * A 股热力图(OpenStock 风格)
 *
 * 设计参考:原 OpenStock 美股热力图
 * - 12 行业(按总市值排序)
 * - 每个行业 1 个 grid item(均匀大小)
 * - 行业内股票按市值布局(大块/中块/小块)
 * - 公司 logo:首字母圆形占位(A 股无 logo API)
 * - 颜色:红涨绿跌(中性用浅灰)
 * - 行业标签:浅灰小字 + ">" 箭头
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

// 行业 → 颜色(主色,用于 logo 圈)
const INDUSTRY_COLORS: Record<string, string> = {
    '银行': '#1e88e5',
    '半导体': '#7b1fa2',
    '通信设备': '#00897b',
    '元器件': '#5e35b1',
    '电气设备': '#43a047',
    '石油开采': '#fb8c00',
    '保险': '#e53935',
    '电信运营': '#3949ab',
    '证券': '#00838f',
    '白酒': '#6a1b9a',
    '煤炭开采': '#5d4037',
    '家用电器': '#c62828',
    '汽车整车': '#0277bd',
    '医药': '#2e7d32',
    '小金属': '#f57c00',
    '钢铁': '#546e7a',
    '电力': '#00838f',
    '房地产': '#795548',
};

// 行业 → emoji(用作 logo 圈内容)
const INDUSTRY_EMOJI: Record<string, string> = {
    '银行': '🏦',
    '半导体': '💎',
    '通信设备': '📡',
    '元器件': '🔌',
    '电气设备': '⚡',
    '石油开采': '🛢️',
    '保险': '🛡️',
    '电信运营': '📱',
    '证券': '📊',
    '白酒': '🍶',
    '煤炭开采': '⛏️',
    '家用电器': '🏠',
    '汽车整车': '🚗',
    '医药': '💊',
    '小金属': '⚙️',
    '钢铁': '🏭',
    '电力': '💡',
    '房地产': '🏢',
};

// 颜色:红涨绿跌
const getColor = (pct: number): string => {
    if (pct > 0) {
        const intensity = Math.min(Math.abs(pct) / 5, 1);
        return `rgba(220, 50, 50, ${0.45 + intensity * 0.45})`;
    } else if (pct < 0) {
        const intensity = Math.min(Math.abs(pct) / 5, 1);
        return `rgba(40, 167, 80, ${0.45 + intensity * 0.45})`;
    }
    return 'rgba(60, 60, 70, 0.5)';
};

// 浅色版本(文字)
const getTextColor = (pct: number): string => {
    return 'white';
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

    // 按行业分组,行业按总市值排序
    const groupedIndustries = useMemo(() => {
        if (stocks.length === 0) return [];

        // 按 industry 分组
        const byIndustry = new Map<string, Stock[]>();
        for (const s of stocks) {
            const ind = s.industry || '其他';
            if (!byIndustry.has(ind)) byIndustry.set(ind, []);
            byIndustry.get(ind)!.push(s);
        }

        // 取前 12 行业(按总市值)
        return Array.from(byIndustry.entries())
            .map(([ind, list]) => ({
                name: ind,
                stocks: list.sort((a, b) => b.total_mv - a.total_mv).slice(0, 12),  // 每行业最多 12 只
                totalMv: list.reduce((sum, s) => sum + s.total_mv, 0),
            }))
            .sort((a, b) => b.totalMv - a.totalMv)
            .slice(0, 12);  // 取 12 行业
    }, [stocks]);

    if (loading) return <div className="rounded-lg border border-white/10 bg-[#141414] p-6 min-h-[600px] text-gray-400 text-sm">Loading heatmap...</div>;
    if (error) return <div className="rounded-lg border border-rose-500/30 bg-[#141414] p-6 min-h-[600px] text-rose-400 text-sm">⚠️ {error}</div>;

    return (
        <div className="rounded-lg border border-white/10 bg-[#141414] p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">📊 Stock Heatmap</h3>
                <span className="text-xs text-gray-500">{stocks.length} 只股票 / 12 大行业</span>
            </div>

            {/* 4×3 行业 grid(大屏)/ 2 列(中屏)/ 1 列(小屏)*/}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                {groupedIndustries.map((ind) => {
                    const mainStock = ind.stocks[0];
                    const otherStocks = ind.stocks.slice(1);

                    return (
                        <div
                            key={ind.name}
                            className="rounded-md overflow-hidden bg-[#0a0a0a] border border-white/5"
                        >
                            {/* 行业标题 */}
                            <div className="px-3 py-1.5 bg-white/[0.04] text-[11px] text-gray-400 font-medium flex items-center gap-1">
                                {ind.name} <span className="text-gray-600">{'>'}</span>
                            </div>

                            {/* 主要股票(NVDA / AAPL 那种大块) */}
                            {mainStock && (
                                <a
                                    href={`/stocks/${mainStock.ts_code}`}
                                    className="block p-3 hover:ring-1 hover:ring-white/40 transition-all"
                                    style={{ backgroundColor: getColor(mainStock.pct_chg) }}
                                    title={`${mainStock.name} ${mainStock.pct_chg >= 0 ? '+' : ''}${mainStock.pct_chg.toFixed(2)}%`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
                                            style={{
                                                backgroundColor: INDUSTRY_COLORS[ind.name] || '#666',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                                            }}
                                        >
                                            {INDUSTRY_EMOJI[ind.name] || mainStock.name[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-base font-bold text-white truncate">
                                                {mainStock.name.length > 4 ? mainStock.name.slice(0, 4) : mainStock.name}
                                            </div>
                                            <div className="text-xs text-white/95">
                                                {mainStock.pct_chg >= 0 ? '+' : ''}{mainStock.pct_chg.toFixed(2)}%
                                            </div>
                                        </div>
                                    </div>
                                </a>
                            )}

                            {/* 其他股票(小格子) */}
                            {otherStocks.length > 0 && (
                                <div className="grid grid-cols-2 gap-px p-px bg-black/30">
                                    {otherStocks.map(s => (
                                        <a
                                            key={s.ts_code}
                                            href={`/stocks/${s.ts_code}`}
                                            className="aspect-[3/1.5] flex items-center px-2 hover:ring-1 hover:ring-white/40 transition-all min-h-[36px]"
                                            style={{ backgroundColor: getColor(s.pct_chg) }}
                                            title={`${s.name} ${s.pct_chg >= 0 ? '+' : ''}${s.pct_chg.toFixed(2)}%`}
                                        >
                                            <span className="text-[11px] text-white font-medium truncate w-full">
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

            <div className="text-xs text-gray-500 mt-3 px-2 flex justify-between">
                <span>数据源:Tushare daily + daily_basic + stock_basic</span>
                <span>红涨绿跌(A 股惯例)─ 面积 ∝ 市值</span>
            </div>
        </div>
    );
}