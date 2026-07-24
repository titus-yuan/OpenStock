/**
 * GET /api/tushare/limit_up
 *
 * 涨停股票 Top 10(按涨跌幅倒序)
 * 简化方案:pct_chg >= 9.9(精确版需要 Tushare 10000+ 档 limit_list_d)
 */
import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    host: process.env.PG_HOST || '192.168.169.3',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'china_stock_a',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PGPASSWORD,
});

export const revalidate = 1800;

export async function GET() {
    try {
        const result = await pool.query(`
            SELECT
                d.ts_code,
                b.name,
                b.industry,
                b.market,
                d.pct_chg,
                d.close,
                d.high,
                d.low,
                d.trade_date::text AS trade_date
            FROM stock_daily d
            JOIN stock_code_name b ON d.ts_code = b.ts_code
            WHERE d.trade_date = (SELECT MAX(trade_date) FROM stock_daily)
              AND d.pct_chg >= 9.9
            ORDER BY d.pct_chg DESC, d.amount DESC
            LIMIT 10
        `);

        // 计算涨停阈值
        const rows = result.rows.map((r: any) => {
            let limitType = '10%';
            if (r.market === '创业板' || r.market === '科创板') limitType = '20%';
            else if (r.market === '北证') limitType = '30%';
            return {
                ts_code: r.ts_code,
                name: r.name,
                industry: r.industry,
                market: r.market,
                pct_chg: parseFloat(r.pct_chg),
                close: parseFloat(r.close),
                high: parseFloat(r.high),
                low: parseFloat(r.low),
                limit_type: limitType,
            };
        });

        return NextResponse.json({
            ok: true,
            tradeDate: rows[0] ? undefined : undefined,
            data: rows,
        });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 });
    }
}