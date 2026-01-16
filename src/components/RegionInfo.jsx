import React, { useState, useEffect } from 'react';

const RegionInfo = ({ userLanguage }) => {
  const [latency, setLatency] = useState(0);

  useEffect(() => {
    const baseLatency = userLanguage === 'KOR' ? 12 : 145;
    const interval = setInterval(() => {
      setLatency(baseLatency + Math.floor(Math.random() * 7));
    }, 1500); //
    return () => clearInterval(interval);
  }, [userLanguage]);

  return (
    <div className="region-monitor">
      <div className="region-header">📍 {userLanguage === 'KOR' ? 'Seoul' : 'Oregon'}</div>
      <div className="latency-info"><span className="status-dot"></span> {latency}ms</div>
    </div>
  );
};

export default RegionInfo;
