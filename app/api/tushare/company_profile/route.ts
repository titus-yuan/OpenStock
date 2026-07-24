/**
 * GET /api/tushare/company_profile?ts_code=000001.SZ
 *
 * 综合拉取:basic + company + indicator + income
 */
import { NextRequest, NextResponse } from 'next/server';
import { getStockBasic, getStockCompany, getFinaIndicator, getIncome } from '@/lib/tushare/actions';

export const revalidate = 86400;

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const ts_code = searchParams.get('ts_code');
    if (!ts_code) return NextResponse.json({ ok: false, error: 'Need ts_code' }, { status: 400 });

    try {
        const [basic, company, indicator, income] = await Promise.all([
            getStockBasic(ts_code),
            getStockCompany(ts_code),
            getFinaIndicator(ts_code, 1),
            getIncome(ts_code, 1),
        ]);

        return NextResponse.json({
            ok: true,
            data: {
                basic,
                company,
                indicator,
                income,
            },
        });
    } catch (e) {
        return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
    }
}