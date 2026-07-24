/**
 * A 股 Symbol Info(头部报价)
 *
 * 数据:Tushare daily + daily_basic
 * 实时:Tushare 是日终,无盘中 tick,接受限制
 *
 * 用法:
 *   <AStockSymbolInfo symbol="000001" />
 */

'use client';

import { useEffect, useState } from 'react';
import { formatSymbolForTushare, formatSymbolForDisplay, getBoard } from '@/lib/tushare/mapping';

interface DailyCandle {
    ts_code: string;
    trade_date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    pre_close: number;
    change: number;
    pct_chg: number;
    vol: number;
    amount: number;
}

interface DailyBasic {
    turnover_rate: number;
    pe: number;
    pe_ttm: number;
    pb: number;
    total_mv: number;  // 万元
    circ_mv: number;
}

interface Props {
    symbol: string;
    height?: number;
}

export default function AStockSymbolInfo({ symbol, height = 170 }: Props) {
    const [quote, setQuote] = useState<DailyCandle | null>(null);
    const [basic, setBasic] = useState<DailyBasic | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState<string | null>(null);
    const [industry, setIndustry] = useState<string | null>(null);
    const [board, setBoard] = useState<string>('');

    useEffect(() => {
        const tsCode = formatSymbolForTushare(symbol);
        setBoard(getBoard(tsCode));

        const fetchData = async () => {
            try {
                setLoading(true);

                // 1. 拉最新 1 条 daily(用 trade_date 倒推避免 1 年 start_date 限制)
                //    注:不能用 days_back=365,Tushare 范围太大会返回 1 年前数据
                //    改用 trade_date 直接查最新交易日
                const fmt = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
                const today = new Date();
                let dailyData: any = null;
                for (let i = 0; i < 5; i++) {
                    const tradeDate = fmt(new Date(today.getTime() - i * 24 * 60 * 60 * 1000));
                    const dailyRes = await fetch(`/api/tushare/daily?ts_code=${tsCode}&trade_date=${tradeDate}`);
                    if (dailyRes.ok) {
                        const json = await dailyRes.json();
                        if (json.ok && json.data && json.data.length > 0) {
                            dailyData = { data: json.data, tradeDate };
                            break;
                        }
                    }
                }

                if (dailyData && dailyData.data && dailyData.data.length > 0) {
                    setQuote(dailyData.data[0]);
                }

                // 2. 拉 daily_basic(同日)
                if (dailyData && dailyData.data && dailyData.data[0]) {
                    const tradeDate = dailyData.tradeDate;
                    const basicRes = await fetch(`/api/tushare/daily_basic?ts_code=${tsCode}&trade_date=${tradeDate}`);
                    if (basicRes.ok) {
                        const basicData = await basicRes.json();
                        if (basicData.ok && basicData.data && basicData.data.length > 0) {
                            setBasic(basicData.data[0]);
                        }
                    }
                }

                // 3. 拉 stock_basic 拿 name + industry
                const basicStockRes = await fetch(`/api/tushare/stock_basic?ts_code=${tsCode}`);
                if (basicStockRes.ok) {
                    const bs = await basicStockRes.json();
                    if (bs.ok && bs.data && bs.data.length > 0) {
                        setName(bs.data[0].name);
                        setIndustry(bs.data[0].industry);
                    }
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [symbol]);

    const fmt = (n: number | null | undefined, decimals = 2) =>
        n == null ? '—' : n.toFixed(decimals);

    const fmtVol = (v: number) => {
        if (!v) return '—';
        if (v >= 1e8) return `${(v / 1e8).toFixed(2)}亿`;
        if (v >= 1e4) return `${(v / 1e4).toFixed(2)}万`;
        return v.toString();
    };

    const fmtMv = (mv: number) => {
        if (!mv) return '—';
        // total_mv 单位是万元 → 转为亿元
        if (mv >= 1e8) return `${(mv / 1e8).toFixed(0)}亿`;
        return `${(mv / 1e4).toFixed(0)}万`;
    };

    if (loading && !quote) {
        return (
            <div className="rounded-lg border border-white/10 bg-[#141414] p-6" style={{ height }}>
                <div className="text-gray-400 text-sm">📊 Loading {symbol}...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border border-rose-500/30 bg-[#141414] p-6" style={{ height }}>
                <div className="text-rose-400 text-sm">⚠️ {error}</div>
            </div>
        );
    }

    const isUp = (quote?.change ?? 0) >= 0;
    const colorClass = isUp ? 'text-rose-500' : 'text-emerald-500'; // A 股惯例:红涨绿跌

    return (
        <div className="rounded-lg border border-white/10 bg-[#141414] p-6" style={{ height }}>
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-bold text-white">{name || formatSymbolForDisplay(symbol)}</h2>
                    <span className="text-sm text-gray-400">{formatSymbolForTushare(symbol)}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">{board}</span>
                    {industry && <span className="text-xs text-gray-500">{industry}</span>}
                    <span className="text-xs text-gray-500 ml-auto">via Tushare</span>
                </div>
                <div className="flex items-baseline gap-4">
                    <div className="text-4xl font-bold text-white">¥{fmt(quote?.close)}</div>
                    <div className={`text-lg font-semibold ${colorClass}`}>
                        {isUp ? '+' : ''}{fmt(quote?.change)} ({isUp ? '+' : ''}{fmt(quote?.pct_chg)}%)
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-2 text-sm">
                    <div>
                        <div className="text-gray-500 text-xs">今开</div>
                        <div className="text-white">¥{fmt(quote?.open)}</div>
                    </div>
                    <div>
                        <div className="text-gray-500 text-xs">最高</div>
                        <div className="text-rose-500">¥{fmt(quote?.high)}</div>
                    </div>
                    <div>
                        <div className="text-gray-500 text-xs">最低</div>
                        <div className="text-emerald-500">¥{fmt(quote?.low)}</div>
                    </div>
                    <div>
                        <div className="text-gray-500 text-xs">昨收</div>
                        <div className="text-white">¥{fmt(quote?.pre_close)}</div>
                    </div>
                    <div>
                        <div className="text-gray-500 text-xs">成交量</div>
                        <div className="text-white">{fmtVol(quote?.vol ?? 0)}</div>
                    </div>
                    <div>
                        <div className="text-gray-500 text-xs">成交额</div>
                        <div className="text-white">{fmtVol(quote?.amount ?? 0)}</div>
                    </div>
                    {basic && (
                        <>
                            <div>
                                <div className="text-gray-500 text-xs">换手率</div>
                                <div className="text-white">{fmt(basic.turnover_rate)}%</div>
                            </div>
                            <div>
                                <div className="text-gray-500 text-xs">PE(TTM)</div>
                                <div className="text-white">{fmt(basic.pe_ttm)}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 text-xs">PB</div>
                                <div className="text-white">{fmt(basic.pb)}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 text-xs">总市值</div>
                                <div className="text-white">¥{fmtMv(basic.total_mv)}</div>
                            </div>
                            <div>
                                <div className="text-gray-500 text-xs">流通市值</div>
                                <div className="text-white">¥{fmtMv(basic.circ_mv)}</div>
                            </div>
                        </>
                    )}
                </div>
                {quote?.trade_date && (
                    <div className="text-xs text-gray-500 mt-2">
                        数据日期: {quote.trade_date} | Tushare 日终数据(T+0 16:00 后)
                    </div>
                )}
            </div>
        </div>
    );
}