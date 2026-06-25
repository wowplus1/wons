# 대화 기록 (a09c5deb-1b13-4aad-8c3f-6c42b6aaeba6)

## 사용자 요청 (2026-06-25)
- **질문**: 모바일로 확인할때 페이지 로딩이 느린거 같은데 로딩 최적화를 해줬으면해
- **원인 분석**:
  - `npm run build` 결과 단일 번들 파일인 `index-kK0i-iY2.js`가 **737.03 kB**에 달함.
  - `ag-grid`, `recharts`, `firebase` 등 무겁고 거대한 외부 라이브러리들이 `App.tsx`에서 정적으로 직접 `import`되어 모바일 초기 접속 시 한꺼번에 다운로드됨.
  - 특히 팝업 페이지(`?popup=...`)로 접속할 때도 메인 ERP 대시보드 및 복잡한 컴포넌트 전체 코드가 로드되어 극심한 성능 저하가 유발됨.
- **해결 방안 및 계획 수립**:
  - `App.tsx` 내의 대형 컴포넌트 16개 전체를 `React.lazy`와 `Suspense`를 통한 다이내믹 임포트(코드 스플리팅) 구조로 전환.
  - `vite.config.ts` 파일에서 Rollup `manualChunks` 설정을 도입하여, `ag-grid`, `recharts`, `firebase`, `lucide-react` 및 일반 `node_modules`를 별도 청크 파일로 분리.
  - 변경 사항 검증을 위해 로컬 빌드 테스트를 수행하여 메인 번들 크기가 얼마나 축소되는지 파악.
- **작업 수행 및 검증**:
  - `App.tsx` 수정:
    - 16개 ERP 컴포넌트들을 `lazy` 함수와 `.then(m => ({ default: m.ComponentName }))` 구문을 활용해 동적 임포트(dynamic import)하도록 변경하여 TypeScript의 named export 형식 미매칭 에러 해결.
    - 지연 로드에 따른 임시 지연 UI인 `LoadingFallback`을 개발하고, 팝업 렌더링 코드와 메인 화면 패널에 `<Suspense>` 컨텍스트 구성 완료.
  - `vite.config.ts` 수정:
    - `manualChunks` 함수 설정을 도입하여 `node_modules` 아래의 무거운 모듈인 `firebase`, `ag-grid`, `recharts`, `lucide-react`를 개별 벤더 청크 파일로 추출하고, 빌드 경고 한계치인 `chunkSizeWarningLimit`를 1000KB로 조율.
  - 검증 완료:
    - 최종 `npm run build` 수행 결과, 단일 `index.js`가 **737.03 kB**에서 **36.62 kB**로 약 **95%** 가량 획기적으로 급감하여 로딩 속도를 최적화 완료함.
