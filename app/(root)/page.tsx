/**
 * A 股首页 ── 4 个 Tushare 自渲染 widget
 *
 * 不再用 TradingView widget(已死)
 * 数据源:Tushare Pro 5000 档
 */

import MarketOverview from "@/components/tushare/MarketOverview";
import Heatmap from "@/components/tushare/Heatmap";
import MarketQuotes from "@/components/tushare/MarketQuotes";
import NewsTimeline from "@/components/tushare/NewsTimeline";

const Home = () => {
    return (
        <div className="flex min-h-screen home-wrapper">
            <section className="grid w-full gap-8 home-section">
                <div className="md:col-span-1 xl:col-span-1">
                    <MarketOverview />
                </div>
                <div className="md-col-span xl:col-span-2">
                    <Heatmap />
                </div>
            </section>
            <section className="grid w-full gap-8 home-section">
                <div className="h-full md:col-span-1 xl:col-span-2">
                    <MarketQuotes />
                </div>
                <div className="h-full md:col-span-1 xl:col-span-1">
                    <NewsTimeline />
                </div>
            </section>
        </div>
    );
};

export default Home;