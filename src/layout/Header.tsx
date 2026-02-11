import React from 'react';

/**
 * 상단 헤더 컴포넌트
 * @returns {React.JSX.Element}
 */
const Header = (): React.JSX.Element => {
    /**
     * 아바타 클릭 핸들러
     * @param {React.MouseEvent<HTMLDivElement>} event 클릭 이벤트
     */
    const handleAvatarClick = (event: React.MouseEvent<HTMLDivElement>): void => {
        alert('사용자 프로필 메뉴는 준비 중입니다.');
    };

    /**
     * 로고 클릭 핸들러
     * @param {React.MouseEvent<HTMLAnchorElement>} event 클릭 이벤트
     */
    const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>): void => {
        event.preventDefault();
        window.location.reload();
    };

    return (
        <header className="navbar bg-base-300 shadow-md px-6 sticky top-0 z-50">
            <div className="flex-1">
                <a
                    href="/"
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={handleLogoClick}
                >
                    <span className="text-3xl group-hover:scale-110 transition-transform">💎</span>
                    <span className="text-xl font-black text-primary tracking-tighter">CoinHubDesk</span>
                </a>
            </div>

            {/* 사용자 프로필 메뉴는 준비 중 */}
            {/* <div className="flex-none gap-4">
                <div className="dropdown dropdown-end">
                    <div
                        tabIndex={0}
                        className="btn btn-ghost btn-circle avatar border-2 border-primary/20"
                        onClick={handleAvatarClick}
                    >
                        <div className="w-10 rounded-full">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Crypto" alt="user avatar" />
                        </div>
                    </div>
                </div>
            </div> */}
        </header>
    );
};

export default Header;
