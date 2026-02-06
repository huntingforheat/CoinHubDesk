import React, { useState } from 'react';
import useSWR from 'swr';
import { getCandles, getCandlesByTimeframe, TimeframeType } from '../../services/upbit';
import { CoinData, Candle } from '../../types/coin';
import CoinChart from './CoinChart';
import { useParams, useLocation } from 'react-router-dom';
import { useCoinData } from '../../hooks/useCoinData';
import CoinNews from './CoinNews';

interface CoinDetailProps {
    initialData?: CoinData; // PC 버전에서 HomeLayout으로부터 직접 전달받는 코인 데이터
}

/**
 * 코인 상세 정보 컴포넌트
 * 1. PC: HomeLayout에서 전달된 prop(initialData)을 우선 사용 (URL 변경 없음)
 * 2. 모바일: 라우트 파라미터(item)와 Link state를 통해 데이타를 받아 렌더링
 * @param {CoinDetailProps} props 초기 데이터 (선택적)
 * @returns {React.JSX.Element}
 */
const CoinDetail = ({ initialData }: CoinDetailProps): React.JSX.Element => {
    const { item } = useParams<{ item: string }>(); // URL 파라미터에서 코인 심볼 추출 (예: BTC)
    const location = useLocation();
    const { coins } = useCoinData();

    // 시간봉 선택 상태
    const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeType>('minutes');
    const [selectedUnit, setSelectedUnit] = useState<number>(1);

    const handleTypeChange = (type: TimeframeType) => {
        setSelectedTimeframe(type);
    };

    const handleUnitChange = (unit: number) => {
        setSelectedUnit(unit);
    };

    // 데이터 결정 우선순위:
    // 1. prop으로 직접 전달된 데이터 (PC 버전 상태 기반)
    // 2. Link state를 통해 전달된 데이터 (모바일 라우팅 기반)
    // 3. 새로고침 시 전체 코인 목록에서 해당 마켓 코드로 검색하여 복구
    const coin = initialData || (location.state as CoinData) || coins.find(c => c.market.split('-')[1] === item?.toUpperCase());

    // 캔들 데이터 조회 (1분봉, 3초 주기 갱신)
    // coin이 있을 때만 조건부 호출
    const { data: candles, error } = useSWR<Candle[]>(
        coin ? `candles/${coin.market}` : null,
        () => getCandlesByTimeframe(coin.market, selectedTimeframe, selectedUnit, 200),
        { refreshInterval: 3000 }
    );

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
        <div className="card bg-base-200 shadow-xl border border-base-300 overflow-hidden">
            <div className="card-body p-4 md:p-8">
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
                    <div className="lg:col-span-3 bg-base-300 rounded-2xl p-4 min-h-[450px] flex flex-col items-center justify-center border border-base-content/5 shadow-inner">
                        {!candles ? (
                            <div className="flex flex-col items-center gap-4">
                                <span className="loading loading-spinner loading-lg text-primary"></span>
                                <p className="text-sm font-medium opacity-40">데이터 동기화 중...</p>
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
