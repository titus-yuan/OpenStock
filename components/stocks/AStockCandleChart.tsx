/**
 * A 股 K 线图(lightweight-charts + Tushare daily)
 *
 * 用法:
 *   <AStockCandleChart symbol="000001" height={500} />
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, ColorType } from 'lightweight-charts';
import { formatSymbolForTushare } from '@/lib/tushare/mapping';

interface Candle {
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

interface Props {
    symbol: string;
    height?: number;
    daysBack?: number;
}

export default function AStockCandleChart({ symbol, height = 500, daysBack = 365 }: Props) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [latestCandle, setLatestCandle] = useState<Candle | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        setLoading(true);
        setError(null);

        const tsCode = formatSymbolForTushare(symbol);

        const drawChart = (candles: Candle[]) => {
            if (!containerRef.current || candles.length === 0) {
                setError('No data');
                setLoading(false);
                return;
            }

            // 按日期升序
            const sorted = [...candles].sort((a, b) =>
                a.trade_date.localeCompare(b.trade_date)
            );

            // Tushare date: "20250725" → "2025-07-25"
            const ohlc = sorted.map((c) => ({
                time: c.trade_date.slice(0, 4) + '-' + c.trade_date.slice(4, 6) + '-' + c.trade_date.slice(6, 8) as any,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
            }));

            const vol = sorted.map((c) => ({
                time: c.trade_date.slice(0, 4) + '-' + c.trade_date.slice(4, 6) + '-' + c.trade_date.slice(6, 8) as any,
                value: c.vol,
                color: c.close >= c.pre_close
                    ? 'rgba(248, 73, 96, 0.5)'    // 红涨(A 股惯例)
                    : 'rgba(0, 191, 128, 0.5)',  // 绿跌
            }));

            const chart = createChart(containerRef.current, {
                width: containerRef.current.clientWidth,
                height,
                layout: {
                    background: { type: ColorType.Solid, color: '#141414' },
                    textColor: '#DBDBDB',
                },
                grid: {
                    vertLines: { color: 'rgba(240, 243, 250, 0.05)' },
                    horzLines: { color: 'rgba(240, 243, 250, 0.05)' },
                },
                timeScale: {
                    borderColor: '#2B2B43',
                    timeVisible: true,
                    secondsVisible: false,
                },
                rightPriceScale: { borderColor: '#2B2B43' },
            });

            // A 股颜色:红涨绿跌
            const candleSeries = chart.addSeries(CandlestickSeries, {
                upColor: '#F84960',
                downColor: '#00BF80',
                borderUpColor: '#F84960',
                borderDownColor: '#00BF80',
                wickUpColor: '#F84960',
                wickDownColor: '#00BF80',
            });
            candleSeries.setData(ohlc);

            const volumeSeries = chart.addSeries(HistogramSeries, {
                priceFormat: { type: 'volume' },
                priceScaleId: 'volume_scale',
            });
            volumeSeries.setData(vol);

            chart.priceScale('volume_scale').applyOptions({
                scaleMargins: { top: 0.8, bottom: 0 },
            });

            chart.timeScale().fitContent();

            // ResizeObserver
            const ro = new ResizeObserver((entries) => {
                const entry = entries[0];
                if (entry && chart) {
                    chart.applyOptions({ width: entry.contentRect.width });
                }
            });
            if (containerRef.current) ro.observe(containerRef.current);

            (containerRef.current as any)._chart = chart;
            (containerRef.current as any)._ro = ro;

            setLatestCandle(sorted[sorted.length - 1]);
            setLoading(false);
        };

        // 拉数据
        fetch(`/api/tushare/daily?ts_code=${tsCode}&days_back=${daysBack}`)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((json) => {
                if (!json.ok) throw new Error(json.error || 'fetch failed');
                drawChart(json.data);
            })
            .catch((err) => {
                setError(err instanceof Error ? err.message : String(err));
                setLoading(false);
            });

        return () => {
            if (containerRef.current) {
                const chart = (containerRef.current as any)._chart;
                const ro = (containerRef.current as any)._ro;
                if (chart) chart.remove();
                if (ro) ro.disconnect();
                (containerRef.current as any)._chart = null;
                (containerRef.current as any)._ro = null;
            }
        };
    }, [symbol, daysBack, height]);

    const fmt = (n: number | null | undefined) => n == null ? '—' : n.toFixed(2);

    return (
        <div className="relative w-full" style={{ height }}>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 z-10 bg-black/40 rounded">
                    📊 Loading {symbol}...
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 z-10 bg-black/40 rounded p-4">
                    <p className="text-sm mb-2">⚠️ Failed to load chart</p>
                    <p className="text-xs text-gray-500">{error}</p>
                </div>
            )}
            <div ref={containerRef} className="w-full rounded" style={{ height }} />
            {latestCandle && !loading && (
                <div className="absolute top-2 left-2 bg-black/70 px-3 py-1.5 rounded text-xs">
                    <div className="text-white font-semibold">¥{fmt(latestCandle.close)}</div>
                    <div className={latestCandle.change >= 0 ? 'text-rose-500' : 'text-emerald-500'}>
                        {latestCandle.change >= 0 ? '+' : ''}{fmt(latestCandle.change)} ({fmt(latestCandle.pct_chg)}%)
                    </div>
                </div>
            )}
            <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-black/60 px-2 py-1 rounded">
                Tushare daily + lightweight-charts (本地)
            </div>
        </div>
    );
}