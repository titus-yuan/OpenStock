/**
 * A 股 Company Profile + Financials 综合组件
 *
 * 数据:Tushare stock_company + income + balancesheet + cashflow + fina_indicator
 */

'use client';

import { useEffect, useState } from 'react';
import { formatSymbolForTushare } from '@/lib/tushare/mapping';

interface Props {
    symbol: string;
}

export default function AStockCompanyProfile({ symbol }: Props) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const tsCode = formatSymbolForTushare(symbol);
        fetch(`/api/tushare/company_profile?ts_code=${tsCode}`)
            .then((res) => res.json())
            .then((json) => {
                if (!json.ok) throw new Error(json.error || 'fetch failed');
                setData(json.data);
            })
            .catch((err) => setError(String(err)))
            .finally(() => setLoading(false));
    }, [symbol]);

    if (loading) return <div className="rounded-lg border border-white/10 bg-[#141414] p-6 min-h-[440px] text-gray-400 text-sm">Loading profile...</div>;
    if (error) return <div className="rounded-lg border border-rose-500/30 bg-[#141414] p-6 min-h-[440px] text-rose-400 text-sm">⚠️ {error}</div>;
    if (!data) return null;

    const { basic, company, indicator, income } = data;

    return (
        <div className="rounded-lg border border-white/10 bg-[#141414] p-6 space-y-4">
            {/* 基本信息 */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-3">📋 公司基本信息</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div><dt className="text-gray-500 text-xs">股票代码</dt><dd className="text-white">{basic?.ts_code}</dd></div>
                    <div><dt className="text-gray-500 text-xs">股票简称</dt><dd className="text-white">{basic?.name}</dd></div>
                    <div><dt className="text-gray-500 text-xs">所属行业</dt><dd className="text-white">{basic?.industry}</dd></div>
                    <div><dt className="text-gray-500 text-xs">所属市场</dt><dd className="text-white">{basic?.market}</dd></div>
                    <div><dt className="text-gray-500 text-xs">上市日期</dt><dd className="text-white">{basic?.list_date}</dd></div>
                    <div><dt className="text-gray-500 text-xs">实际控制人</dt><dd className="text-white">{basic?.act_name || '—'}</dd></div>
                </dl>
            </div>

            {/* 工商信息 */}
            {company && (
                <div>
                    <h3 className="text-lg font-semibold text-white mb-3">🏢 工商信息</h3>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div><dt className="text-gray-500 text-xs">公司全称</dt><dd className="text-white">{company.com_name}</dd></div>
                        <div><dt className="text-gray-500 text-xs">注册资本</dt><dd className="text-white">{company.reg_capital ? (company.reg_capital / 1e8).toFixed(2) + ' 亿元' : '—'}</dd></div>
                        <div><dt className="text-gray-500 text-xs">注册日期</dt><dd className="text-white">{company.setup_date}</dd></div>
                        <div><dt className="text-gray-500 text-xs">所在地</dt><dd className="text-white">{company.province} {company.city}</dd></div>
                        <div><dt className="text-gray-500 text-xs">法定代表人</dt><dd className="text-white">{company.chairman}</dd></div>
                        <div><dt className="text-gray-500 text-xs">总经理</dt><dd className="text-white">{company.manager}</dd></div>
                    </dl>
                    {company.website && (
                        <div className="mt-2 text-sm">
                            <span className="text-gray-500">公司网站: </span>
                            <a href={company.website} target="_blank" rel="noopener" className="text-blue-400 hover:underline">{company.website}</a>
                        </div>
                    )}
                    {company.main_business && (
                        <div className="mt-2 text-sm">
                            <span className="text-gray-500">主营业务: </span>
                            <span className="text-white">{company.main_business}</span>
                        </div>
                    )}
                </div>
            )}

            {/* 财务指标 */}
            {indicator && indicator.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-white mb-3">💰 财务指标(最新)</h3>
                    <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                        {indicator[0].eps && <div><dt className="text-gray-500 text-xs">EPS(每股收益)</dt><dd className="text-white">¥{indicator[0].eps}</dd></div>}
                        {indicator[0].roe && <div><dt className="text-gray-500 text-xs">ROE</dt><dd className="text-white">{(indicator[0].roe * 100).toFixed(2)}%</dd></div>}
                        {indicator[0].roa && <div><dt className="text-gray-500 text-xs">ROA</dt><dd className="text-white">{(indicator[0].roa * 100).toFixed(2)}%</dd></div>}
                        {indicator[0].grossprofit_margin && <div><dt className="text-gray-500 text-xs">毛利率</dt><dd className="text-white">{(indicator[0].grossprofit_margin * 100).toFixed(2)}%</dd></div>}
                        {indicator[0].netprofit_margin && <div><dt className="text-gray-500 text-xs">净利率</dt><dd className="text-white">{(indicator[0].netprofit_margin * 100).toFixed(2)}%</dd></div>}
                        {indicator[0].debt_to_assets && <div><dt className="text-gray-500 text-xs">资产负债率</dt><dd className="text-white">{(indicator[0].debt_to_assets * 100).toFixed(2)}%</dd></div>}
                    </dl>
                </div>
            )}

            {/* 最新利润表 */}
            {income && income.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-white mb-3">📊 利润表(最新报告期)</h3>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        {income[0].total_revenue && (
                            <div>
                                <dt className="text-gray-500 text-xs">营业收入</dt>
                                <dd className="text-white">{(income[0].total_revenue / 1e8).toFixed(2)} 亿元</dd>
                            </div>
                        )}
                        {income[0].n_income && (
                            <div>
                                <dt className="text-gray-500 text-xs">净利润</dt>
                                <dd className="text-white">{(income[0].n_income / 1e8).toFixed(2)} 亿元</dd>
                            </div>
                        )}
                        {income[0].n_parent_inc && (
                            <div>
                                <dt className="text-gray-500 text-xs">归母净利润</dt>
                                <dd className="text-white">{(income[0].n_parent_inc / 1e8).toFixed(2)} 亿元</dd>
                            </div>
                        )}
                        {income[0].basic_eps && (
                            <div>
                                <dt className="text-gray-500 text-xs">基本EPS</dt>
                                <dd className="text-white">¥{income[0].basic_eps.toFixed(2)}</dd>
                            </div>
                        )}
                        <div className="col-span-2 text-xs text-gray-500 mt-1">
                            报告期: {income[0].end_date} | 公告日: {income[0].ann_date}
                        </div>
                    </dl>
                </div>
            )}

            <div className="text-xs text-gray-500">
                数据源:Tushare Pro (stock_basic + stock_company + fina_indicator + income)
            </div>
        </div>
    );
}