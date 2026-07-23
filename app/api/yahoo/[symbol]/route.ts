import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 3600; // Cache for 1 hour

interface YahooChartResponse {
    chart?: {
        result?: Array<{
            meta?: { symbol?: string };
            timestamp?: number[];
            indicators?: {
                quote?: Array<{
                    open?: (number | null)[];
                    high?: (number | null)[];
                    low?: (number | null)[];
                    close?: (number | null)[];
                    volume?: (number | null)[];
                }>;
            };
        }>;
        error?: { code: string; description: string } | null;
    };
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params;
    const searchParams = request.nextUrl.searchParams;
    const interval = searchParams.get('interval') || '1d';
    const range = searchParams.get('range') || '1y';

    if (!symbol) {
        return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });
    }

    const yahooUrl =
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
        `?interval=${interval}&range=${range}`;

    try {
        const res = await fetch(yahooUrl, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
            },
        });

        if (!res.ok) {
            return NextResponse.json(
                { error: `Yahoo Finance HTTP ${res.status}` },
                { status: res.status }
            );
        }

        const data: YahooChartResponse = await res.json();

        if (data.chart?.error) {
            return NextResponse.json(
                { error: data.chart.error.description },
                { status: 400 }
            );
        }

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}