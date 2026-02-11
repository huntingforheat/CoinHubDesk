import React, { useState, useMemo, useRef } from 'react';
import { useCoinData } from '../../hooks/useCoinData';
import { CoinData } from '../../types/coin';
import { useNavigate } from 'react-router-dom';

interface CoinListProps {
    onSelect?: (coin: CoinData) => void;
    selectedMarket?: string;
    currencyMode?: 'KRW' | 'USD';
    isCompact?: boolean; // 컴팩트 모드 (화면 분할 시 사용)
    onPageChange?: (page: number) => void;
}


type PageSize = 30 | 50 | 100 | 'all';
type SortField = 'price' | 'change' | 'trade' | 'kimchi' | 'none';
type SortOrder = 'asc' | 'desc' | 'none';

interface SortConfig {
    field: SortField;
    order: SortOrder;
}

const CoinList = ({ onSelect, selectedMarket, currencyMode = 'KRW', onPageChange }: CoinListProps): React.JSX.Element => {
    const { coins, exchangeRate, loading, error } = useCoinData();
    const navigate = useNavigate();

    // 페이지네이션 상태
    const [pageSize, setPageSize] = useState<PageSize>(30);
    const [currentPage, setCurrentPage] = useState<number>(1);

    // 정렬 상태
    const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'trade', order: 'desc' });

    // 컨테이너 Ref
    const tableRef = useRef<HTMLTableElement>(null);

    // 정렬 로직이 적용된 코인 목록 계산
    const sortedCoins = useMemo(() => {
        if (sortConfig.field === 'none' || sortConfig.order === 'none') {
            return coins;
        }

        return [...coins].sort((a, b) => {
            let aValue = 0;
            let bValue = 0;

            // 정렬 필드에 따른 값 추출
            switch (sortConfig.field) {
                case 'price':
                    aValue = a.trade_price;
                    bValue = b.trade_price;
                    break;
                case 'change':
                    aValue = a.signed_change_rate;
                    bValue = b.signed_change_rate;
                    break;
                case 'trade':
                    aValue = a.acc_trade_price_24h;
                    bValue = b.acc_trade_price_24h;
                    break;
                case 'kimchi':
                    aValue = a.kimchi_premium || 0;
                    bValue = b.kimchi_premium || 0;
                    break;
                default:
                    return 0;
            }

            // 오름차순/내림차순 정렬
            if (sortConfig.order === 'asc') {
                return aValue - bValue;
            } else {
                return bValue - aValue;
            }
        });
    }, [coins, sortConfig]);

    // 페이지네이션에 따른 데이터 계산 (정렬된 데이터 기반)
    const paginatedCoins = useMemo(() => {
        if (pageSize === 'all') return sortedCoins;
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        return sortedCoins.slice(start, end);
    }, [sortedCoins, pageSize, currentPage]);

    // 전체 페이지 수 계산
    const totalPages = useMemo(() => {
        if (pageSize === 'all') return 1;
        return Math.ceil(sortedCoins.length / pageSize);
    }, [sortedCoins.length, pageSize]);

    // 페이지 변경 시 핸들러
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        // 페이지 변경 시 리스트 상단으로 부드럽게 이동
        window.scrollTo({ top: 0, behavior: 'smooth' });

        onPageChange?.(page);
    };

    // 페이지 크기 변경 시 핸들러
    const handlePageSizeChange = (size: PageSize) => {
        setPageSize(size);
        setCurrentPage(1); // 페이지 크기 변경 시 첫 페이지로 리셋
    };

    // 정렬 토글 핸들러 (DESC -> ASC -> NONE 순서)
    const handleSort = (field: SortField) => {
        setSortConfig((prev) => {
            if (prev.field !== field) {
                return { field, order: 'desc' };
            }

            if (prev.order === 'desc') {
                return { field, order: 'asc' };
            } else if (prev.order === 'asc') {

                // 거래대금은 none 제외
                if (prev.field === 'trade') {
                    return { field: 'trade', order: 'desc' };
                }

                return { field: 'none', order: 'none' };
            }

            return { field, order: 'desc' };
        });
        setCurrentPage(1); // 정렬 변경 시 첫 페이지로 이동
    };

    if (error) return (
        <div className="alert alert-error shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>시세 정보를 불러오는 중 오류가 발생했습니다.</span>
        </div>
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-base-200/50 rounded-2xl border border-dashed border-base-300">
            <span className="loading loading-dots loading-lg text-primary"></span>
            <p className="text-sm font-medium opacity-60 uppercase tracking-widest">Connecting to Upbit...</p>
        </div>
    );

    // 코인 행 클릭 시 실행되는 핸들러
    const handleRowClick = (e: React.MouseEvent, coin: CoinData) => {
        // 이벤트 전파 방지: 부모 요소(HomeLayout)의 배경 클릭 핸들러가 실행되지 않도록 함
        e.stopPropagation();

        // 공통: 선택된 코인 정보를 상태로 전달하여 UI 하이라이트 등을 처리
        onSelect?.(coin);

        // 화면 크기 확인: lg 브레이크포인트(1024px)를 기준으로 분기
        const isDesktop = window.matchMedia('(min-width: 1024px)').matches;

        if (isDesktop) {
            // PC 버전: URL을 변경하지 않고 현재 페이지('/')에서 상태만 업데이트하여 
            // HomeLayout의 우측 영역에 상세 정보가 나타나도록 합니다.
            navigate('/', { state: { ...coin, currencyMode }, replace: true });
        } else {
            // 모바일/태블릿 버전: 전체 화면으로 상세 정보를 보여주기 위해 
            // 별도의 상세 페이지 라우트('/coin/:item')로 이동합니다.
            navigate(`/coin/${coin.market.split('-')[1]}`, { state: { ...coin, currencyMode } });
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {/* 상단 컨트롤러: 페이지 크기 선택 */}
            <div className="flex justify-between items-center px-1">
                <div className="text-xs font-bold opacity-50 uppercase tracking-tighter">
                    Total {coins.length} Coins | 환율: {exchangeRate.toLocaleString()}원
                </div>
                {/* 페이지 크기 선택 그룹 */}
                <div className="join bg-base-300/50 p-0.5 rounded-2xl border border-base-content/5 shadow-inner backdrop-blur-sm">
                    {[30, 50, 100, 'all'].map((size) => (
                        <button
                            key={size}
                            onClick={() => handlePageSizeChange(size as PageSize)}
                            className={`join-item btn btn-xs md:btn-sm border-none transition-all duration-300 h-8 md:h-10 px-3 md:px-5 font-bold ${pageSize === size
                                ? 'btn-primary shadow-md scale-105 rounded-xl z-10'
                                : 'btn-ghost opacity-60 hover:opacity-100 hover:bg-base-content/5'
                                }`}
                        >
                            {size === 'all' ? '전체' : size}
                        </button>
                    ))}
                </div>
            </div>

            {/* 테이블 영역 */}
            <div className="overflow-x-auto rounded-2xl border border-base-300 shadow-2xl bg-base-200/40 backdrop-blur-sm">
                {/* 
                    table-fixed: 데이터 내용(긴 텍스트 등)에 의해 컬럼 너비가 변하지 않고, 
                    지정된 w-[check] 클래스를 강제로 따르도록 합니다.
                    이로 인해 30/50/100/전체 보기 시 레이아웃이 동일하게 유지됩니다.
                */}
                <table className="table table-xs md:table-md w-full border-collapse table-fixed">
                    <thead>
                        <tr className="bg-base-300/80 text-base-content/80 font-bold border-b border-base-300">
                            {/* 
                                각 컬럼에 고정 너비(w-[px])를 설정하여 데이터 양(30, 50, 100, 전체)에 상관없이 
                                컬럼 위치가 일관되게 유지되도록 합니다. 
                            */}
                            <th className="py-4 px-3 md:px-6 w-[120px] md:w-[180px]">종목</th>
                            {[
                                { label: '시세', field: 'price' as SortField, width: 'w-[90px] md:w-[150px]' },
                                { label: '변동', field: 'change' as SortField, width: 'w-[80px] md:w-[120px]' },
                                { label: '김프', field: 'kimchi' as SortField, width: 'w-[80px] md:w-[110px]' },
                                { label: '거래대금', field: 'trade' as SortField, width: 'w-[90px] md:w-[140px]' },
                            ].map((header) => {
                                const isActive = sortConfig.field === header.field;
                                return (
                                    <th
                                        key={header.field}
                                        className={`text-right py-4 px-3 md:px-6 cursor-pointer hover:bg-base-content/5 transition-colors group select-none ${header.width} ${isActive ? 'text-primary' : ''}`}
                                        onClick={() => handleSort(header.field)}
                                    >
                                        <div className="flex items-center justify-end gap-1">
                                            {header.label}
                                            <span className={`text-[10px] transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-30'}`}>
                                                {isActive && sortConfig.order === 'asc' ? '▲' : '▼'}
                                            </span>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-base-300/50">
                        {paginatedCoins.map((coin: CoinData) => {
                            const isRise: boolean = coin.change === 'RISE';
                            const isFall: boolean = coin.change === 'FALL';
                            const colorClass: string = isRise ? 'text-error' : isFall ? 'text-info' : '';
                            const sign: string = isRise ? '+' : '';
                            const isSelected = selectedMarket === coin.market;

                            const displayPrice = currencyMode === 'KRW' ? coin.trade_price : coin.usd_price || 0;
                            const currencySymbol = currencyMode === 'KRW' ? '' : '$';

                            return (
                                <tr
                                    key={coin.market}
                                    className={`hover:bg-primary/10 transition-all duration-200 cursor-pointer group ${isSelected ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}
                                    onClick={(e) => handleRowClick(e, coin)}
                                >
                                    {/* 각 데이터 셀에도 헤더와 동일한 너비를 암시적으로 유지하거나 최소 너비를 보장합니다. */}
                                    <td className="py-4 px-3 md:px-6 truncate">
                                        <div className="flex flex-col leading-tight min-w-[85px]">
                                            <span className={`font-black text-sm md:text-lg truncate mb-1 ${isSelected ? 'text-primary' : 'group-hover:text-primary transition-colors'}`}>
                                                {coin.korean_name}
                                            </span>
                                            <div className="flex gap-1.5 items-center">
                                                <span className="text-[10px] md:text-xs font-bold badge badge-outline badge-xs py-2 px-1.5 border-base-content/10 bg-base-100">
                                                    {coin.market.split('-')[1]}
                                                </span>
                                                <span className="text-[9px] md:text-xs opacity-40 font-mono font-medium">/ KRW</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className={`text-right font-mono font-black text-sm md:text-xl px-3 md:px-6 ${colorClass} tabular-nums truncate`}>
                                        {currencySymbol}{displayPrice.toLocaleString(undefined, {
                                            minimumFractionDigits: currencyMode === 'USD' ? 2 : 0,
                                            maximumFractionDigits: currencyMode === 'USD' ? 2 : 0
                                        })}
                                    </td>
                                    <td className={`text-right font-mono px-3 md:px-6 ${colorClass} tabular-nums truncate`}>
                                        <div className="font-bold text-xs md:text-base">{sign}{(coin.signed_change_rate * 100).toFixed(2)}%</div>
                                        <div className="text-[10px] md:text-xs opacity-60 font-medium">
                                            {currencyMode === 'KRW'
                                                ? `${sign}${coin.signed_change_price.toLocaleString()}`
                                                : `${sign}${(coin.signed_change_price / exchangeRate).toFixed(2)}`
                                            }
                                        </div>
                                    </td>
                                    {/* 김치프리미엄 컬럼 */}
                                    <td className="text-right font-mono px-3 md:px-6 truncate">
                                        {coin.kimchi_premium !== undefined ? (
                                            <>
                                                <div className={`font-bold text-xs md:text-base ${coin.kimchi_premium > 0 ? 'text-error' : 'text-info'}`}>
                                                    {coin.kimchi_premium > 0 ? '+' : ''}{coin.kimchi_premium.toFixed(2)}%
                                                </div>
                                                <div className="text-[10px] md:text-xs opacity-40 font-medium">
                                                    {Math.round(coin.trade_price - (coin.binance_price || 0) * exchangeRate).toLocaleString()}원
                                                </div>
                                            </>
                                        ) : (
                                            <span className="opacity-20">-</span>
                                        )}
                                    </td>
                                    <td className="text-right font-mono px-3 md:px-6 truncate">
                                        <div className="text-xs md:text-base opacity-70 font-bold whitespace-nowrap tabular-nums">
                                            {currencyMode === 'KRW'
                                                ? `${Math.floor(coin.acc_trade_price_24h / 1000000).toLocaleString()}만`
                                                : `$${(coin.acc_trade_price_24h / exchangeRate / 1000000).toFixed(1)}M`
                                            }
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* 하단 페이지네이션 UI */}
            <div className="flex justify-center items-center mt-4 min-h-[56px]">
                {pageSize !== 'all' && totalPages > 1 && (
                    <div className="join shadow-lg border border-base-300 overflow-hidden rounded-xl">
                        <button
                            className="join-item btn btn-sm md:btn-md bg-base-200 border-none hover:bg-primary hover:text-white transition-all disabled:bg-base-100 disabled:opacity-30"
                            disabled={currentPage === 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                        >
                            «
                        </button>
                        {[...Array(totalPages)].map((_, i) => {
                            const pageNum = i + 1;
                            if (
                                totalPages > 7 &&
                                pageNum !== 1 &&
                                pageNum !== totalPages &&
                                (pageNum < currentPage - 2 || pageNum > currentPage + 2)
                            ) {
                                if (pageNum === currentPage - 3 || pageNum === currentPage + 3) {
                                    return <button key={pageNum} className="join-item btn btn-sm md:btn-md btn-disabled bg-base-200 border-none">...</button>;
                                }
                                return null;
                            }

                            return (
                                <button
                                    key={pageNum}
                                    className={`join-item btn btn-sm md:btn-md border-none transition-all ${currentPage === pageNum ? 'btn-primary' : 'bg-base-200 hover:bg-base-300'}`}
                                    onClick={() => handlePageChange(pageNum)}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                        <button
                            className="join-item btn btn-sm md:btn-md bg-base-200 border-none hover:bg-primary hover:text-white transition-all disabled:bg-base-100 disabled:opacity-30"
                            disabled={currentPage === totalPages}
                            onClick={() => handlePageChange(currentPage + 1)}
                        >
                            »
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CoinList;
