'use client';

import { useEffect, useState } from 'react';

interface CompanyProfileProps {
    symbol: string;
    apiKey: string;
    height?: number;
}

interface FinnhubProfile {
    country?: string;
    currency?: string;
    exchange?: string;
    ipo?: string;
    logo?: string;
    marketCapitalization?: number;  // in millions
    name?: string;
    phone?: string;
    shareOutstanding?: number;
    ticker?: string;
    weburl?: string;
    finnhubIndustry?: string;
}

export default function CompanyProfile({ symbol, apiKey, height = 440 }: CompanyProfileProps) {
    const [profile, setProfile] = useState<FinnhubProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch(
                    `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`
                );
                if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);
                const data = await res.json();
                setProfile(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [symbol, apiKey]);

    if (loading) {
        return (
            <div className="rounded-lg border border-white/10 bg-[#141414] p-6" style={{ minHeight: height }}>
                <div className="text-gray-400 text-sm">Loading company profile...</div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="rounded-lg border border-rose-500/30 bg-[#141414] p-6" style={{ minHeight: height }}>
                <div className="text-rose-400 text-sm">⚠️ {error || 'No profile data'}</div>
            </div>
        );
    }

    const marketCapB = profile.marketCapitalization ? (profile.marketCapitalization / 1000).toFixed(2) : '—';

    return (
        <div className="rounded-lg border border-white/10 bg-[#141414] p-6" style={{ minHeight: height }}>
            <div className="flex items-start gap-4 mb-4">
                {profile.logo && (
                    <img src={profile.logo} alt={profile.name} className="w-12 h-12 rounded" />
                )}
                <div>
                    <h3 className="text-xl font-bold text-white">{profile.name || symbol}</h3>
                    <p className="text-sm text-gray-400">
                        {profile.ticker} · {profile.exchange} · {profile.country}
                    </p>
                </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                    <dt className="text-gray-500 text-xs">Industry</dt>
                    <dd className="text-white">{profile.finnhubIndustry || '—'}</dd>
                </div>
                <div>
                    <dt className="text-gray-500 text-xs">Currency</dt>
                    <dd className="text-white">{profile.currency || '—'}</dd>
                </div>
                <div>
                    <dt className="text-gray-500 text-xs">Market Cap</dt>
                    <dd className="text-white">${marketCapB}B</dd>
                </div>
                <div>
                    <dt className="text-gray-500 text-xs">IPO Date</dt>
                    <dd className="text-white">{profile.ipo || '—'}</dd>
                </div>
                <div className="col-span-2">
                    <dt className="text-gray-500 text-xs">Website</dt>
                    <dd className="text-white truncate">
                        {profile.weburl ? (
                            <a href={profile.weburl} target="_blank" rel="noopener" className="text-blue-400 hover:underline">
                                {profile.weburl}
                            </a>
                        ) : '—'}
                    </dd>
                </div>
            </dl>
            <div className="mt-4 text-xs text-gray-500">
                Source: Finnhub /stock/profile2
            </div>
        </div>
    );
}