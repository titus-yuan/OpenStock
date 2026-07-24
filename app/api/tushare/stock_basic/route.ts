/**
 * GET /api/tushare/stock_basic?ts_code=000001.SZ  (单只)
 * GET /api/tushare/stock_basic?limit=10 (前 10 只)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getStockBasic, getAllStocks } from '@/lib/tushare/actions';

export const revalidate = 86400;

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const ts_code = searchParams.get('ts_code');
    const limit = searchParams.get('limit');
    const q = searchParams.get('q');  // 搜索关键词

    try {
        if (ts_code) {
            const data = await getStockBasic(ts_code);
            return NextResponse.json({ ok: true, data: data ? [data] : [] });
        }
        if (q) {
            const { searchStocks } = await import('@/lib/tushare/actions');
            const data = await searchStocks(q, parseInt(limit || '20'));
            return NextResponse.json({ ok: true, data });
        }
        const all = await getAllStocks();
        const sliced = limit ? all.slice(0, parseInt(limit)) : all;
        return NextResponse.json({ ok: true, data: sliced });
    } catch (e) {
        return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
    }
}