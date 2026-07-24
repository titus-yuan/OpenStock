/**
 * GET /api/tushare/daily_basic?ts_code=000001.SZ&trade_date=20250725
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDailyBasic, getAllDailyBasicByDate } from '@/lib/tushare/actions';

export const revalidate = 3600;

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const ts_code = searchParams.get('ts_code');
    const trade_date = searchParams.get('trade_date');
    const days_back = searchParams.get('days_back');

    try {
        if (!ts_code && !trade_date) {
            return NextResponse.json({ ok: false, error: 'Need ts_code or trade_date' }, { status: 400 });
        }
        if (ts_code) {
            const data = await getDailyBasic(ts_code, parseInt(days_back || '30'));
            return NextResponse.json({ ok: true, data });
        }
        if (trade_date) {
            const data = await getAllDailyBasicByDate(trade_date);
            return NextResponse.json({ ok: true, data });
        }
        return NextResponse.json({ ok: false, error: 'Bad params' }, { status: 400 });
    } catch (e) {
        return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
    }
}