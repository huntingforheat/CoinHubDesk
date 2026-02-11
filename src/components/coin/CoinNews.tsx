import React from 'react';
import useSWR from 'swr';
import { getCoinNews } from '../../services/news';
import { NewsItem } from '../../types/coin';

interface CoinNewsProps {
    symbol: string;
}

/**
 * 코인 관련 최신 뉴스를 보여주는 컴포넌트
 */
const CoinNews = ({ symbol }: CoinNewsProps): React.JSX.Element => {
    const { data: news, error, isLoading } = useSWR<NewsItem[]>(
        `news/${symbol}`,
        () => getCoinNews(symbol),
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000 // 1분 동안 캐시 유지
        }
    );

    if (isLoading) return (
        <div className="grid grid-cols-1 gap-4">
            <h3 className="text-xl font-black mb-2 flex items-center gap-2 opacity-50">
                <span className="w-2 h-6 bg-base-300 rounded-full"></span>
                <span className="skeleton w-32 h-6"></span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                {[1, 2, 3].map((idx) => (
                    <div key={idx} className="card card-side bg-base-200/50 border border-base-content/5 overflow-hidden animate-pulse">
                        <div className="w-32 h-full bg-base-300 flex-shrink-0"></div>
                        <div className="card-body p-4 w-full">
                            <div className="h-4 bg-base-300 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-base-300 rounded w-full mb-1"></div>
                            <div className="h-3 bg-base-300 rounded w-1/2"></div>
                            <div className="card-actions justify-end mt-2">
                                <div className="h-2 bg-base-300 rounded w-16"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    if (error || !news || news.length === 0) return (
        <div className="text-center py-10 opacity-40">
            <p>관련 뉴스를 찾을 수 없습니다.</p>
        </div>
    );

    return (
        <div className="grid grid-cols-1 gap-4">
            <h3 className="text-xl font-black mb-2 flex items-center gap-2">
                <span className="w-2 h-6 bg-primary rounded-full"></span>
                실시간 관련 뉴스
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                {news.map((item, idx) => (
                    <a
                        key={idx}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="card card-side bg-base-300 shadow-sm hover:shadow-md hover:bg-base-100 transition-all duration-200 border border-base-content/5 group overflow-hidden"
                    >
                        {item.thumbnail && (
                            <figure className="w-32 h-full flex-shrink-0">
                                <img
                                    src={item.thumbnail}
                                    alt={item.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                            </figure>
                        )}
                        <div className="card-body p-4 justify-center">
                            <h4 className="card-title text-sm md:text-base leading-tight group-hover:text-primary transition-colors line-clamp-2">
                                {item.title}
                            </h4>
                            <p className="text-xs opacity-60 line-clamp-1 mt-1">{item.description}</p>
                            <div className="card-actions justify-end mt-2">
                                <span className="text-[10px] opacity-40 font-bold">{item.pubDate}</span>
                            </div>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
};

export default CoinNews;
