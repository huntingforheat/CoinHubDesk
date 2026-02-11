import axios from 'axios';
import { NewsItem } from '../types/coin';

/**
 * 코인 심볼별 Cointelegraph 태그 매핑
 */
const COIN_TAG_MAP: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'XRP': 'ripple',
    'ADA': 'cardano',
    'SOL': 'solana',
    'DOGE': 'dogecoin',
    'DOT': 'polkadot',
    'MATIC': 'polygon',
    'TRX': 'tron',
    'AVAX': 'avalanche',
};

/**
 * Cointelegraph RSS 뉴스를 가져와서 파싱하고 한국어로 번역합니다.
 * @param symbol 코인 심볼 (예: BTC)
 * @returns {Promise<NewsItem[]>} 뉴스 목록
 */
export const getCoinNews = async (symbol: string): Promise<NewsItem[]> => {
    try {
        const tag = COIN_TAG_MAP[symbol] || symbol.toLowerCase();
        const rssUrl = `https://cointelegraph.com/rss/tag/${tag}`;

        // CORS 우회를 위해 allorigins 프록시 사용
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;

        const response = await axios.get(proxyUrl);
        const xmlString = response.data.contents;

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        const items = xmlDoc.querySelectorAll("item");

        const initialNewsItems: NewsItem[] = [];

        // 최근 5개만 추출
        const limit = Math.min(items.length, 5);

        for (let i = 0; i < limit; i++) {
            const item = items[i];
            const title = item.querySelector("title")?.textContent || "";
            const link = item.querySelector("link")?.textContent || "";
            const pubDate = item.querySelector("pubDate")?.textContent || "";
            const descriptionHtml = item.querySelector("description")?.textContent || "";

            // HTML 파서로 description 내부의 이미지와 텍스트 분리
            const doc = parser.parseFromString(descriptionHtml, 'text/html');
            const img = doc.querySelector('img');
            const thumbnail = img?.getAttribute('src') || "";

            // HTML 태그 제거 및 텍스트만 추출
            const description = doc.body.textContent?.trim() || "";

            initialNewsItems.push({
                title,
                link,
                pubDate: new Date(pubDate).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                }),
                description: description.length > 200 ? description.substring(0, 200) + "..." : description,
                thumbnail
            });
        }


        // 번역할 텍스트 추출 (제목 + 설명)
        const textsToTranslate = initialNewsItems.flatMap(item => [item.title, item.description]);

        // 한 번에 번역 수행
        // const translatedTexts = await translateToKorean(textsToTranslate);

        // 번역된 텍스트 다시 매핑
        const finalNewsItems = initialNewsItems.map((item, idx) => ({
            ...item,
            title: item.title,
            description: item.description
        }));

        // title: translatedTexts[idx * 2] || item.title,
        //     description: translatedTexts[idx * 2 + 1] || item.description

        return finalNewsItems;
    } catch (error) {
        console.error("Failed to fetch news:");
        return [];
    }
};
