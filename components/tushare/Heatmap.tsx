/**
 * A 股全市场热力图(按行业分组 + 市值大小 + 涨跌色)
 *
 * 用 d3-hierarchy treemap + squarify 算法:
 * - 面积 ∝ 市值(D3 squarify 自动切方块)
 * - 行业大块 → 行业总市值比例
 * - 颜色 ∝ 涨跌幅(红涨绿跌,A 股惯例)
 *
 * 数据:Tushare daily + daily_basic + stock_basic
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { hierarchy, treemap, stratify } from 'd3-hierarchy';

interface Stock {
    ts_code: string;
    name: string;
    industry: string;
    pct_chg: number;
    total_mv: number;
    circ_mv?: number;
}

const WIDTH = 1280;
const HEIGHT = 720;
const PADDING = 2;
const PADDING_OUTER = 3;

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

    // 构建 treemap 布局:industry → stock
    const layout = useMemo(() => {
        if (stocks.length === 0) return [];

        // 取有市值的,排序后取前 N 只
        const validStocks = stocks
            .filter(s => (s.total_mv || 0) > 0)
            .sort((a, b) => b.total_mv - a.total_mv)
            .slice(0, 200);  // 限制总数避免布局太挤

        // 构建 hierarchy: root → industry → stock
        // 用 stratify 需要所有节点都有唯一路径
        // 这里手动构造 hierarchy
        const root = hierarchy<{ name: string; children?: any[]; value?: number; data?: Stock }>({
            name: 'root',
            children: [],
        })
            .sum((d) => d.value || 0)
            .sort((a, b) => (b.value || 0) - (a.value || 0));

        // 按 industry 分组
        const byIndustry = new Map<string, Stock[]>();
        for (const s of validStocks) {
            const ind = s.industry || '其他';
            if (!byIndustry.has(ind)) byIndustry.set(ind, []);
            byIndustry.get(ind)!.push(s);
        }

        // 限制行业数(前 16 个市值最大的)
        const topIndustries = Array.from(byIndustry.entries())
            .map(([ind, list]) => ({
                name: ind,
                totalMv: list.reduce((sum, s) => sum + s.total_mv, 0),
                count: list.length,
            }))
            .sort((a, b) => b.totalMv - a.totalMv)
            .slice(0, 16);

        // 构造 children
        const industryNodes = topIndustries.map((ind) => ({
            name: ind.name,
            value: ind.totalMv,
            data: { industry: ind.name, count: ind.count, totalMv: ind.totalMv } as any,
        }));

        // 简化:industry 直接持有 stocks 作为 children
        // 用 stratify 替代,hierarchy 会自动 sum
        const dataWithChildren = topIndustries.map((ind) => {
            const stocksInInd = byIndustry.get(ind.name)!.slice(0, 30);  // 行业下最多 30 只
            return {
                name: ind.name,
                value: ind.totalMv,
                children: stocksInInd.map((s) => ({
                    name: s.ts_code,
                    value: s.total_mv,
                    data: s,
                    industryName: ind.name,
                })),
            };
        });

        const root2 = hierarchy<any>({ name: 'root', children: dataWithChildren })
            .sum((d) => d.value || 0)
            .sort((a, b) => (b.value || 0) - (a.value || 0));

        // treemap 布局(squarify 是默认)
        treemap<any>()
            .size([WIDTH, HEIGHT])
            .paddingOuter(PADDING_OUTER)
            .paddingTop(20)        // 行业标题占 20px
            .paddingInner(PADDING)
            .round(true)(root2);

        return root2.descendants();
    }, [stocks]);

    // 颜色:红涨绿跌(A 股惯例)
    const getColor = (pct: number) => {
        const intensity = Math.min(Math.abs(pct) / 5, 1);
        if (pct > 0) {
            return `rgba(248, 73, 96, ${0.25 + intensity * 0.55})`;
        } else if (pct < 0) {
            return `rgba(0, 191, 128, ${0.25 + intensity * 0.55})`;
        }
        return 'rgba(120, 120, 120, 0.3)';
    };

    if (loading) return <div className="rounded-lg border border-white/10 bg-[#141414] p-6 min-h-[600px] text-gray-400 text-sm">Loading heatmap...</div>;
    if (error) return <div className="rounded-lg border border-rose-500/30 bg-[#141414] p-6 min-h-[600px] text-rose-400 text-sm">⚠️ {error}</div>;

    return (
        <div className="rounded-lg border border-white/10 bg-[#141414] p-4">
            <div className="flex justify-between items-center mb-3 px-2">
                <h3 className="text-lg font-semibold text-white">🔥 A 股热力图(按行业 × 市值)</h3>
                <span className="text-xs text-gray-500">{stocks.length} 只股票 / 16 大行业 / 面积 ∝ 市值</span>
            </div>
            <div className="overflow-x-auto">
                <svg
                    viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="w-full h-auto"
                    style={{ minHeight: '500px' }}
                >
                    {layout.filter(d => d.depth === 2).map((d) => {
                        // d.depth === 2 是 stock 节点
                        const s: Stock = d.data.data;
                        const pct = s.pct_chg || 0;
                        const w = d.x1 - d.x0;
                        const h = d.y1 - d.y0;

                        // 字号根据面积自适应
                        const area = w * h;
                        const fontSize = area > 4000 ? 14 : area > 2000 ? 12 : area > 800 ? 10 : 9;
                        const showName = w > 40 && h > 24;
                        const showPct = w > 30 && h > 18;

                        return (
                            <a
                                key={d.data.name}
                                href={`/stocks/${s.ts_code}`}
                            >
                                <rect
                                    x={d.x0}
                                    y={d.y0}
                                    width={w}
                                    height={h}
                                    fill={getColor(pct)}
                                    stroke="rgba(0, 0, 0, 0.4)"
                                    strokeWidth={1}
                                    className="hover:stroke-white transition cursor-pointer"
                                />
                                {showName && (
                                    <text
                                        x={d.x0 + 4}
                                        y={d.y0 + fontSize + 2}
                                        fill="white"
                                        fontSize={fontSize}
                                        fontWeight={600}
                                        style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                                    >
                                        {s.name.length > Math.floor(w / (fontSize * 0.55))
                                            ? s.name.slice(0, Math.floor(w / (fontSize * 0.55)) - 1) + '…'
                                            : s.name}
                                    </text>
                                )}
                                {showPct && (
                                    <text
                                        x={d.x0 + 4}
                                        y={d.y0 + fontSize * 2 + 4}
                                        fill="white"
                                        fontSize={Math.max(fontSize - 2, 9)}
                                        style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                                    >
                                        {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                                    </text>
                                )}
                                <title>
                                    {`${s.name} (${s.ts_code})\n行业: ${s.industry}\n涨跌幅: ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%\n总市值: ¥${(s.total_mv / 1e8).toFixed(0)}亿`}
                                </title>
                            </a>
                        );
                    })}

                    {/* 行业标题(在每个 industry 块的顶部) */}
                    {layout.filter(d => d.depth === 1).map((d) => {
                        const w = d.x1 - d.x0;
                        if (w < 80) return null;  // 太窄不显示标题
                        return (
                            <text
                                key={`ind-${d.data.name}`}
                                x={d.x0 + 6}
                                y={d.y0 + 14}
                                fill="rgba(255, 255, 255, 0.9)"
                                fontSize={12}
                                fontWeight={700}
                                style={{ pointerEvents: 'none' }}
                            >
                                {d.data.name.length > Math.floor(w / 7)
                                    ? d.data.name.slice(0, Math.floor(w / 7) - 1) + '…'
                                    : d.data.name}
                            </text>
                        );
                    })}
                </svg>
            </div>
            <div className="text-xs text-gray-500 mt-3 px-2 flex justify-between">
                <span>数据源:Tushare daily + daily_basic + stock_basic</span>
                <span>红涨绿跌(A 股惯例)─ 颜色深度 ∝ 涨跌幅</span>
            </div>
        </div>
    );
}