import axios from 'axios';
import { Candle, Market, Ticker } from '../types/coin';

const BASE_URL = 'https://api.upbit.com/v1';

export const getMarkets = async (): Promise<Market[]> => {
    try {
        const response = await axios.get(`${BASE_URL}/market/all?isDetails=false`);
        return response.data;
    } catch (error) {
        console.error('Error fetching markets:');
        throw error;
    }
};

export const getTickers = async (markets: string): Promise<Ticker[]> => {
    try {
        const response = await axios.get(`${BASE_URL}/ticker?markets=${markets}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching tickers:');
        throw error;
    }
};

/**
 * 특정 마켓의 캔들(분봉) 데이터를 가져오는 함수
 * @param {string} market - 마켓 코드 (예: KRW-BTC)
 * @param {number} unit - 분 단위 (1, 3, 5, 10, 15, 30, 60, 240)
 * @param {number} count - 요청할 캔들 개수 (최대 200)
 * @param {string} to - 마지막 캔들 시각 (ISO 8601 형식, 선택적). 이 시각 이전의 캔들을 조회
 */
export const getCandles = async (
    market: string,
    unit: number = 1,
    count: number = 200,
    to?: string
): Promise<Candle[]> => {
    try {
        let url = `${BASE_URL}/candles/minutes/${unit}?market=${market}&count=${count}`;

        // to 파라미터가 제공되면 URL에 추가 (과거 데이터 요청용)
        if (to) {
            url += `&to=${encodeURIComponent(to)}`;
        }

        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching candles:');
        throw error;
    }
};

/**
 * 시간봉 타입 정의
 */
export type TimeframeType = 'minutes' | 'days' | 'weeks';

/**
 * 다양한 시간봉(분봉, 일봉, 주봉) 데이터를 가져오는 통합 함수
 * @param {string} market - 마켓 코드 (예: KRW-BTC)
 * @param {TimeframeType} type - 시간봉 타입 ('minutes', 'days', 'weeks')
 * @param {number} unit - 분봉일 경우 분 단위 (1, 3, 5, 10, 15, 30, 60, 240), 일봉/주봉은 무시
 * @param {number} count - 요청할 캔들 개수 (최대 200)
 * @param {string} to - 마지막 캔들 시각 (ISO 8601 형식, 선택적)
 */
export const getCandlesByTimeframe = async (
    market: string,
    type: TimeframeType,
    unit: number = 1,
    count: number = 200,
    to?: string
): Promise<Candle[]> => {
    try {
        let url = '';

        // 시간봉 타입에 따라 API 엔드포인트 결정
        switch (type) {
            case 'minutes':
                url = `${BASE_URL}/candles/minutes/${unit}?market=${market}&count=${count}`;
                break;
            case 'days':
                url = `${BASE_URL}/candles/days?market=${market}&count=${count}`;
                break;
            case 'weeks':
                url = `${BASE_URL}/candles/weeks?market=${market}&count=${count}`;
                break;
            default:
                throw new Error(`Unsupported timeframe type: ${type}`);
        }

        // to 파라미터가 제공되면 URL에 추가 (과거 데이터 요청용)
        if (to) {
            url += `&to=${encodeURIComponent(to)}`;
        }

        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error(`Error fetching ${type} candles:`);
        throw error;
    }
};
