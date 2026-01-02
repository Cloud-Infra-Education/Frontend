import React, { useMemo, useState } from "react";

export default function App() {
  const buildTime = useMemo(() => new Date().toISOString(), []);
  const [count, setCount] = useState(0);

  return (
    <main className="page">
      <section className="card">
        <h1 className="title">S3 배포 테스트용 프론트엔드</h1>
        <p className="text">
          이 페이지는 GitHub Actions에서 자동 빌드된 뒤 S3로 업로드된다.
        </p>
        <div className="row">
          <button className="btn" onClick={() => setCount((c) => c + 1)}>
            클릭
          </button>
          <span className="pill">count: {count}</span>
        </div>
        <div className="meta">
          <div>buildTime: {buildTime}</div>
          <div>nodeEnv: {import.meta.env.MODE}</div>
        </div>
      </section>
    </main>
  );
}

