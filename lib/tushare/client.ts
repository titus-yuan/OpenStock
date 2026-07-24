/**
 * Tushare Pro HTTP 客户端
 *
 * 作用:
 *   - server-side fetch Tushare Pro API(Next.js 后端用)
 *   - 避免 Python SDK 在 Node.js 不能直接用,改用 HTTP 直连
 *   - 自动缓存(revalidate)
 *
 * Tushare Pro 协议:
 *   - POST https://api.tushare.pro
 *   - body: { api_name, token, params, fields }
 *   - 返回: { code, msg, data: { fields, items } }
 *
 * 用户当前权限:5111 积分(5000 档)─ 50+ 接口可用
 *   详见项目报告 37 号 / 38 号
 */

import { cache } from 'react';

const TUSHARE_BASE_URL = process.env.TUSHARE_BASE_URL || 'https://api.tushare.pro';

export interface TushareResponse<T = unknown> {
    code: number;
    msg: string;
    data: T;
}

export interface TushareData {
    fields: string[];
    items: unknown[][];
}

export interface TushareQueryOptions {
    /** 缓存秒数,默认 3600(1 小时) */
    revalidate?: number;
    /** 取单值(返回首条) */
    one?: boolean;
}

/**
 * Tushare HTTP 调用器(自带 Next.js 缓存)
 *
 * @param api_name  Tushare 接口名(如 "daily", "stock_basic", "income")
 * @param params    接口参数对象(如 { ts_code: "000001.SZ", start_date: "20250101" })
 * @param options   revalidate(秒),默认 3600(1 小时)
 *
 * @returns 数组(默认)| 单值(options.one=true)
 */
export async function tushareQuery<T = unknown>(
    api_name: string,
    params: Record<string, string | number | undefined> = {},
    options: TushareQueryOptions = {}
): Promise<T[] | T | null> {
    const token = process.env.TUSHARE_TOKEN;
    if (!token) {
        console.error('TUSHARE_TOKEN not set in .env');
        return null;
    }

    const { revalidate = 3600, one = false } = options;

    try {
        const fetchOptions: RequestInit & { next?: { revalidate?: number } } = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_name,
                token,
                params: Object.fromEntries(
                    Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
                ),
            }),
        };
        if (typeof window === 'undefined') {
            fetchOptions.next = { revalidate };
        }

        const response = await fetch(TUSHARE_BASE_URL, fetchOptions);

        if (!response.ok) {
            console.error(`[Tushare] HTTP ${response.status} for ${api_name}`);
            return null;
        }

        const json: TushareResponse<{ fields: string[]; items: unknown[][] }> = await response.json();

        if (json.code !== 0) {
            console.error(`[Tushare] ${api_name} error: ${json.msg}`);
            return null;
        }

        const { fields, items } = json.data;
        if (!fields || !items) return null;

        const rows = items.map((row) => {
            const obj: Record<string, unknown> = {};
            fields.forEach((field, i) => {
                obj[field] = row[i];
            });
            return obj;
        }) as T[];

        return one ? (rows[0] ?? null) : rows;
    } catch (e) {
        console.error(`[Tushare] ${api_name} fetch failed:`, e);
        return null;
    }
}

/**
 * 拿到 Tushare 单值(取第一条)
 */
export const tushareQueryOne = <T = unknown>(
    api_name: string,
    params: Record<string, string | number | undefined> = {},
    options: Omit<TushareQueryOptions, 'one'> = {}
) => tushareQuery<T>(api_name, params, { ...options, one: true });

/**
 * 高频调用缓存封装
 * 用 React cache 包装,在同一次 render 中多次调用同一接口只发一次请求
 */
export const cachedTushareQuery = cache(tushareQuery);