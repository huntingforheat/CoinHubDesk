import axios from 'axios';

/**
 * 실시간 환율 정보 인터페이스
 */
export interface ExchangeRateData {
    result: string;
    base_code: string;
    rates: {
        [key: string]: number;
    };
    time_last_update_utc: string;
}

/**
 * 바이낸스 가격 정보 인터페이스
 */
export interface BinanceTicker {
    symbol: string;
    price: string;
}

/**
 * 실시간 환율 정보를 가져옵니다. (ExchangeRate-API 활용)
 * @returns {Promise<number>} 1 USD 당 KRW 환율
 */
export const fetchExchangeRate = async (): Promise<number> => {
    try {
        // 가입 없이 사용 가능한 무료 엔드포인트 활용
        const response = await axios.get<ExchangeRateData>('https://open.er-api.com/v6/latest/USD');
        return response.data.rates.KRW;
    } catch (error) {
        console.error('환율 정보를 가져오는데 실패했습니다:', error);
        return 1350; // 실패 시 기본 환율 (예비용)
    }
};

/**
 * 바이낸스 실시간 USD(USDT) 시세를 가져옵니다.
 * @returns {Promise<Record<string, number>>} 심볼별 가격 매핑 객체
 */
export const fetchBinancePrices = async (): Promise<Record<string, number>> => {
    try {
        // 주요 코인들의 실시간 가격을 한 번에 가져오기 위해 ticker/price 활용
        const response = await axios.get<BinanceTicker[]>('https://api.binance.com/api/v3/ticker/price');

        // 검색 효율을 위해 { 심볼: 가격 } 형태의 객체로 변환
        const priceMap: Record<string, number> = {};
        response.data.forEach(item => {
            // "BTCUSDT" 형태에서 "BTC"만 추출하거나 전체 매핑
            priceMap[item.symbol] = parseFloat(item.price);
        });

        return priceMap;
    } catch (error) {
        console.error('바이낸스 시세를 가져오는데 실패했습니다:', error);
        return {};
    }
};
