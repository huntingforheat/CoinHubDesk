import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries } from 'lightweight-charts';
import { Candle } from '../../types/coin';
import { getCandlesByTimeframe, TimeframeType } from '../../services/upbit';

interface CoinChartProps {
    candles: Candle[];
    market: string;
    onCandleTypeChange: (type: TimeframeType) => void;
    onCandleUnitChange: (type: number) => void;
}

/**
 * 시간봉 옵션 정의
 */
const TIMEFRAME_OPTIONS = [
    { type: 'minutes' as TimeframeType, unit: 1, label: '1분' },
    { type: 'minutes' as TimeframeType, unit: 3, label: '3분' },
    { type: 'minutes' as TimeframeType, unit: 5, label: '5분' },
    { type: 'minutes' as TimeframeType, unit: 10, label: '10분' },
    { type: 'minutes' as TimeframeType, unit: 15, label: '15분' },
    { type: 'minutes' as TimeframeType, unit: 30, label: '30분' },
    { type: 'minutes' as TimeframeType, unit: 60, label: '1시간' },
    { type: 'minutes' as TimeframeType, unit: 240, label: '4시간' },
    { type: 'days' as TimeframeType, unit: 1, label: '일봉' },
    { type: 'weeks' as TimeframeType, unit: 1, label: '주봉' },
];

/**
 * 캔들 차트 컴포넌트 (무한 스크롤 지원 + 다양한 시간봉)
 * @param {CoinChartProps} props candles 데이터 및 마켓 코드
 * @returns {React.JSX.Element}
 */
const CoinChart = ({ candles, market, onCandleTypeChange, onCandleUnitChange }: CoinChartProps): React.JSX.Element => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

    // 과거 데이터 로딩 상태 관리
    const [allCandles, setAllCandles] = useState<Candle[]>(candles);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const isLoadingRef = useRef(false); // 중복 요청 방지용 ref
    const isInitialLoadRef = useRef(true); // 초기 로드 여부 추적용 ref

    // 시간봉 선택 상태
    const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeType>('minutes');
    const [selectedUnit, setSelectedUnit] = useState<number>(1);

    // candles prop이 변경되면 전체 캔들 데이터 업데이트
    useEffect(() => {
        setAllCandles(candles);
        isInitialLoadRef.current = true; // 새로운 데이터 로드 시 초기화
    }, [candles]);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // 차트 생성
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#A6ADBB',
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            grid: {
                vertLines: { color: 'rgba(166, 173, 187, 0.05)' },
                horzLines: { color: 'rgba(166, 173, 187, 0.05)' },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: 'rgba(166, 173, 187, 0.1)',
            },
            rightPriceScale: {
                borderColor: 'rgba(166, 173, 187, 0.1)',
                // 가격 포맷팅: 천 단위 콤마 추가
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            localization: {
                // 가격을 천 단위 콤마로 포맷팅 (예: 96,420,000.00)
                priceFormatter: (price: number) => {
                    return price.toLocaleString('ko-KR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
                },
            }
        });

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
            wickUpColor: '#26a69a', wickDownColor: '#ef5350',
        });

        chartRef.current = chart;
        candlestickSeriesRef.current = candlestickSeries;

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    // 과거 캔들 데이터 로드 함수
    const loadMoreCandles = async () => {
        // 이미 로딩 중이거나, 캔들 데이터가 없거나, 차트 인스턴스가 없으면 요청 중단
        if (isLoadingRef.current || allCandles.length === 0 || !chartRef.current) return;

        isLoadingRef.current = true;
        setIsLoadingMore(true);

        try {
            // 현재 보이는 차트 범위 저장 (데이터 추가 후 뷰포트 복원용)
            const timeScale = chartRef.current.timeScale();
            const currentRange = timeScale.getVisibleLogicalRange();

            // 현재 allCandles에서 가장 오래된 캔들을 찾아 그 시각을 기준으로 과거 데이터 요청
            // 타임스탬프 기준 오름차순 정렬 후 첫 번째 요소가 가장 오래된 캔들
            const sortedCandles = [...allCandles].sort((a, b) => a.timestamp - b.timestamp);
            const oldestCandle = sortedCandles[0];
            const toTimestamp = new Date(oldestCandle.candle_date_time_kst).toISOString();

            console.log('과거 캔들 로드 중...', toTimestamp);

            // Upbit API에서 이전 200개 캔들 요청 (선택된 시간봉 기준)
            const olderCandles = await getCandlesByTimeframe(market, selectedTimeframe, selectedUnit, 200, toTimestamp);

            if (olderCandles.length > 0) {
                // 중복 제거: 기존 allCandles에 없는 새로운 캔들만 필터링
                const existingTimestamps = new Set(allCandles.map(c => c.timestamp));
                const newCandles = olderCandles.filter((c: Candle) => !existingTimestamps.has(c.timestamp));

                if (newCandles.length > 0) {
                    console.log(`${newCandles.length}개의 과거 캔들 추가 시작`);

                    // 현재 보이는 시간 범위를 저장 (실제 타임스탬프 기반)
                    const visibleTimeRange = currentRange ? timeScale.getVisibleRange() : null;

                    // allCandles 상태 업데이트 (새로운 과거 데이터를 기존 데이터에 추가)
                    // useEffect에서 자동으로 setData()가 호출되어 차트에 반영됩니다
                    setAllCandles(prev => [...prev, ...newCandles]);

                    // 약간의 지연 후 뷰포트 복원 (setData 완료 대기)
                    if (visibleTimeRange) {
                        setTimeout(() => {
                            if (chartRef.current) {
                                chartRef.current.timeScale().setVisibleRange(visibleTimeRange);
                            }
                        }, 50);
                    }

                    console.log(`${newCandles.length}개의 과거 캔들 추가 완료`);
                }
            }
        } catch (error) {
            console.error('과거 캔들 로드 실패:', error);
        } finally {
            setIsLoadingMore(false);
            isLoadingRef.current = false;
        }
    };

    // 차트 데이터 업데이트 및 무한 스크롤 이벤트 등록
    useEffect(() => {
        if (!candlestickSeriesRef.current || !chartRef.current || allCandles.length === 0) return;

        // 캔들 데이터를 차트 형식으로 변환 및 정렬
        const chartData = [...allCandles]
            .sort((a, b) => a.timestamp - b.timestamp)
            // 중복 타임스탬프 제거: 같은 시간에 여러 캔들이 있다면 마지막 것만 사용
            // 이는 API에서 동일한 시간대의 캔들을 여러 번 반환할 경우를 대비합니다.
            .reduce((acc, candle) => {
                const time = candle.timestamp / 1000;
                const candleData = {
                    time: time as any,
                    open: candle.opening_price,
                    high: candle.high_price,
                    low: candle.low_price,
                    close: candle.trade_price,
                };

                // 이미 해당 타임스탬프의 데이터가 있으면 덮어쓰고, 없으면 추가
                const existingIndex = acc.findIndex(c => c.time === time);
                if (existingIndex >= 0) {
                    acc[existingIndex] = candleData;
                } else {
                    acc.push(candleData);
                }
                return acc;
            }, [] as any[]);

        // 차트 시리즈에 데이터 설정
        candlestickSeriesRef.current.setData(chartData);

        // 초기 로드 시에만 fitContent 호출 (이후에는 사용자 뷰포트 유지)
        if (isInitialLoadRef.current) {
            chartRef.current.timeScale().fitContent();
            isInitialLoadRef.current = false; // 초기 로드 완료
        }

        // 타임스케일 변경 이벤트 구독 (무한 스크롤 구현)
        const timeScale = chartRef.current.timeScale();

        const handleVisibleRangeChange = (range: any) => {
            // range가 유효하지 않거나 이미 로딩 중이면 중단
            if (!range || isLoadingRef.current) return;

            // 사용자가 차트를 왼쪽 끝까지 스크롤했는지 확인
            // from 값이 작은 값(예: 0~10)이면 왼쪽 끝에 가까운 상태로 간주
            if (range.from !== null && range.from < 10) {
                console.log('왼쪽 끝 도달, 과거 데이터 로드 시작');
                loadMoreCandles();
            }
        };

        timeScale.subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

        return () => {
            timeScale.unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
        };
    }, [allCandles, market]);

    // 시간봉 변경 핸들러
    const handleTimeframeChange = async (type: TimeframeType, unit: number) => {
        // setSelectedTimeframe(type);
        // setSelectedUnit(unit);
        isInitialLoadRef.current = true; // 새로운 시간봉 로드 시 초기화

        // 새로운 시간봉 데이터 로드
        try {
            const newCandles = await getCandlesByTimeframe(market, type, unit, 200);
            setAllCandles(newCandles);

            onCandleTypeChange(type);
            onCandleUnitChange(unit);
        } catch (error) {
            console.error('시간봉 변경 중 에러:', error);
        }
    };

    return (
        <div className="relative w-full h-full flex flex-col">
            {/* 시간봉 선택 UI */}
            <div className="flex flex-wrap gap-1 mb-3 p-2 bg-base-200/50 rounded-xl border border-base-content/5">
                {TIMEFRAME_OPTIONS.map((option) => {
                    const isActive = selectedTimeframe === option.type && selectedUnit === option.unit;
                    return (
                        <button
                            key={`${option.type}-${option.unit}`}
                            onClick={() => handleTimeframeChange(option.type, option.unit)}
                            className={`btn btn-xs transition-all duration-200 ${isActive
                                ? 'btn-primary shadow-sm'
                                : 'btn-ghost opacity-50 hover:opacity-100'
                                }`}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>

            {/* 차트 영역 */}
            <div className="flex-1 relative">
                <div ref={chartContainerRef} className="w-full h-full" />
                {/* 로딩 인디케이터 */}
                {isLoadingMore && (
                    <div className="absolute top-2 left-2 bg-base-300/90 px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2">
                        <span className="loading loading-spinner loading-xs"></span>
                        <span className="text-xs font-medium">과거 데이터 로드 중...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CoinChart;
