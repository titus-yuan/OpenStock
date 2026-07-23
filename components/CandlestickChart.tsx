'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, LineSeries, AreaSeries, ColorType } from 'lightweight-charts';

interface CandlestickChartProps {
    symbol: string;
    height?: number;
    resolution?: 'D' | 'W' | 'M';
    fromDaysBack?: number;
}

interface YahooChartResponse {
    chart?: {
        result?: Array<{
            meta?: { symbol?: string };
            timestamp?: number[];
            indicators?: {
                quote?: Array<{
                    open?: (number | null)[];
                    high?: (number | null)[];
                    low?: (number | null)[];
                    close?: (number | null)[];
                    volume?: (number | null)[];
                }>;
            };
        }>;
        error?: { code: string; description: string } | null;
    };
}

interface FinnhubQuote {
    c?: number;
    d?: number;
    dp?: number;
    h?: number;
    l?: number;
    o?: number;
    pc?: number;
}

export default function CandlestickChart({
    symbol,
    height = 500,
    resolution = 'D',
    fromDaysBack = 365,
}: CandlestickChartProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [dataSource, setDataSource] = useState<'yahoo' | 'finnhub'>('yahoo');

    useEffect(() => {
        if (!containerRef.current) return;
        setLoading(true);
        setError(null);

        const yahooInterval = resolution === 'W' ? '1wk' : resolution === 'M' ? '1mo' : '1d';
        const yahooRange =
            fromDaysBack <= 30 ? '1mo' :
            fromDaysBack <= 90 ? '3mo' :
            fromDaysBack <= 180 ? '6mo' :
            fromDaysBack <= 365 ? '1y' :
            fromDaysBack <= 730 ? '2y' :
            '5y';

        // Use our own Next.js API route as proxy to avoid Yahoo rate limits on direct fetch
        const yahooUrl = `/api/yahoo/${encodeURIComponent(symbol)}?interval=${yahooInterval}&range=${yahooRange}`;

        const renderAreaChart = (dataPoints: { time: any; value: number }[], source: 'yahoo' | 'finnhub') => {
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

            const areaSeries = chart.addSeries(AreaSeries, {
                lineColor: '#0FEDBE',
                topColor: 'rgba(15, 237, 190, 0.4)',
                bottomColor: 'rgba(15, 237, 190, 0.05)',
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
            setLoading(false);
        };

        // Try Yahoo Finance first
        fetch(yahooUrl)
            .then((res) => {
                if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
                return res.json() as Promise<YahooChartResponse>;
            })
            .then((data) => {
                const err = data.chart?.error;
                if (err) throw new Error(`Yahoo: ${err.description}`);
                const result = data.chart?.result?.[0];
                if (!result || !result.timestamp || result.timestamp.length === 0) {
                    throw new Error('No data from Yahoo');
                }
                const timestamps = result.timestamp!;
                const quote = result.indicators?.quote?.[0];
                if (!quote) throw new Error('Missing quote data');

                const dataPoints: { time: any; value: number }[] = [];
                for (let i = 0; i < timestamps.length; i++) {
                    const close = quote.close?.[i];
                    if (close == null) continue;
                    dataPoints.push({
                        time: timestamps[i] as any,
                        value: close,
                    });
                }
                if (dataPoints.length === 0) throw new Error('No valid close prices');
                renderAreaChart(dataPoints, 'yahoo');
            })
            .catch((yahooErr) => {
                // Fallback: Finnhub quote only (current price, single point)
                console.warn('Yahoo failed, falling back to Finnhub:', yahooErr);
                const finnhubKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
                if (!finnhubKey) {
                    throw new Error(`Yahoo failed (${yahooErr.message}); no Finnhub key for fallback`);
                }
                return fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${finnhubKey}`)
                    .then((res) => res.json() as Promise<FinnhubQuote>)
                    .then((q) => {
                        if (!q.c) throw new Error('No quote from Finnhub');
                        // Single point chart - show current price as flat line
                        const now = Math.floor(Date.now() / 1000);
                        const dayAgo = now - 86400;
                        renderAreaChart(
                            [
                                { time: dayAgo as any, value: q.pc ?? q.c },
                                { time: now as any, value: q.c },
                            ],
                            'finnhub'
                        );
                    });
            })
            .catch((finalErr) => {
                console.error('Chart error:', finalErr);
                setError(finalErr instanceof Error ? finalErr.message : String(finalErr));
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
    }, [symbol, height, resolution, fromDaysBack]);

    return (
        <div className="relative w-full" style={{ height }}>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 z-10 bg-black/40 rounded">
                    📊 Loading {symbol} chart...
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 z-10 bg-black/40 rounded p-4">
                    <p className="text-sm mb-2">⚠️ Failed to load chart</p>
                    <p className="text-xs text-gray-500">{error}</p>
                </div>
            )}
            <div ref={containerRef} className="w-full rounded" style={{ height }} />
            {dataSource === 'finnhub' && !loading && (
                <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-black/60 px-2 py-1 rounded">
                    Source: Finnhub (current price only)
                </div>
            )}
        </div>
    );
}