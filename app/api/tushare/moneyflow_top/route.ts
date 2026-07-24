/**
 * GET /api/tushare/moneyflow_top
 *
 * 资金流向 Top 10(主力净流入 / 净流出)
 * 数据:stock_moneyflow(包 C 已采集)
 * 字段:net_mf_amount(主力净额,正=净流入,负=净流出)
 *
 * 默认返回净流入 Top 10,?type=net_outflow 返回净流出 Top 10
 */
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    host: process.env.PG_HOST || '192.168.169.3',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'china_stock_a',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PGPASSWORD,
});

export const revalidate = 1800; // 30 分钟缓存

export async function GET(req: NextRequest) {
    const type = req.nextUrl.searchParams.get('type') || 'net_inflow';
    const order = type === 'net_outflow' ? 'ASC' : 'DESC';
    const sign = type === 'net_outflow' ? '<' : '>';

    try {
        const result = await pool.query(`
            SELECT
                m.ts_code,
                b.name,
                b.industry,
                m.net_mf_amount,
                m.buy_elg_amount - m.sell_elg_amount AS elg_net,
                m.buy_lg_amount - m.sell_lg_amount AS lg_net,
                m.buy_md_amount - m.sell_md_amount AS md_net,
                m.buy_sm_amount - m.sell_sm_amount AS sm_net,
                m.trade_date::text AS trade_date
            FROM stock_moneyflow m
            JOIN stock_code_name b ON m.ts_code = b.ts_code
            WHERE m.trade_date = (SELECT MAX(trade_date) FROM stock_moneyflow)
              AND m.net_mf_amount IS NOT NULL
              AND m.net_mf_amount ${sign} 0
            ORDER BY m.net_mf_amount ${order}
            LIMIT 10
        `);

        return NextResponse.json({
            ok: true,
            type,
            tradeDate: result.rows[0]?.trade_date,
            data: result.rows.map((r: any) => ({
                ts_code: r.ts_code,
                name: r.name,
                industry: r.industry,
                net_mf_amount: parseFloat(r.net_mf_amount),
                elg_net: parseFloat(r.elg_net),
                lg_net: parseFloat(r.lg_net),
                md_net: parseFloat(r.md_net),
                sm_net: parseFloat(r.sm_net),
            })),
        });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 });
    }
}