/**
 * A 股首页 ── 2 列等高 grid 布局
 *
 * 布局:
 * - 左列(5/12):A 股主要指数 + 4 tab(资金/换手/涨停/跌停)
 * - 右列(7/12):Heatmap(高度跟左列一致)
 * - 下方:活跃股 + 财经新闻(2 列)
 *
 * 高度对齐:左列 flex column,指数顶部 + 4 tab flex-1
 *           Heatmap h-full,自动跟随父容器高度
 */

import MarketOverview from "@/components/tushare/MarketOverview";
import Heatmap from "@/components/tushare/Heatmap";
import MarketQuotes from "@/components/tushare/MarketQuotes";
import NewsTimeline from "@/components/tushare/NewsTimeline";
import AStockMarketStats from "@/components/market/AStockMarketStats";

const Home = () => {
    return (
        <div className="flex min-h-screen home-wrapper p-4 gap-4">
            {/* 上半部分:左列 5/12 + 右列 7/12 ── 等高 */}
            <section className="grid grid-cols-12 gap-4 w-full" style={{ minHeight: '700px' }}>
                {/* 左列(5/12) */}
                <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
                    <div className="shrink-0">
                        <MarketOverview />
                    </div>
                    <div className="flex-1 min-h-0">
                        <AStockMarketStats />
                    </div>
                </div>

                {/* 右列(7/12) ── Heatmap */}
                <div className="col-span-12 lg:col-span-7">
                    <Heatmap />
                </div>
            </section>
        </div>
    );
};

export default Home;