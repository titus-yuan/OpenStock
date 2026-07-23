import TradingViewWidget from "@/components/TradingViewWidget";
import CandlestickChart from "@/components/CandlestickChart";
import SymbolInfo from "@/components/SymbolInfo";
import CompanyProfile from "@/components/CompanyProfile";
import StockNews from "@/components/StockNews";
import WatchlistButton from "@/components/WatchlistButton";
import StockSentimentCard from "@/components/stocks/StockSentimentCard";
import {
    SYMBOL_INFO_WIDGET_CONFIG,
    CANDLE_CHART_WIDGET_CONFIG,
    BASELINE_WIDGET_CONFIG,
    TECHNICAL_ANALYSIS_WIDGET_CONFIG,
    COMPANY_PROFILE_WIDGET_CONFIG,
    COMPANY_FINANCIALS_WIDGET_CONFIG,
} from "@/lib/constants";

import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import { isStockInWatchlist } from '@/lib/actions/watchlist.actions';
import { getStockSentimentInsights } from '@/lib/actions/adanos.actions';
import { formatSymbolForTradingView } from '@/lib/utils';

export default async function StockDetails({ params }: StockDetailsPageProps) {
    const { symbol } = await params;
    const tvSymbol = formatSymbolForTradingView(symbol);
    const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;
    const finnhubKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? '';

    const session = await auth.api.getSession({
        headers: await headers()
    });
    const userId = session?.user?.id;
    const [isInWatchlist, sentimentInsights] = await Promise.all([
        userId ? isStockInWatchlist(userId, symbol) : Promise.resolve(false),
        getStockSentimentInsights(symbol),
    ]);

    return (
        <div className="flex min-h-screen p-4 md:p-6 lg:p-8">
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                {/* Left column */}
                <div className="flex flex-col gap-6">
                    {/* 1. Symbol Info — Finnhub /quote */}
                    <SymbolInfo symbol={symbol.toUpperCase()} apiKey={finnhubKey} height={170} />

                    {/* 2. Candle Chart — lightweight-charts + Finnhub */}
                    <div className="custom-chart rounded-lg overflow-hidden">
                        <CandlestickChart
                            symbol={symbol.toUpperCase()}
                            apiKey={finnhubKey}
                            height={600}
                        />
                    </div>

                    {/* 3. Baseline Chart — same as Candle (Finnhub fallback) */}
                    <div className="custom-chart rounded-lg overflow-hidden">
                        <CandlestickChart
                            symbol={symbol.toUpperCase()}
                            apiKey={finnhubKey}
                            height={600}
                        />
                    </div>
                </div>

                {/* Right column */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <WatchlistButton
                            symbol={symbol.toUpperCase()}
                            company={symbol.toUpperCase()}
                            isInWatchlist={isInWatchlist}
                            userId={userId}
                        />
                    </div>

                    <StockSentimentCard insight={sentimentInsights} />

                    {/* 4. Technical Analysis — placeholder (Finnhub free tier has no indicators) */}
                    <div className="rounded-lg border border-white/10 bg-[#141414] p-6" style={{ minHeight: 400 }}>
                        <h3 className="text-lg font-semibold text-white mb-2">Technical Analysis</h3>
                        <p className="text-sm text-gray-400 mb-2">
                            Free tier does not include technical indicators (RSI / MACD / etc).
                        </p>
                        <p className="text-xs text-gray-500">
                            Finnhub /indicator endpoint is paid-only. To enable, upgrade to a paid Finnhub plan.
                        </p>
                    </div>

                    {/* 5. Company Profile — Finnhub /stock/profile2 */}
                    <CompanyProfile symbol={symbol.toUpperCase()} apiKey={finnhubKey} height={440} />

                    {/* 6. Company Financials — placeholder (Finnhub /financials is paid) */}
                    <div className="rounded-lg border border-white/10 bg-[#141414] p-6" style={{ minHeight: 200 }}>
                        <h3 className="text-lg font-semibold text-white mb-2">Company Financials</h3>
                        <p className="text-sm text-gray-400 mb-2">
                            Free tier does not include detailed financials.
                        </p>
                        <p className="text-xs text-gray-500">
                            See key stats in <strong>Company Profile</strong> above (Market Cap, Currency, etc).
                        </p>
                    </div>

                    {/* 7. Stock News — Finnhub /company-news */}
                    <StockNews symbol={symbol.toUpperCase()} apiKey={finnhubKey} height={800} />
                </div>
            </section>
        </div>
    );
}