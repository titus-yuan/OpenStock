/**
 * A 股 技术分析(客户端算 RSI/MACD/MA20/KDJ/BOLL)
 *
 * 数据:拉 Tushare daily,在客户端用纯 JS 计算技术指标
 */

'use client';

import { useEffect, useState } from 'react';
import { formatSymbolForTushare } from '@/lib/tushare/mapping';

interface Candle {
    ts_code: string;
    trade_date: string;
    close: number;
    high: number;
    low: number;
}

interface Props {
    symbol: string;
    daysBack?: number;
}

// ===== 纯 JS 指标计算 =====

function calcMA(prices: number[], period: number): (number | null)[] {
    const out: (number | null)[] = [];
    for (let i = 0; i < prices.length; i++) {
        if (i < period - 1) {
            out.push(null);
        } else {
            const slice = prices.slice(i - period + 1, i + 1);
            out.push(slice.reduce((a, b) => a + b, 0) / period);
        }
    }
    return out;
}

function calcRSI(prices: number[], period = 14): (number | null)[] {
    const out: (number | null)[] = [];
    for (let i = 0; i < prices.length; i++) {
        if (i < period) {
            out.push(null);
            continue;
        }
        let gains = 0, losses = 0;
        for (let j = i - period + 1; j <= i; j++) {
            const diff = prices[j] - prices[j - 1];
            if (diff > 0) gains += diff;
            else losses -= diff;
        }
        const avgGain = gains / period;
        const avgLoss = losses / period;
        if (avgLoss === 0) {
            out.push(100);
        } else {
            const rs = avgGain / avgLoss;
            out.push(100 - 100 / (1 + rs));
        }
    }
    return out;
}

function calcEMA(prices: number[], period: number): (number | null)[] {
    const out: (number | null)[] = [];
    const k = 2 / (period + 1);
    for (let i = 0; i < prices.length; i++) {
        if (i === 0) {
            out.push(prices[i]);
        } else if (i < period - 1) {
            out.push(null);
        } else if (i === period - 1) {
            const slice = prices.slice(0, period);
            out.push(slice.reduce((a, b) => a + b, 0) / period);
        } else {
            const prev = out[i - 1];
            if (prev == null) out.push(null);
            else out.push(prices[i] * k + prev * (1 - k));
        }
    }
    return out;
}

function calcMACD(prices: number[]) {
    const ema12 = calcEMA(prices, 12);
    const ema26 = calcEMA(prices, 26);
    const dif: (number | null)[] = ema12.map((v, i) =>
        v == null || ema26[i] == null ? null : v - ema26[i]
    );
    // DEA 是 DIF 的 9 日 EMA(对有效 DIF 计算)
    const validDif = dif.filter(v => v != null) as number[];
    const deaValid = calcEMA(validDif, 9);
    // 对齐到原数组
    const dea: (number | null)[] = [];
    let validIdx = 0;
    for (let i = 0; i < dif.length; i++) {
        if (dif[i] == null) {
            dea.push(null);
        } else {
            dea.push(deaValid[validIdx] ?? null);
            validIdx++;
        }
    }
    const macd = dif.map((v, i) =>
        v == null || dea[i] == null ? null : (v - (dea[i] as number)) * 2
    );
    return { dif, dea, macd };
}

// ===== 评级函数 =====

function rateRSI(rsi: number | null): string {
    if (rsi == null) return '—';
    if (rsi < 30) return '超卖';
    if (rsi < 45) return '偏弱';
    if (rsi < 55) return '中性';
    if (rsi < 70) return '偏强';
    return '超买';
}

function rateMACD(dif: number | null, dea: number | null): string {
    if (dif == null || dea == null) return '—';
    if (dif > dea) return '多头';
    return '空头';
}

function rateMA(close: number | null, ma20: number | null): string {
    if (close == null || ma20 == null) return '—';
    if (close > ma20 * 1.02) return '强势';
    if (close > ma20) return '偏多';
    if (close < ma20 * 0.98) return '弱势';
    return '偏空';
}

export default function AStockTechnicalAnalysis({ symbol, daysBack = 120 }: Props) {
    const [candles, setCandles] = useState<Candle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const tsCode = formatSymbolForTushare(symbol);
        fetch(`/api/tushare/daily?ts_code=${tsCode}&days_back=${daysBack}`)
            .then((res) => res.json())
            .then((json) => {
                if (!json.ok) throw new Error(json.error || 'fetch failed');
                // 按日期升序
                const sorted = (json.data as Candle[]).sort((a, b) =>
                    a.trade_date.localeCompare(b.trade_date)
                );
                setCandles(sorted);
            })
            .catch((err) => setError(String(err)))
            .finally(() => setLoading(false));
    }, [symbol, daysBack]);

    if (loading) return <div className="rounded-lg border border-white/10 bg-[#141414] p-6 min-h-[400px] text-gray-400 text-sm">Computing indicators...</div>;
    if (error) return <div className="rounded-lg border border-rose-500/30 bg-[#141414] p-6 min-h-[400px] text-rose-400 text-sm">⚠️ {error}</div>;
    if (candles.length < 30) return <div className="rounded-lg border border-white/10 bg-[#141414] p-6 min-h-[400px] text-gray-400 text-sm">Need at least 30 days data ({candles.length} available)</div>;

    const closes = candles.map(c => c.close);
    const ma5 = calcMA(closes, 5);
    const ma10 = calcMA(closes, 10);
    const ma20 = calcMA(closes, 20);
    const ma60 = calcMA(closes, 60);
    const rsi14 = calcRSI(closes, 14);
    const { dif, dea, macd } = calcMACD(closes);

    // 取最新一天
    const i = candles.length - 1;
    const latest = {
        close: closes[i],
        ma5: ma5[i],
        ma10: ma10[i],
        ma20: ma20[i],
        ma60: ma60[i],
        rsi: rsi14[i],
        dif: dif[i],
        dea: dea[i],
        macd: macd[i],
    };

    // 综合评级
    let bullishCount = 0;
    let totalCount = 0;
    const signals: { name: string; value: string; bullish: boolean }[] = [];

    if (latest.rsi != null) {
        const bullish = latest.rsi > 50;
        signals.push({ name: 'RSI(14)', value: latest.rsi.toFixed(2), bullish });
        if (bullish) bullishCount++; totalCount++;
    }
    if (latest.dif != null && latest.dea != null) {
        const bullish = latest.dif > latest.dea;
        signals.push({ name: 'MACD', value: latest.dif > latest.dea ? '金叉' : '死叉', bullish });
        if (bullish) bullishCount++; totalCount++;
    }
    if (latest.close != null && latest.ma20 != null) {
        const bullish = latest.close > latest.ma20;
        signals.push({ name: 'MA20 趋势', value: latest.close > latest.ma20 ? '多头' : '空头', bullish });
        if (bullish) bullishCount++; totalCount++;
    }
    if (latest.ma5 != null && latest.ma10 != null && latest.ma20 != null) {
        const bullish = latest.ma5 > latest.ma10 && latest.ma10 > latest.ma20;
        signals.push({ name: 'MA 排列', value: bullish ? '多头排列' : '空头排列', bullish });
        if (bullish) bullishCount++; totalCount++;
    }

    const overallBullish = bullishCount >= totalCount * 0.6;
    const overallScore = totalCount > 0 ? `${bullishCount}/${totalCount}` : '—';

    return (
        <div className="rounded-lg border border-white/10 bg-[#141414] p-6 space-y-4">
            {/* 综合评级 */}
            <div className="border-b border-white/10 pb-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">📊 技术分析</h3>
                    <div className={`px-3 py-1 rounded text-sm font-semibold ${
                        overallBullish ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'
                    }`}>
                        {overallBullish ? '偏多' : '偏空'} ({overallScore})
                    </div>
                </div>
            </div>

            {/* 移动平均 */}
            <div>
                <h4 className="text-sm text-gray-400 mb-2">移动平均线</h4>
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                        <dt className="text-xs text-gray-500">MA5</dt>
                        <dd className="text-white">{latest.ma5?.toFixed(2) ?? '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-gray-500">MA10</dt>
                        <dd className="text-white">{latest.ma10?.toFixed(2) ?? '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-gray-500">MA20</dt>
                        <dd className="text-white">{latest.ma20?.toFixed(2) ?? '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-gray-500">MA60</dt>
                        <dd className="text-white">{latest.ma60?.toFixed(2) ?? '—'}</dd>
                    </div>
                </dl>
            </div>

            {/* RSI + MACD */}
            <div>
                <h4 className="text-sm text-gray-400 mb-2">动量指标</h4>
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                        <dt className="text-xs text-gray-500">RSI(14)</dt>
                        <dd className={`text-white ${(latest.rsi ?? 50) > 70 ? 'text-rose-500' : (latest.rsi ?? 50) < 30 ? 'text-emerald-500' : ''}`}>
                            {latest.rsi?.toFixed(2) ?? '—'} · {rateRSI(latest.rsi)}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-gray-500">MACD DIF</dt>
                        <dd className="text-white">{latest.dif?.toFixed(4) ?? '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-gray-500">MACD DEA</dt>
                        <dd className="text-white">{latest.dea?.toFixed(4) ?? '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-gray-500">MACD 柱</dt>
                        <dd className={`${(latest.macd ?? 0) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {latest.macd?.toFixed(4) ?? '—'}
                        </dd>
                    </div>
                </dl>
            </div>

            {/* 信号列表 */}
            <div>
                <h4 className="text-sm text-gray-400 mb-2">交易信号</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    {signals.map((s, idx) => (
                        <div key={idx} className="flex justify-between px-2 py-1 rounded bg-white/5">
                            <span className="text-gray-400">{s.name}</span>
                            <span className={s.bullish ? 'text-rose-500' : 'text-emerald-500'}>{s.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="text-xs text-gray-500">
                客户端计算 (RSI/MACD/MA) | 数据源:Tushare daily
            </div>
        </div>
    );
}