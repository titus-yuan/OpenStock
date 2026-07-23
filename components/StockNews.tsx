'use client';

import { useEffect, useState } from 'react';

interface StockNewsProps {
    symbol: string;
    apiKey: string;
    height?: number;
}

interface NewsArticle {
    id?: number;
    category?: string;
    datetime?: number;
    headline?: string;
    image?: string;
    related?: string;
    source?: string;
    summary?: string;
    url?: string;
}

export default function StockNews({ symbol, apiKey, height = 800 }: StockNewsProps) {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const now = new Date();
                const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                const fmt = (d: Date) => d.toISOString().slice(0, 10);
                const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${fmt(from)}&to=${fmt(now)}&token=${apiKey}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);
                const data: NewsArticle[] = await res.json();
                setArticles((data || []).slice(0, 15)); // top 15
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setLoading(false);
            }
        };
        fetchNews();
    }, [symbol, apiKey]);

    const timeAgo = (unix?: number) => {
        if (!unix) return '';
        const sec = Math.floor(Date.now() / 1000 - unix);
        if (sec < 60) return `${sec}s ago`;
        if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
        if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
        return `${Math.floor(sec / 86400)}d ago`;
    };

    if (loading) {
        return (
            <div className="rounded-lg border border-white/10 bg-[#141414] p-6" style={{ minHeight: height }}>
                <div className="text-gray-400 text-sm">Loading {symbol} news...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border border-rose-500/30 bg-[#141414] p-6" style={{ minHeight: height }}>
                <div className="text-rose-400 text-sm">⚠️ {error}</div>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-white/10 bg-[#141414] p-6" style={{ minHeight: height }}>
            <h3 className="text-lg font-semibold text-white mb-4">{symbol} · News (7 days)</h3>
            {articles.length === 0 ? (
                <p className="text-gray-500 text-sm">No recent news</p>
            ) : (
                <ul className="space-y-3">
                    {articles.map((a) => (
                        <li key={a.id} className="border-b border-white/5 pb-3 last:border-0">
                            <a
                                href={a.url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-white hover:text-blue-400 font-medium block mb-1"
                            >
                                {a.headline}
                            </a>
                            <div className="flex gap-2 text-xs text-gray-500">
                                <span>{a.source}</span>
                                <span>·</span>
                                <span>{timeAgo(a.datetime)}</span>
                                {a.category && (
                                    <>
                                        <span>·</span>
                                        <span className="text-blue-400">{a.category}</span>
                                    </>
                                )}
                            </div>
                            {a.summary && (
                                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{a.summary}</p>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            <div className="mt-4 text-xs text-gray-500">
                Source: Finnhub /company-news (free tier)
            </div>
        </div>
    );
}