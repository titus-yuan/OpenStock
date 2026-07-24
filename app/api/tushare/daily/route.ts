/**
 * GET /api/tushare/daily?ts_code=000001.SZ&days_back=365
 * GET /api/tushare/daily?ts_code=000001.SZ&start_date=20250101&end_date=20251231
 * GET /api/tushare/daily?ts_code=000001.SZ&limit=1  (最新 1 条)
 *
 * 拉 K 线
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDailyCandles, getAllDailyByDate } from '@/lib/tushare/actions';

export const revalidate = 3600;

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const ts_code = searchParams.get('ts_code');
    const days_back = searchParams.get('days_back');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const limit = searchParams.get('limit');
    const trade_date = searchParams.get('trade_date');

    try {
        if (!ts_code && !trade_date) {
            return NextResponse.json({ ok: false, error: 'Need ts_code or trade_date' }, { status: 400 });
        }

        // 全市场某一天
        if (trade_date && !ts_code) {
            const data = await getAllDailyByDate(trade_date);
            return NextResponse.json({ ok: true, data });
        }

        // 单只 K 线
        if (ts_code) {
            if (limit) {
                const data = await getDailyCandles(ts_code, parseInt(days_back || '365'));
                const sliced = limit === '1' ? data.slice(-1) : data.slice(-parseInt(limit));
                return NextResponse.json({ ok: true, data: sliced });
            }
            const data = await getDailyCandles(ts_code, parseInt(days_back || '365'));
            return NextResponse.json({ ok: true, data });
        }

        return NextResponse.json({ ok: false, error: 'Bad params' }, { status: 400 });
    } catch (e) {
        return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
    }
}