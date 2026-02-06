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

        const rate = exchangeRate || 1350; // 기본 환율값 사용

        return tickers
            .map((ticker: Ticker) => {
                const market = markets.find((m: Market) => m.market === ticker.market);
                const symbol = ticker.market.split('-')[1]; // 예: BTC
                const binancePrice = binancePrices ? binancePrices[`${symbol}USDT`] : undefined;

                // 김치프리미엄 계산 로직
                let kimchiPremium: number | undefined;
                if (binancePrice && rate) {
                    const foreignKrwPrice = binancePrice * rate;
                    kimchiPremium = ((ticker.trade_price / foreignKrwPrice) - 1) * 100;
                }

                return {
                    ...ticker,
                    korean_name: market?.korean_name || '',
                    english_name: market?.english_name || '',
                    usd_price: ticker.trade_price / rate,
                    binance_price: binancePrice,
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
