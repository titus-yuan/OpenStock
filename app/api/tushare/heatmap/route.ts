/**
 * GET /api/tushare/heatmap
 *
 * 拉 A 股热力图数据:每只股票 × 行业 × 市值 × 涨跌幅
 * 数量可能很大(5400+),所以限制主板+创业板+科创板,每行业限前 N 只
 */
import { NextResponse } from 'next/server';
import { tushareQuery } from '@/lib/tushare/client';
import { getAllStocks } from '@/lib/tushare/actions';

export const revalidate = 3600;

const PER_INDUSTRY_LIMIT = 20;

export async function GET() {
    try {
        // 1. 拿最近交易日(倒推 5 天)
        const today = new Date();
        const fmt = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

        let dailyData: any[] = [];
        let dailyBasicData: any[] = [];
        for (let i = 0; i < 5; i++) {
            const dt = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            const tradeDate = fmt(dt);
            const [d, db] = await Promise.all([
                tushareQuery<any>('daily', { trade_date: tradeDate }, { revalidate: 3600 }),
                tushareQuery<any>('daily_basic', { trade_date: tradeDate }, { revalidate: 3600 }),
            ]);
            if (d && Array.isArray(d) && d.length > 0) dailyData = d;
            if (db && Array.isArray(db) && db.length > 0) dailyBasicData = db;
            if (dailyData.length > 0 && dailyBasicData.length > 0) break;
        }

        if (dailyData.length === 0) {
            return NextResponse.json({ ok: false, error: 'No daily data' });
        }

        // 2. 拿所有股票基础信息(只取主板 / 创业板 / 科创板)
        const allStocks = await getAllStocks();
        const targetStocks = allStocks.filter(s =>
            ['主板', '创业板', '科创板'].includes(s.market || '')
        );

        // 3. 构造热力图数据
        const stockMap = new Map(targetStocks.map(s => [s.ts_code, s]));
        const basicMap = new Map(dailyBasicData.map((d: any) => [d.ts_code, d]));

        const items = dailyData
            .filter((d: any) => stockMap.has(d.ts_code))
            .map((d: any) => {
                const basic = basicMap.get(d.ts_code);
                const stock = stockMap.get(d.ts_code);
                return {
                    ts_code: d.ts_code,
                    name: stock?.name || d.ts_code,
                    industry: stock?.industry || '其他',
                    pct_chg: d.pct_chg || 0,
                    total_mv: basic?.total_mv || 0,
                    circ_mv: basic?.circ_mv || 0,
                };
            });

        // 4. 按行业分组,每组按市值取前 N
        const grouped = new Map<string, typeof items>();
        for (const item of items) {
            const k = item.industry;
            if (!grouped.has(k)) grouped.set(k, []);
            grouped.get(k)!.push(item);
        }

        const topItems: typeof items = [];
        for (const [, arr] of grouped.entries()) {
            arr.sort((a, b) => b.total_mv - a.total_mv);
            topItems.push(...arr.slice(0, PER_INDUSTRY_LIMIT));
        }

        return NextResponse.json({
            ok: true,
            count: topItems.length,
            data: topItems,
        });
    } catch (e) {
        return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
    }
}