import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./i18n"; // [과제 3 핵심] 이 한 줄이 추가되어야 다국어 설정이 활성화됩니다!

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
