import React from 'react';

const SecurityBanner = ({ contentData, region }) => {
  const getBannerText = () => {
    return `[STREAMING INFO] ${region} 가속 경로 최적화 적용됨 | 4K UHD | 5.1 Surround Sound | 공식 라이선스 인증됨 `;
  };

  return (
    <div className="security-banner-container" style={{background: 'rgba(0, 114, 210, 0.6)', color: '#fff'}}>
      <div className="scrolling-text">
        {getBannerText()} &nbsp;&nbsp; | &nbsp;&nbsp; {getBannerText()}
      </div>
    </div>
  );
};

export default SecurityBanner;
