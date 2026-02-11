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
    const prevMarketRef = useRef(market); // 마켓 변경 감지용 ref

    // 시간봉 선택 상태
    const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeType>('minutes');
    const [selectedUnit, setSelectedUnit] = useState<number>(1);

    const selectedTimeframeRef = useRef<TimeframeType>('minutes');
    const selectedUnitRef = useRef<number>(1);

    // candles prop이 변경되면 전체 캔들 데이터 업데이트
    useEffect(() => {
        if (candles.length === 0) return;

        // 마켓이 변경되었으면 초기화 및 새 데이터 로드
        if (prevMarketRef.current !== market) {
            setAllCandles(candles);
            isInitialLoadRef.current = true;
            prevMarketRef.current = market;
            return;
        }

        // 기존 데이터와 병합 (과거 데이터 유지 + 최신 데이터 업데이트)
        setAllCandles(prev => {
            // 캔들 데이터가 없으면 바로 설정
            if (prev.length === 0) return candles;

            // 최적화: 마지막 캔들(최신) 시간(KST 기준) 비교
            // 배열이 오름차순(과거->미래)으로 정렬되어 있다고 가정
            const lastPrevCandle = prev[prev.length - 1];
            const sortedNewCandles = [...candles].sort((a, b) => new Date(a.candle_date_time_kst).getTime() - new Date(b.candle_date_time_kst).getTime());
            const lastNewCandle = sortedNewCandles[sortedNewCandles.length - 1];

            // 1. KST 시간이 같은 경우 (업데이트): 기존 마지막 캔들의 high/low/close 등만 업데이트
            if (lastPrevCandle.candle_date_time_kst === lastNewCandle.candle_date_time_kst) {
                const updatedPrev = [...prev];
                updatedPrev[updatedPrev.length - 1] = {
                    ...lastPrevCandle,
                    high_price: lastNewCandle.high_price,
                    low_price: lastNewCandle.low_price,
                    trade_price: lastNewCandle.trade_price,
                    candle_acc_trade_price: lastNewCandle.candle_acc_trade_price,
                    candle_acc_trade_volume: lastNewCandle.candle_acc_trade_volume
                };
                return updatedPrev;
            }

            // 2. 시간이 다른 경우 (새 캔들 추가): 중복 제거 후 합치기
            // candle_date_time_kst를 키로 사용하여 중복 제거
            const candleMap = new Map<string, Candle>();
            prev.forEach(c => candleMap.set(c.candle_date_time_kst, c));
            candles.forEach(c => candleMap.set(c.candle_date_time_kst, c));

            // 배열로 변환 및 정렬
            return Array.from(candleMap.values()).sort((a, b) => new Date(a.candle_date_time_kst).getTime() - new Date(b.candle_date_time_kst).getTime());
        });

        // 중요: 데이터를 업데이트 할 때마다 초기 로드 플래그를 true로 설정하지 않음
        // 이렇게 함으로써 실시간 데이터가 들어와도 사용자가 보고 있는 차트 위치(과거 등)가 유지됨
    }, [candles, market]);

    /**
     * 차트 초기 생성 및 리사이즈 로직
     */
    useEffect(() => {
        if (!chartContainerRef.current) return;

        // 차트 인스턴스 생성
        // 초기 너비는 컨테이너의 clientWidth를 사용하되, 0일 경우를 대비해 최소값을 고려할 수 있습니다.
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#A6ADBB',
            },
            width: chartContainerRef.current.clientWidth || 300,
            height: 400,
            grid: {
                vertLines: { color: 'rgba(166, 173, 187, 0.05)' },
                horzLines: { color: 'rgba(166, 173, 187, 0.05)' },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: 'rgba(166, 173, 187, 0.1)',
                tickMarkFormatter: (time: number) => {
                    const date = new Date(time * 1000);
                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                }
            },
            rightPriceScale: {
                borderColor: 'rgba(166, 173, 187, 0.1)',
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            localization: {
                priceFormatter: (price: number) => {
                    return price.toLocaleString('ko-KR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
                },
                timeFormatter: (time: number) => {
                    const date = new Date(time * 1000);
                    return date.toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
            }
        });

        // 캔들 시리즈 추가
        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
            wickUpColor: '#26a69a', wickDownColor: '#ef5350',
        });

        chartRef.current = chart;
        candlestickSeriesRef.current = candlestickSeries;

        /**
         * ResizeObserver를 통한 동적 크기 조정
         * PC 버전에서 상세 정보 창이 열릴 때 애니메이션이 진행되면 clientWidth가 0에서 점진적으로 증가합니다.
         * ResizeObserver는 이 변화를 실시간으로 감지하여 차트의 너비를 맞춰줍니다.
         */
        const resizeObserver = new ResizeObserver(entries => {
            if (entries.length === 0 || !chartContainerRef.current) return;
            const newWidth = entries[0].contentRect.width;
            if (newWidth > 0) {
                chart.applyOptions({ width: newWidth });
                // 초기 렌더링 시 너비를 잡은 후 차트 봉들을 꽉 채우도록 fitContent 실행
                if (isInitialLoadRef.current) {
                    chart.timeScale().fitContent();
                }
            }
        });

        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
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
            const sortedCandles = [...allCandles].sort((a, b) => new Date(a.candle_date_time_kst).getTime() - new Date(b.candle_date_time_kst).getTime());
            const oldestCandle = sortedCandles[0];
            const toTimestamp = new Date(oldestCandle.candle_date_time_kst).toISOString(); // ISO 포맷 사용

            // console.log('과거 캔들 로드 중...', toTimestamp);

            // Upbit API에서 이전 200개 캔들 요청 (선택된 시간봉 기준)
            const olderCandles = await getCandlesByTimeframe(market, selectedTimeframe, selectedUnit, 200, toTimestamp);

            if (olderCandles.length > 0) {
                // 중복 제거: candle_date_time_kst 기준
                const existingTimestamps = new Set(allCandles.map(c => c.candle_date_time_kst));
                const newCandles = olderCandles.filter((c: Candle) => !existingTimestamps.has(c.candle_date_time_kst));

                if (newCandles.length > 0) {
                    // console.log(`${newCandles.length}개의 과거 캔들 추가 시작`);

                    // 현재 보이는 시간 범위를 저장 (실제 타임스탬프 기반)
                    const visibleTimeRange = currentRange ? timeScale.getVisibleRange() : null;

                    // allCandles 상태 업데이트 (새로운 과거 데이터를 기존 데이터에 추가)
                    setAllCandles(prev => [...prev, ...newCandles]);

                    // 약간의 지연 후 뷰포트 복원 (setData 완료 대기)
                    if (visibleTimeRange) {
                        setTimeout(() => {
                            if (chartRef.current) {
                                chartRef.current.timeScale().setVisibleRange(visibleTimeRange);
                            }
                        }, 50);
                    }

                    // console.log(`${newCandles.length}개의 과거 캔들 추가 완료`);
                }
            }
        } catch (error) {
            console.error('과거 캔들 로드 실패:');
        } finally {
            setIsLoadingMore(false);
            isLoadingRef.current = false;
        }
    };

    // 차트 데이터 업데이트 및 무한 스크롤 이벤트 등록
    useEffect(() => {
        if (!candlestickSeriesRef.current || !chartRef.current || allCandles.length === 0) return;

        // if ([...allCandles][0].candle_date_time_kst === candles[0].candle_date_time_kst) return;

        // 캔들 데이터를 차트 형식으로 변환 및 정렬
        const chartData = [...allCandles]
            .sort((a, b) => new Date(a.candle_date_time_kst).getTime() - new Date(b.candle_date_time_kst).getTime())
            // 중복 타임스탬프 제거: 같은 시간에 여러 캔들이 있다면 마지막 것만 사용
            .reduce((acc, candle) => {
                // KST 시간을 사용. UTC+9 보정 없이 단순 파싱하면 로컬 시간대가 적용될 수 있으므로 주의.
                // 여기서는 candle_date_time_utc를 사용하여 확실한 UTC 타임스탬프를 얻는 것이 안전함.
                const time = new Date(candle.candle_date_time_utc + 'Z').getTime() / 1000;

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
                // console.log('왼쪽 끝 도달, 과거 데이터 로드 시작');
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
        setSelectedTimeframe(type);
        setSelectedUnit(unit);

        selectedTimeframeRef.current = type;
        selectedUnitRef.current = unit;

        isInitialLoadRef.current = true; // 새로운 시간봉 로드 시 초기화

        // 새로운 시간봉 데이터 로드
        try {
            const newCandles = await getCandlesByTimeframe(market, type, unit, 200);
            setAllCandles(newCandles);

            onCandleTypeChange(selectedTimeframeRef.current);
            onCandleUnitChange(selectedUnitRef.current);
        } catch (error) {
            console.error('시간봉 변경 중 에러');
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
