import React from "react";
import CoinList from "../components/coin/CoinList";
import { CoinData } from "@app-types/coin";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import CoinDetail from "@components/coin/CoinDetail";

export const HomeLayout = () => {
    const [selectedCoin, setSelectedCoin] = useState<CoinData | null>(null);
    const [currencyMode, setCurrencyMode] = useState<'KRW' | 'USD'>('KRW');

    // 코인 선택 이벤트 핸들러
    const handleSelectCoin = (coin: CoinData) => setSelectedCoin(coin);

    // 배경(빈 공간) 클릭 시 상세 정보를 닫는 핸들러
    const handleBackgroundClick = () => {
        // lg(1024px) 이상의 PC 환경에서만 동작하도록 처리
        const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
        if (isDesktop) {
            setSelectedCoin(null);
        }
    };

    return (
        /* 
            main 태그를 전체 너비(w-full)와 최소 높이(min-h-screen)로 설정.
            PC 버전에서는 전체 페이지 스크롤 대신 내부 영역 스크롤을 위해 고정된 높이를 관리할 수 있습니다.
        */
        <main
            className="flex-grow w-full min-h-screen py-8 cursor-default"
            onClick={handleBackgroundClick}
        >
            {/* 실제 컨텐츠 중앙 정렬 */}
            <div className="container mx-auto px-4 md:px-8">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* 
                        왼쪽: CoinList 영역 
                        - lg:h-[calc(100vh-160px)]: PC 뷰포트 높이에 맞춰 고정 (헤더/여백 제외)
                        - lg:overflow-y-auto: 항목이 많아지면 독립적인 스크롤바 생성
                        - no-scrollbar: 디자인에 따라 스크롤바를 숨기거나 기본 스타일 유지 가능
                    */}
                    <div
                        className={`w-full ${selectedCoin ? 'lg:w-1/3' : 'w-full'} transition-all duration-300 lg:h-[calc(100vh-160px)] lg:overflow-y-auto pr-2`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <section className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                            <div>
                                <h1 className="text-3xl font-black mb-2 text-primary tracking-tight">
                                    암호화폐 시장
                                </h1>
                                <p className="text-sm opacity-60 font-medium">
                                    실시간 시세 및 김치프리미엄 (3초 자동 갱신)
                                </p>
                            </div>

                            {/* 통화 전환 토글 버튼 */}
                            <div className="join bg-base-300/50 p-1 rounded-2xl border border-base-content/5 shadow-inner">
                                <button
                                    onClick={() => setCurrencyMode('KRW')}
                                    className={`join-item btn btn-xs md:btn-sm border-none transition-all duration-300 ${currencyMode === 'KRW' ? 'btn-primary shadow-sm rounded-xl' : 'btn-ghost opacity-50'}`}
                                >
                                    KRW (₩)
                                </button>
                                <button
                                    onClick={() => setCurrencyMode('USD')}
                                    className={`join-item btn btn-xs md:btn-sm border-none transition-all duration-300 ${currencyMode === 'USD' ? 'btn-primary shadow-sm rounded-xl' : 'btn-ghost opacity-50'}`}
                                >
                                    USD ($)
                                </button>
                            </div>
                        </section>
                        <CoinList
                            onSelect={handleSelectCoin}
                            selectedMarket={selectedCoin?.market}
                            currencyMode={currencyMode}
                        />
                    </div>

                    {/* 
                        오른쪽: 상세 정보 섹션 
                        - lg:h-[calc(100vh-160px)]: 좌측과 동일한 높이로 설정
                        - lg:overflow-y-auto: 긴 내용(뉴스 등)도 리스트와 독립적으로 스크롤 가능
                        - lg:sticky: 최상단 고정을 위해 유지
                    */}
                    <div
                        id="detail-section"
                        className={`w-full ${selectedCoin ? 'lg:w-2/3 block' : 'hidden'} lg:sticky lg:top-24 lg:h-[calc(100vh-160px)] lg:overflow-y-auto pr-2`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* PC 환경: selectedCoin 상태를 prop으로 전달하여 즉각 렌더링 */}
                        <CoinDetail initialData={selectedCoin || undefined} />
                    </div>
                </div>
            </div>
        </main>
    );
};
