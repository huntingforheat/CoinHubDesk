import useSWR from 'swr';
import { useMemo } from 'react';
import { getMarkets, getTickers } from '../services/upbit';
import { CoinData, Market, Ticker } from '../types/coin';
import { fetchBinancePrices, fetchExchangeRate } from '../services/external';

/**
 * 전 종목 마켓 정보와 실시간 시세 및 해외 시세(김프)를 통합하여 관리하는 커스텀 훅
 * @returns {Object} 조회된 코인 데이터와 로딩/에러 상태
 */
export const useCoinData = () => {
    // 1. 모든 마켓 정보 조회
    const { data: markets, error: marketError } = useSWR<Market[]>('markets', getMarkets, {
        revalidateOnFocus: false,
    });

    // 2. 실시간 환율 정보 조회 (1분마다 갱신)
    const { data: exchangeRate } = useSWR('exchange-rate', fetchExchangeRate, {
        refreshInterval: 60000,
        revalidateOnFocus: false,
    });

    // 3. 바이낸스 실시간 시세 조회 (3초마다 갱신)
    const { data: binancePrices } = useSWR('binance-prices', fetchBinancePrices, {
        refreshInterval: 3000,
        dedupingInterval: 1000,
    });

    // 4. KRW 마켓 아이디 목록 추출
    const krwMarketIds: string = useMemo(() => {
        return markets
            ?.filter((m: Market) => m.market.startsWith('KRW-'))
            .map((m: Market) => m.market)
            .join(',') || '';
    }, [markets]);

    // 5. 업비트 실시간 현재가(Ticker) 데이터 페칭 (3초 주기)
    const { data: tickers, error: tickerError, mutate } = useSWR<Ticker[]>(
        krwMarketIds ? `tickers/${krwMarketIds}` : null,
        () => getTickers(krwMarketIds),
        {
            refreshInterval: 3000,
            dedupingInterval: 1000
        }
    );

    // 6. 데이터 통합 및 김치프리미엄 계산 (Market Meta + Ticker + Binance + ExchangeRate)
    const combinedData: CoinData[] = useMemo(() => {
        if (!markets || !tickers) return [];

        const binancePricesData = binancePrices || {};
        const rate = exchangeRate || 1350;

        // 업비트와 바이낸스 간 심볼이 다른 경우 매핑
        const SYMBOL_MAP: Record<string, string> = {
            'BTT': 'BTTC',
            'LUNC': 'LUNC', // 바이낸스에도 LUNCUSDT 존재 확인 필요
            'GALA': 'GALA',
            // 추가적인 매핑이 필요한 코인들을 여기에 정의
        };

        return tickers
            .map((ticker: Ticker) => {
                const market = markets.find((m: Market) => m.market === ticker.market);
                const upbitSymbol = ticker.market.split('-')[1]; // 예: BTC

                // 바이낸스용 심볼 결정 (매핑 테이블 확인 후 없으면 그대로 사용)
                const binanceSymbol = SYMBOL_MAP[upbitSymbol] || upbitSymbol;
                const binancePrice = binancePricesData[`${binanceSymbol}USDT`];

                // 김치프리미엄 계산 로직
                let kimchiPremium: number | undefined;

                // 테더(USDT)의 경우 바이낸스 가격이 1달러라고 가정하거나 환율만으로 표시 가능
                if (upbitSymbol === 'USDT') {
                    kimchiPremium = ((ticker.trade_price / rate) - 1) * 100;
                } else if (binancePrice && rate) {
                    const foreignKrwPrice = binancePrice * rate;
                    kimchiPremium = ((ticker.trade_price / foreignKrwPrice) - 1) * 100;
                }

                return {
                    ...ticker,
                    korean_name: market?.korean_name || '',
                    english_name: market?.english_name || '',
                    usd_price: ticker.trade_price / rate,
                    binance_price: upbitSymbol === 'USDT' ? 1 : binancePrice,
                    kimchi_premium: kimchiPremium,
                } as CoinData;
            })
            // 정렬: 기본적으로 거래대금 내림차순 (사용자가 컴포넌트에서 변경 가능)
            .sort((a, b) => b.acc_trade_price_24h - a.acc_trade_price_24h);
    }, [markets, tickers, binancePrices, exchangeRate]);

    return {
        coins: combinedData,
        exchangeRate: exchangeRate || 1350,
        loading: !markets || !tickers,
        error: marketError || tickerError,
        refresh: mutate
    };
};
