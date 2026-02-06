export interface Market {
    market: string;
    korean_name: string;
    english_name: string;
}

export interface Ticker {
    market: string;
    trade_date: string;
    trade_time: string;
    trade_date_kst: string;
    trade_time_kst: string;
    trade_timestamp: number;
    opening_price: number;
    high_price: number;
    low_price: number;
    trade_price: number;
    prev_closing_price: number;
    change: 'RISE' | 'FALL' | 'EVEN';
    change_price: number;
    change_rate: number;
    signed_change_price: number;
    signed_change_rate: number;
    trade_volume: number;
    acc_trade_price: number;
    acc_trade_price_24h: number;
    acc_trade_volume: number;
    acc_trade_volume_24h: number;
    highest_52_week_price: number;
    highest_52_week_date: string;
    lowest_52_week_price: number;
    lowest_52_week_date: string;
    timestamp: number;
}

export interface CoinData extends Ticker {
    korean_name: string;
    english_name: string;
    // 김치프리미엄 관련 필드 추가 (선택적)
    usd_price?: number;        // 달러 환산 현재가
    binance_price?: number;    // 바이낸스 실시간 달러가
    kimchi_premium?: number;   // 김치프리미엄 비율 (%)
}

/**
 * Upbit API에서 제공하는 캔들(봉) 데이터 인터페이스
 */
export interface Candle {
    market: string;                    // 종목 코드
    candle_date_time_utc: string;      // 캔들 기준 시각 (UTC)
    candle_date_time_kst: string;      // 캔들 기준 시각 (KST)
    opening_price: number;             // 시가
    high_price: number;                // 고가
    low_price: number;                 // 저가
    trade_price: number;               // 종가
    timestamp: number;                 // 마지막 틱이 저장된 시각
    candle_acc_trade_price: number;    // 누적 거래대금
    candle_acc_trade_volume: number;   // 누적 거래량
    unit: number;                      // 분 단위
}

/**
 * Cointelegraph RSS에서 파싱한 뉴스 데이터 인터페이스
 */
export interface NewsItem {
    title: string;
    link: string;
    pubDate: string;
    description: string;
    thumbnail: string;
}
