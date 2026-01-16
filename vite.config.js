import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  // [과제 3 대응] 배포될 하위 경로 주소를 설정합니다.
  base: "/", 
  
  plugins: [react()],
  
  build: {
    // 빌드 결과물이 저장될 폴더명입니다.
    outDir: "dist"
  }
});
