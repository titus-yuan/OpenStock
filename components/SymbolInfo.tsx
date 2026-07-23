'use client';

import { useEffect, useState } from 'react';

interface SymbolInfoProps {
    symbol: string;
    apiKey: string;
    height?: number;
}

interface FinnhubQuote {
    c?: number;   // current
    d?: number;   // change
    dp?: number;  // change percent
    h?: number;   // high
    l?: number;   // low
    o?: number;   // open
    pc?: number;  // previous close
    t?: number;   // timestamp
}

export default function SymbolInfo({ symbol, apiKey, height = 170 }: SymbolInfoProps) {
    const [quote, setQuote] = useState<FinnhubQuote | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchQuote = async () => {
            try {
                const res = await fetch(
                    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`
                );
                if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);
                const data = await res.json();
                setQuote(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setLoading(false);
            }
        };
        fetchQuote();
        const interval = setInterval(fetchQuote, 30000); // refresh every 30s
        return () => clearInterval(interval);
    }, [symbol, apiKey]);

    const fmt = (n?: number) => (n == null ? '—' : n.toFixed(2));
    const isUp = (quote?.d ?? 0) >= 0;
    const colorClass = isUp ? 'text-emerald-400' : 'text-rose-400';

    if (loading && !quote) {
        return (
            <div className="rounded-lg border border-white/10 bg-[#141414] p-6" style={{ height }}>
                <div className="text-gray-400 text-sm">Loading {symbol}...</div>
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

    return (
        <div className="rounded-lg border border-white/10 bg-[#141414] p-6" style={{ height }}>
            <div className="flex flex-col gap-3">
                <div className="flex items-baseline gap-3">
                    <h2 className="text-2xl font-bold text-white">{symbol}</h2>
                    <span className="text-xs text-gray-500">via Finnhub (free)</span>
                </div>
                <div className="flex items-baseline gap-4">
                    <div className="text-4xl font-bold text-white">
                        ${fmt(quote?.c)}
                    </div>
                    <div className={`text-lg font-semibold ${colorClass}`}>
                        {isUp ? '+' : ''}{fmt(quote?.d)} ({isUp ? '+' : ''}{fmt(quote?.dp)}%)
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                    <div>
                        <div className="text-gray-500 text-xs">Open</div>
                        <div className="text-white">${fmt(quote?.o)}</div>
                    </div>
                    <div>
                        <div className="text-gray-500 text-xs">High</div>
                        <div className="text-emerald-400">${fmt(quote?.h)}</div>
                    </div>
                    <div>
                        <div className="text-gray-500 text-xs">Low</div>
                        <div className="text-rose-400">${fmt(quote?.l)}</div>
                    </div>
                    <div>
                        <div className="text-gray-500 text-xs">Prev Close</div>
                        <div className="text-white">${fmt(quote?.pc)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}