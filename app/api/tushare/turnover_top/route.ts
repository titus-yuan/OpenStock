/**
 * GET /api/tushare/turnover_top
 *
 * 换手率 Top 10
 * 数据:stock_daily_basic(包 C 已采集)
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
                d.turnover_rate,
                d.turnover_rate_f AS turnover_rate_free,
                s.pct_chg,
                s.close,
                d.total_mv,
                s.vol,
                d.trade_date::text AS trade_date
            FROM stock_daily_basic d
            JOIN stock_code_name b ON d.ts_code = b.ts_code
            JOIN stock_daily s ON d.ts_code = s.ts_code AND d.trade_date = s.trade_date
            WHERE d.trade_date = (SELECT MAX(trade_date) FROM stock_daily_basic)
              AND d.turnover_rate IS NOT NULL
            ORDER BY d.turnover_rate DESC
            LIMIT 10
        `);

        return NextResponse.json({
            ok: true,
            tradeDate: result.rows[0]?.trade_date,
            data: result.rows.map((r: any) => ({
                ts_code: r.ts_code,
                name: r.name,
                industry: r.industry,
                turnover_rate: parseFloat(r.turnover_rate),
                turnover_rate_free: r.turnover_rate_free ? parseFloat(r.turnover_rate_free) : null,
                pct_chg: parseFloat(r.pct_chg),
                close: parseFloat(r.close),
                total_mv: r.total_mv ? parseFloat(r.total_mv) : null,
            })),
        });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 });
    }
}