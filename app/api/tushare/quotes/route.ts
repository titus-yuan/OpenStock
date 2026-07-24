/**
 * GET /api/tushare/quotes?limit=30
 *
 * A 股活跃股(按成交额排序)
 */
import { NextRequest, NextResponse } from 'next/server';
import { tushareQuery } from '@/lib/tushare/client';
import { getAllStocks } from '@/lib/tushare/actions';

export const revalidate = 3600;

export async function GET(req: NextRequest) {
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '30');

    try {
        const today = new Date();
        const fmt = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

        let dailyData: any[] = [];
        for (let i = 0; i < 5; i++) {
            const dt = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            const tradeDate = fmt(dt);
            const d = await tushareQuery<any>('daily', { trade_date: tradeDate }, { revalidate: 3600 });
            if (d && Array.isArray(d) && d.length > 0) {
                dailyData = d;
                break;
            }
        }
        if (dailyData.length === 0) {
            return NextResponse.json({ ok: false, error: 'No daily data' });
        }

        const allStocks = await getAllStocks();
        const stockMap = new Map(allStocks.map(s => [s.ts_code, s.name]));

        const quotes = dailyData
            .filter((d: any) => d.amount > 0)
            .sort((a: any, b: any) => b.amount - a.amount)
            .slice(0, limit)
            .map((d: any) => ({
                ts_code: d.ts_code,
                name: stockMap.get(d.ts_code) || d.ts_code,
                close: d.close,
                pct_chg: d.pct_chg,
                amount: d.amount,
            }));

        return NextResponse.json({ ok: true, data: quotes });
    } catch (e) {
        return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
    }
}