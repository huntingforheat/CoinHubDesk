import React, { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { getCandles, getCandlesByTimeframe, TimeframeType } from '../../services/upbit';
import { CoinData, Candle } from '../../types/coin';
import CoinChart from './CoinChart';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useCoinData } from '../../hooks/useCoinData';
import CoinNews from './CoinNews';

interface CoinDetailProps {
    initialData?: CoinData; // PC 버전에서 HomeLayout으로부터 직접 전달받는 코인 데이터
    onClose?: () => void; // PC 버전에서 상세 창을 닫기 위한 콜백
}

/**
 * 코인 상세 정보 컴포넌트
 * 1. PC: HomeLayout에서 전달된 prop(initialData)을 우선 사용 (URL 변경 없음)
 * 2. 모바일: 라우트 파라미터(item)와 Link state를 통해 데이타를 받아 렌더링
 * @param {CoinDetailProps} props 초기 데이터 (선택적)
 * @returns {React.JSX.Element}
 */
const CoinDetail = ({ initialData, onClose }: CoinDetailProps): React.JSX.Element => {
    const { item } = useParams<{ item: string }>(); // URL 파라미터에서 코인 심볼 추출 (예: BTC)
    const location = useLocation();
    const navigate = useNavigate();
    const { coins } = useCoinData();

    // 시간봉 선택 상태
    const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeType>('minutes');
    const [selectedUnit, setSelectedUnit] = useState<number>(15);

    const tableRef = useRef<HTMLDivElement>(null);

    // 데이터 결정 우선순위:
    // 1. 실시간 데이터 (coins 배열에서 찾음) - 가격 변동 반영을 위해 가장 우선순위 높음
    // 2. prop으로 직접 전달된 데이터 (PC 버전 초기 로드 시)
    // 3. Link state를 통해 전달된 데이터 (모바일 라우팅 기반)

    // 타겟 마켓 코드 결정
    const targetMarket = item
        ? (item.includes('-') ? item : `KRW-${item.toUpperCase()}`)
        : initialData?.market;

    // 실시간 데이터 검색
    const liveCoin = coins.find(c => c.market === targetMarket);

    // 최종 사용할 코인 데이터 (실시간 데이터 우선)
    const coin = liveCoin || initialData || (location.state as CoinData);

    // 캔들 데이터 조회 (1분봉, 3초 주기 갱신)
    // coin이 있을 때만 조건부 호출
    // SWR 키에 timeframe과 unit을 포함시켜 상태 변경 시 즉시 새로운 데이터를 요청하도록 함
    const { data: candles, error } = useSWR<Candle[]>(
        coin ? `candles/${coin.market}/${selectedTimeframe}/${selectedUnit}` : null,
        () => getCandlesByTimeframe(coin.market, selectedTimeframe, selectedUnit, 200),
        {
            refreshInterval: 3000,
            keepPreviousData: true // 데이터 로딩 중 이전 데이터 유지 (깜빡임 방지)
        }
    );

    const handleTypeChange = (type: TimeframeType) => {
        setSelectedTimeframe(type);
    };

    const handleUnitChange = (unit: number) => {
        setSelectedUnit(unit);
    };

    const handleCoinChange = (coin: CoinData) => {
        tableRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }

    useEffect(() => {
        if (coin) {
            handleCoinChange(coin);
        }
    }, [initialData])

    // 뒤로가기 핸들러 (PC에서는 닫기, 모바일에서는 홈 이동)
    const handleBack = () => {
        if (onClose) {
            onClose();
        } else {
            navigate('/');
        }
    };

    if (!coin) return (
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-base-200/50 rounded-2xl border border-dashed border-base-300">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-sm font-medium opacity-40 uppercase tracking-widest">코인 정보를 불러오는 중...</p>
        </div>
    );

    if (error) return (
        <div className="alert alert-error shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>캔들 데이터를 불러오는 데 실패했습니다.</span>
        </div>
    );

    const isRise = coin.change === 'RISE';
    const isFall = coin.change === 'FALL';
    const colorClass = isRise ? 'text-error' : isFall ? 'text-info' : '';
    const sign = isRise ? '+' : '';

    return (
        <div ref={tableRef} className="card bg-base-200 shadow-xl border border-base-300 overflow-hidden">
            <div className="card-body p-4 md:p-8">
                {/* 뒤로가기 버튼 */}
                <button
                    className="btn btn-sm btn-ghost mb-4 gap-2 pl-0 hover:bg-transparent hover:text-primary transition-colors w-fit"
                    onClick={handleBack}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    목록으로 돌아가기
                </button>

                {/* 상단 가격 요약 섹션 */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-3xl md:text-4xl font-black text-base-content tracking-tight">
                                {coin.korean_name}
                            </h2>
                            <div className="badge badge-primary badge-outline font-mono text-xs py-3">
                                {coin.market}
                            </div>
                        </div>
                        <p className="text-sm font-medium opacity-50 uppercase tracking-widest">{coin.english_name}</p>
                    </div>

                    <div className="text-right flex flex-col items-end">
                        <div className={`text-3xl md:text-5xl font-black font-mono leading-none ${colorClass}`}>
                            {coin.trade_price.toLocaleString()}
                            <span className="text-sm md:text-lg ml-2 opacity-80 uppercase">KRW</span>
                        </div>
                        <div className={`flex gap-3 items-center mt-2 font-bold ${colorClass}`}>
                            <span className="text-lg">{sign}{(coin.signed_change_rate * 100).toFixed(2)}%</span>
                            <span className="text-sm opacity-80">({sign}{coin.signed_change_price.toLocaleString()})</span>
                        </div>
                    </div>
                </div>

                {/* 상세 지표 그리드 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: '고가', value: coin.high_price, color: 'text-error' },
                        { label: '저가', value: coin.low_price, color: 'text-info' },
                        { label: '거래대금(24H)', value: `${Math.floor(coin.acc_trade_price_24h / 1000000).toLocaleString()}만`, color: 'text-primary' },
                        { label: '52주 최고', value: coin.highest_52_week_price, color: 'opacity-60' }
                    ].map((stat, idx) => (
                        <div key={idx} className="bg-base-300/50 rounded-xl p-4 border border-base-content/5">
                            <div className="text-[10px] md:text-xs font-bold opacity-40 mb-1 uppercase tracking-wider">{stat.label}</div>
                            <div className={`text-sm md:text-lg font-mono font-bold ${stat.color}`}>
                                {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* 실시간 캔들 차트 및 뉴스 그리드 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* 차트 영역 - 2컬럼 차지 */}
                    <div className="lg:col-span-3 bg-base-300 rounded-2xl p-4 min-h-[450px] flex flex-col border border-base-content/5 shadow-inner relative overflow-hidden">
                        {!candles ? (
                            <div className="w-full h-full flex flex-col gap-4 animate-pulse">
                                {/* 차트 헤더 스켈레톤 */}
                                <div className="w-full flex justify-between items-center mb-2 px-2">
                                    <div className="h-5 bg-base-content/10 rounded w-20"></div>
                                    <div className="h-3 bg-base-content/5 rounded w-32"></div>
                                </div>

                                {/* 차트 영역 스켈레톤 - 캔들 모양 흉내 */}
                                <div className="flex-1 w-full bg-base-content/5 rounded-lg relative overflow-hidden flex items-end justify-between px-4 pb-8 gap-2">
                                    {[...Array(20)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-full bg-base-content/10 rounded-sm"
                                            style={{
                                                height: `${Math.random() * 60 + 20}%`,
                                                opacity: Math.random() * 0.5 + 0.3
                                            }}
                                        ></div>
                                    ))}

                                    {/* 그리드 라인 효과 */}
                                    <div className="absolute inset-0 flex flex-col justify-between py-8 pointer-events-none">
                                        {[...Array(5)].map((_, i) => (
                                            <div key={i} className="w-full h-[1px] bg-base-content/5"></div>
                                        ))}
                                    </div>
                                </div>

                                {/* 하단 축 스켈레톤 */}
                                <div className="w-full flex justify-between px-2">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="h-3 bg-base-content/10 rounded w-8"></div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="w-full flex justify-between items-center mb-4 px-2">
                                    <span className="badge badge-sm badge-ghost opacity-50 font-bold tracking-tighter">1분봉 리포트</span>
                                    <span className="text-[10px] opacity-30 font-mono">Real-time TradingView Chart</span>
                                </div>
                                <CoinChart candles={candles} market={coin.market} onCandleTypeChange={handleTypeChange} onCandleUnitChange={handleUnitChange} />
                            </>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* 뉴스 영역 - 1컬럼 차지 */}
                    <div className="lg:col-span-3">
                        <CoinNews symbol={coin.market.split('-')[1]} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoinDetail;
