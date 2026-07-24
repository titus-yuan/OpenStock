/**
 * GET /api/tushare/index_overview
 *
 * 拉主要 6 个指数的最新数据
 * (上证 / 深证 / 创业板 / 科创 50 / 沪深 300 / 中证 500)
 */
import { NextResponse } from 'next/server';
import { tushareQuery } from '@/lib/tushare/client';

export const revalidate = 3600;

const MAIN_INDICES = ['000001.SH', '399001.SZ', '399006.SZ', '000688.SH', '000300.SH', '000905.SH'];

const INDEX_NAMES: Record<string, string> = {
    '000001.SH': '上证综指',
    '399001.SZ': '深证成指',
    '399006.SZ': '创业板指',
    '000688.SH': '科创 50',
    '000300.SH': '沪深 300',
    '000905.SH': '中证 500',
};

export async function GET() {
    try {
        // 用 index_daily 拉所有指数最新一天(需要 trade_date)
        // Tushare 限制:不传 trade_date 会失败,所以用 daily 查最新交易日期
        const today = new Date();
        const fmt = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
        let result: any[] = [];
        // 倒推 5 天找有数据的
        for (let i = 0; i < 5; i++) {
            const dt = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            const tradeDate = fmt(dt);
            const r = await tushareQuery<any>('index_daily', { trade_date: tradeDate }, { revalidate: 3600 });
            if (r && Array.isArray(r) && r.length > 0) {
                result = r;
                break;
            }
        }
        if (!result || result.length === 0) {
            return NextResponse.json({ ok: false, error: 'No data' });
        }
        // 过滤主要 6 个指数
        const data = MAIN_INDICES.map(code => {
            const found = result.find((r: any) => r.ts_code === code);
            if (!found) return null;
            return {
                ts_code: code,
                name: INDEX_NAMES[code],
                close: found.close,
                change: found.change,
                pct_chg: found.pct_chg,
                trade_date: found.trade_date,
            };
        }).filter(Boolean);

        return NextResponse.json({ ok: true, data });
    } catch (e) {
        return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
    }
}