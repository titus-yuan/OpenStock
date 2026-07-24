/**
 * A 股个股页 ── 7 widget 全部 Tushare 自渲染
 *
 * 数据源:Tushare Pro 5000 档
 * 不再用 TradingView widget(已死)
 */

import AStockSymbolInfo from "@/components/stocks/AStockSymbolInfo";
import AStockCandleChart from "@/components/stocks/AStockCandleChart";
import AStockCompanyProfile from "@/components/stocks/AStockCompanyProfile";
import AStockTechnicalAnalysis from "@/components/stocks/AStockTechnicalAnalysis";
import WatchlistButton from "@/components/WatchlistButton";
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import { isStockInWatchlist } from '@/lib/actions/watchlist.actions';
import { formatSymbolForTushare } from '@/lib/tushare/mapping';

export default async function StockDetails({ params }: StockDetailsPageProps) {
    const { symbol } = await params;
    const tsCode = formatSymbolForTushare(symbol);

    const session = await auth.api.getSession({
        headers: await headers()
    });
    const userId = session?.user?.id;
    const isInWatchlist = userId ? await isStockInWatchlist(userId, tsCode) : false;

    return (
        <div className="flex min-h-screen p-4 md:p-6 lg:p-8">
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                {/* Left column */}
                <div className="flex flex-col gap-6">
                    {/* Widget 1: Symbol Info */}
                    <AStockSymbolInfo symbol={tsCode} height={170} />

                    {/* Widget 2: K 线图 */}
                    <div className="custom-chart rounded-lg overflow-hidden">
                        <AStockCandleChart symbol={tsCode} height={600} daysBack={365} />
                    </div>

                    {/* Widget 3: Baseline(复用 K 线,可选不同区间)*/}
                    <div className="custom-chart rounded-lg overflow-hidden">
                        <AStockCandleChart symbol={tsCode} height={500} daysBack={90} />
                    </div>
                </div>

                {/* Right column */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <WatchlistButton
                            symbol={tsCode}
                            company={tsCode}
                            isInWatchlist={isInWatchlist}
                            userId={userId}
                        />
                    </div>

                    {/* Widget 4: Technical Analysis */}
                    <AStockTechnicalAnalysis symbol={tsCode} daysBack={120} />

                    {/* Widget 5: Company Profile + Financials(合并)*/}
                    <AStockCompanyProfile symbol={tsCode} />

                    {/* Widget 6: Financials(更多细节,放 watchlist 后)*/}
                    {/* 留空,profile 已包含主要财务指标 */}

                    {/* Widget 7: News placeholder(个股新闻需 10000+ 档)*/}
                    <div className="rounded-lg border border-white/10 bg-[#141414] p-6">
                        <h3 className="text-lg font-semibold text-white mb-2">📰 个股新闻</h3>
                        <p className="text-sm text-gray-400">
                            Tushare Pro 5000 档不包含个股实时新闻(需 10000+ 档)
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                            替代方案:看首页 /api/tushare/news (大盘新闻)
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}