/**
 * 财经新闻时间线
 *
 * 修复:`Tushare major_news` 不返回 `id` 字段(只有 title/pub_time/src/url),
 *      之前用 `key={n.id}` 全部为 undefined 导致 React 警告。
 *      现在用 `url + title` 组合当 stable key。
 */

'use client';

import { useEffect, useState } from 'react';

interface NewsItem {
    id?: string;  // Tushare 不返回,保留以备未来支持
    title: string;
    src?: string;
    pub_time?: string;
    url?: string;
}

export default function NewsTimeline() {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/tushare/news?limit=20')
            .then((res) => res.json())
            .then((json) => {
                if (!json.ok) throw new Error(json.error || 'fetch failed');
                setNews(json.data);
            })
            .catch((err) => setError(String(err)))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="rounded-lg border border-white/10 bg-[#141414] p-6 min-h-[600px] text-gray-400 text-sm">Loading news...</div>;
    if (error) return <div className="rounded-lg border border-rose-500/30 bg-[#141414] p-6 min-h-[600px] text-rose-400 text-sm">⚠️ {error}</div>;

    // 生成稳定 key:Tushare 不返回 id,用 url + title 哈希(每条新闻唯一)
    const stableKey = (n: NewsItem, index: number): string => {
        if (n.id) return `id-${n.id}`;
        // 用 url + title + pub_time 拼接后 hash(避免 React key 重复)
        const composite = `${n.url || ''}__${n.title}__${n.pub_time || ''}__${index}`;
        // 简单 hash
        let hash = 0;
        for (let i = 0; i < composite.length; i++) {
            hash = ((hash << 5) - hash) + composite.charCodeAt(i);
            hash |= 0;  // 32 位整数
        }
        return `news-${index}-${hash}`;
    };

    return (
        <div className="rounded-lg border border-white/10 bg-[#141414] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">📰 财经新闻(大盘)</h3>
            <ul className="space-y-3">
                {news.map((n, i) => (
                    <li key={stableKey(n, i)} className="border-b border-white/5 pb-3 last:border-0">
                        <a
                            href={n.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-white hover:text-blue-400 font-medium block mb-1"
                        >
                            {n.title}
                        </a>
                        <div className="flex gap-2 text-xs text-gray-500">
                            <span>{n.src || '—'}</span>
                            {n.pub_time && <span>· {n.pub_time}</span>}
                        </div>
                    </li>
                ))}
            </ul>
            <div className="text-xs text-gray-500 mt-3">数据源:Tushare major_news (大盘新闻,7 天内)</div>
        </div>
    );
}