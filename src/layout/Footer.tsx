import React from "react";

export const Footer = () => {
    return (
        <footer className="footer footer-center p-8 bg-base-300 text-base-content border-t border-primary/5 mt-auto">
            <div>
                <p className="font-bold text-lg opacity-80">CoinHubDesk Project</p>
                <p className="opacity-50">© 2026 Developed for CoinHubDesk</p>
            </div>
            <div className="max-w-4xl opacity-40 text-xs mt-4">
                <p>CoinHubDesk는 사이트 내 모든 암호화폐 가격, 차트, 뉴스 및 투자 관련 정보에 대해 어떠한 법적 책임이나 보증을 지지 않습니다.</p>
                <p>디지털 자산 거래 및 투자는 높은 위험을 수반하며, 모든 손실은 본인의 판단과 책임 하에 이루어져야 합니다. 제공되는 정보는 참고용일 뿐 투자 권유가 아닙니다.</p>
            </div>
        </footer>
    )
}