'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, AreaSeries, ColorType, LineSeries } from 'lightweight-charts';

interface CandlestickChartProps {
    symbol: string;
    apiKey?: string;
    height?: number;
}

interface FinnhubQuote {
    c?: number;   // current
    pc?: number;  // previous close
    h?: number;   // high
    l?: number;   // low
    o?: number;   // open
    d?: number;   // change
    dp?: number;  // change percent
    t?: number;   // timestamp
}

export default function CandlestickChart({ symbol, apiKey, height = 500 }: CandlestickChartProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dataSource, setDataSource] = useState<'finnhub' | 'sparkline'>('finnhub');
    const [quote, setQuote] = useState<FinnhubQuote | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        setLoading(true);
        setError(null);

        const renderChart = (dataPoints: { time: any; value: number }[], source: 'finnhub' | 'sparkline', q?: FinnhubQuote) => {
            if (!containerRef.current || dataPoints.length === 0) return;

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

            const isUp = (q?.d ?? 0) >= 0;
            const lineColor = isUp ? '#0FEDBE' : '#FF5757';
            const topColor = isUp ? 'rgba(15, 237, 190, 0.4)' : 'rgba(255, 87, 87, 0.4)';
            const bottomColor = isUp ? 'rgba(15, 237, 190, 0.05)' : 'rgba(255, 87, 87, 0.05)';

            const areaSeries = chart.addSeries(AreaSeries, {
                lineColor,
                topColor,
                bottomColor,
                lineWidth: 2,
            });
            areaSeries.setData(dataPoints);
            chart.timeScale().fitContent();

            const ro = new ResizeObserver((entries) => {
                const entry = entries[0];
                if (entry && chart) chart.applyOptions({ width: entry.contentRect.width });
            });
            if (containerRef.current) ro.observe(containerRef.current);

            (containerRef.current as any)._chart = chart;
            (containerRef.current as any)._ro = ro;
            setDataSource(source);
            setQuote(q || null);
            setLoading(false);
        };

        // Try Finnhub /quote (current snapshot — 2 data points: prev close + current)
        if (apiKey) {
            fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`)
                .then((res) => {
                    if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);
                    return res.json() as Promise<FinnhubQuote>;
                })
                .then((q) => {
                    if (!q.c) throw new Error('No quote data from Finnhub');
                    // Synthesize: 2-point area chart (prev close → current)
                    const now = Math.floor(Date.now() / 1000);
                    const dayAgo = now - 86400;
                    const dataPoints = [
                        { time: dayAgo as any, value: q.pc ?? q.c },
                        { time: now as any, value: q.c },
                    ];
                    renderChart(dataPoints, 'finnhub', q);
                })
                .catch((err) => {
                    console.error('Finnhub chart fetch failed:', err);
                    setError(err instanceof Error ? err.message : String(err));
                    setLoading(false);
                });
        } else {
            setError('No Finnhub API key configured');
            setLoading(false);
        }

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
    }, [symbol, apiKey, height]);

    const fmt = (n?: number) => (n == null ? '—' : n.toFixed(2));
    const isUp = (quote?.d ?? 0) >= 0;

    return (
        <div className="relative w-full" style={{ height }}>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 z-10 bg-black/40 rounded">
                    📊 Loading {symbol} chart from Finnhub...
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 z-10 bg-black/40 rounded p-4">
                    <p className="text-sm mb-2">⚠️ Chart unavailable</p>
                    <p className="text-xs text-gray-500">{error}</p>
                </div>
            )}
            <div ref={containerRef} className="w-full rounded" style={{ height }} />
            {dataSource === 'finnhub' && !loading && quote && (
                <div className="absolute top-2 left-2 bg-black/70 px-3 py-1.5 rounded text-xs">
                    <div className="text-white font-semibold">${fmt(quote.c)}</div>
                    <div className={isUp ? 'text-emerald-400' : 'text-rose-400'}>
                        {isUp ? '▲' : '▼'} {fmt(quote.d)} ({fmt(quote.dp)}%)
                    </div>
                </div>
            )}
            <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-black/60 px-2 py-1 rounded">
                Source: Finnhub /quote (free tier — 2-point snapshot)
            </div>
        </div>
    );
}