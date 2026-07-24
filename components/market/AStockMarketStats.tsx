/**
 * A 股市场数据 Tab 组件
 *
 * 4 个 tab:
 * 1. 资金流向 ── 主力净流入 Top 10(可切换净流出)
 * 2. 换手率 ── 今日换手率 Top 10
 * 3. 涨停 ── 涨幅 ≥ 9.9% Top 10
 * 4. 跌停 ── 跌幅 ≤ -9.9% Top 10
 *
 * 全部走 PG(资金流/换手/涨跌停数据已采集)
 */

'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

type TabKey = 'moneyflow' | 'turnover' | 'limit_up' | 'limit_down';

const TABS: { key: TabKey; label: string; icon: any; color: string }[] = [
    { key: 'moneyflow', label: '资金流向', icon: TrendingUp, color: 'text-blue-400' },
    { key: 'turnover', label: '换手率', icon: Activity, color: 'text-purple-400' },
    { key: 'limit_up', label: '涨停', icon: ArrowUpCircle, color: 'text-rose-500' },
    { key: 'limit_down', label: '跌停', icon: ArrowDownCircle, color: 'text-emerald-500' },
];

export default function AStockMarketStats() {
    const [tab, setTab] = useState<TabKey>('moneyflow');
    const [flowType, setFlowType] = useState<'net_inflow' | 'net_outflow'>('net_inflow');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tradeDate, setTradeDate] = useState<string>('');

    useEffect(() => {
        const url = tab === 'moneyflow'
            ? `/api/tushare/moneyflow_top?type=${flowType}`
            : `/api/tushare/${tab}`;
        setLoading(true);
        fetch(url)
            .then((r) => r.json())
            .then((json) => {
                if (json.ok) {
                    setData(json.data || []);
                    setTradeDate(json.tradeDate || '');
                }
            })
            .catch((e) => console.error(e))
            .finally(() => setLoading(false));
    }, [tab, flowType]);

    // 格式化资金净额(万元)
    const fmtAmount = (n: number): string => {
        if (n == null) return '—';
        const abs = Math.abs(n);
        if (abs >= 1e8) return `${(n / 1e8).toFixed(2)}亿`;
        if (abs >= 1e4) return `${(n / 1e4).toFixed(2)}万`;
        return n.toFixed(0);
    };

    return (
        <div className="rounded-lg border border-white/10 bg-[#141414] flex flex-col h-full">
            {/* Tab 头部 */}
            <div className="flex items-center justify-between border-b border-white/5 px-2 py-1">
                <div className="flex">
                    {TABS.map(t => {
                        const Icon = t.icon;
                        const isActive = tab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-all ${
                                    isActive
                                        ? `${t.color} border-b-2 border-current`
                                        : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {t.label}
                            </button>
                        );
                    })}
                </div>
                {/* 资金流向内嵌子切换 */}
                {tab === 'moneyflow' && (
                    <div className="flex gap-1 text-[10px]">
                        <button
                            onClick={() => setFlowType('net_inflow')}
                            className={`px-2 py-0.5 rounded ${
                                flowType === 'net_inflow'
                                    ? 'bg-rose-500/20 text-rose-400'
                                    : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            净流入
                        </button>
                        <button
                            onClick={() => setFlowType('net_outflow')}
                            className={`px-2 py-0.5 rounded ${
                                flowType === 'net_outflow'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            净流出
                        </button>
                    </div>
                )}
            </div>

            {/* 数据来源日期 */}
            {tradeDate && (
                <div className="px-3 py-1 text-[10px] text-gray-600 border-b border-white/5">
                    数据日期:{tradeDate} {tab === 'moneyflow' && '(资金流向数据可能滞后 2 周)'}
                </div>
            )}

            {/* 列表(占满剩余空间,内容超出滚动) */}
            <div className="flex-1 overflow-y-auto p-2 min-h-0">
                {loading ? (
                    <div className="text-center py-8 text-gray-500 text-xs">加载中...</div>
                ) : data.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-xs">暂无数据</div>
                ) : (
                    <ul className="space-y-1">
                        {data.map((row, idx) => (
                            <li key={row.ts_code}>
                                <a
                                    href={`/stocks/${row.ts_code}`}
                                    className="block hover:bg-white/5 rounded px-2 py-1.5 transition-colors"
                                >
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-gray-600 font-mono w-4 text-right">{idx + 1}</span>
                                        <span className="text-white font-medium truncate flex-1 min-w-0">
                                            {row.name}
                                            <span className="text-gray-600 ml-1 text-[10px] font-mono">{row.ts_code}</span>
                                        </span>
                                        {tab === 'moneyflow' && (
                                            <span className={`font-mono font-medium tabular-nums ${
                                                row.net_mf_amount > 0 ? 'text-rose-400' : 'text-emerald-400'
                                            }`}>
                                                {row.net_mf_amount > 0 ? '+' : ''}{fmtAmount(row.net_mf_amount)}
                                            </span>
                                        )}
                                        {tab === 'turnover' && (
                                            <span className="font-mono font-medium text-purple-400 tabular-nums">
                                                {(row.turnover_rate ?? 0).toFixed(2)}%
                                            </span>
                                        )}
                                        {tab === 'limit_up' && (
                                            <span className="font-mono font-medium text-rose-400 tabular-nums">
                                                {(row.pct_chg ?? 0) > 0 ? '+' : ''}{(row.pct_chg ?? 0).toFixed(2)}%
                                            </span>
                                        )}
                                        {tab === 'limit_down' && (
                                            <span className="font-mono font-medium text-emerald-400 tabular-nums">
                                                {(row.pct_chg ?? 0).toFixed(2)}%
                                            </span>
                                        )}
                                    </div>
                                    {/* 第二行(辅助信息) */}
                                    {tab === 'moneyflow' && row.elg_net != null && (
                                        <div className="flex items-center gap-2 pl-6 mt-0.5 text-[10px] text-gray-600">
                                            <span>特大单: {row.elg_net > 0 ? '+' : ''}{fmtAmount(row.elg_net)}</span>
                                            <span>大单: {row.lg_net > 0 ? '+' : ''}{fmtAmount(row.lg_net)}</span>
                                            <span className="text-gray-700">|</span>
                                            <span>{row.industry}</span>
                                        </div>
                                    )}
                                    {(tab === 'turnover' || tab === 'limit_up' || tab === 'limit_down') && (
                                        <div className="flex items-center gap-2 pl-6 mt-0.5 text-[10px] text-gray-600">
                                            {row.close != null && <span>¥¥{(row.close ?? 0).toFixed(2)}</span>}
                                            {row.pct_chg != null && tab !== 'limit_up' && tab !== 'limit_down' && (
                                                <span className={row.pct_chg >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                                                    {row.pct_chg >= 0 ? '+' : ''}{(row.pct_chg ?? 0).toFixed(2)}%
                                                </span>
                                            )}
                                            {row.industry && <span className="text-gray-700">|</span>}
                                            {row.industry && <span>{row.industry}</span>}
                                            {row.limit_type && (
                                                <span className="text-gray-700">|</span>
                                            )}
                                            {row.limit_type && <span>{row.limit_type}涨停</span>}
                                        </div>
                                    )}
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}