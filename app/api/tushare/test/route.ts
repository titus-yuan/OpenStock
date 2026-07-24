/**
 * 测试 Tushare API route
 * GET /api/tushare/test → 拉 5 只股票的基本信息
 */
import { NextResponse } from 'next/server';
import { getStockBasic, getAllStocks } from '@/lib/tushare/actions';

export const revalidate = 3600;

export async function GET() {
    try {
        const start = Date.now();
        const all = await getAllStocks();
        const ts = Date.now() - start;

        // 5 只样本股票
        const samples = ['000001.SZ', '600000.SH', '688001.SH', '000002.SZ', '600519.SH'];
        const details = await Promise.all(samples.map(s => getStockBasic(s)));

        return NextResponse.json({
            ok: true,
            durationMs: ts,
            totalStocks: all.length,
            sampleDetails: details.map((d, i) => ({
                symbol: samples[i],
                name: d?.name || 'NOT FOUND',
                industry: d?.industry,
                market: d?.market,
            })),
        });
    } catch (e) {
        return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
    }
}