import React from 'react';
import Header from './layout/Header';
import CoinList from './components/coin/CoinList';
import CoinDetail from './components/coin/CoinDetail';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RootLayout } from './layout/RootLayout';
import { HomeLayout } from './layout/HomeLayout';

/**
 * 메인 애플리케이션 컴포넌트
 * @returns {React.JSX.Element}
 */
const App = (): React.JSX.Element => {

    return (
        <>
            <Routes>
                <Route element={<RootLayout />}>
                    {/* 메인 홈 레이아웃 (PC에서는 리스트와 상세를 동시에 보여줌) */}
                    <Route index element={<HomeLayout />} />
                    <Route path="/" element={<HomeLayout />} />
                    {/* 
                        모바일/태블릿(1024px 미만) 환경전용 라우트:
                        코인 클릭 시 전체 화면으로 상세 정보를 보여주기 위해 사용됩니다.
                    */}
                    <Route path="/coin/:item" element={<CoinDetail />} />
                </Route>
            </Routes>
        </>
    );
};

export default App;
