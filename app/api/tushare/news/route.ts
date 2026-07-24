/**
 * GET /api/tushare/news?days=7
 *
 * 财经新闻(大盘)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getMajorNews } from '@/lib/tushare/actions';

export const revalidate = 3600;

export async function GET(req: NextRequest) {
    const days = parseInt(req.nextUrl.searchParams.get('days') || '7');
    try {
        const data = await getMajorNews(days);
        return NextResponse.json({
            ok: true,
            count: data.length,
            data: data.slice(0, 30),
        });
    } catch (e) {
        return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
    }
}