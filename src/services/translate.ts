// import { InferenceClient } from '@huggingface/inference';

// const MODEL_ID = "Helsinki-NLP/opus-mt-tc-big-en-ko";
// const API_TOKEN = process.env.HUGGINGFACE_ACCESS_TOKEN;

// // InferenceClient 인스턴스 생성
// const client = new InferenceClient(API_TOKEN);

// /**
//  * Hugging Face Inference API를 사용하여 영어를 한국어로 번역합니다.
//  * @param texts 번역할 텍스트 배열
//  * @returns {Promise<string[]>} 번역된 텍스트 배열
//  */
// export const translateToKorean = async (texts: string[]): Promise<string[]> => {
//     if (!API_TOKEN) {
//         console.warn("Hugging Face API Token is missing. Translation skipped.");
//         return texts;
//     }

//     if (texts.length === 0) return [];

//     try {
//         // 병렬 처리를 통해 번역 속도 향상
//         const translationPromises = texts.map(async (text) => {
//             if (!text.trim()) return text;

//             try {
//                 // Helsinki-NLP 모델은 별도의 언어 파라미터 없이도 작동하지만,
//                 // translation 메서드를 통해 호출 시 모델 특성에 맞게 결과가 반환됩니다.
//                 const response = await client.translation({
//                     model: MODEL_ID,
//                     inputs: text
//                 });

//                 console.log('res123444: ', response, text);

//                 // 응답 구조 확인 및 텍스트 추출
//                 if (response && 'translation_text' in response) {
//                     return response.translation_text as string;
//                 }

//                 // // 배열 형태로 오는 경우 대응
//                 // if (Array.isArray(response) && response[0]?.translation_text) {
//                 //     return response[0].translation_text;
//                 // }

//                 return text;
//             } catch (err) {
//                 console.error(`Individual translation failed for: "${text.substring(0, 20)}..."`, err);
//                 return text; // 개별 번역 실패 시 원본 유지
//             }
//         });

//         return await Promise.all(translationPromises);
//     } catch (error) {
//         console.error("Total translation error:", error);
//         return texts; // 전체 에러 발생 시 원본 배열 반환
//     }
// };
