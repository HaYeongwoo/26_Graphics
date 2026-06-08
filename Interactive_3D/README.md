# NOVA · Interactive 3D Control Room

이번 학기에 학습한 **Three.js / GLTF(GLB) / 조명 / 그림자 / 환경맵 / 애니메이션** 기술을 활용해 제작한
인터랙티브 3D 콘텐츠입니다. 네온/레트로퓨처 우주 정거장 콘셉트의 공간에서 로봇을 직접 움직이고 반응시킬 수 있습니다.

**빌드 도구:** Vite + npm · **렌더링:** Three.js

---

##  실행 방법 (npm)

```bash
# 1) 의존성 설치
npm install

# 2) 개발 서버 실행
npm run dev


```
---

##  필수 구현 사항 체크리스트

| 요구사항 | 구현 내용 |
|---|---|
| **3D 모델(GLTF/GLB) 1개 이상** | public/models/nova.glb을 GLTFLoader로 로드 |
| **조명(Light) 적용** | AmbientLight + DirectionalLight(그림자) + PointLight ×2(시안·핑크 림라이트) |
| **애니메이션 구현** | 둥실 떠다니기·안테나/눈 맥동 발광·점프(중력 물리)·회전 댄스 모드·데코 회전 |
| **사용자 인터랙션** | 드래그 시점 회전·휠 줌(OrbitControls), **클릭 시 레이캐스트로 로봇 반응**, **WASD/방향키 이동·Space 점프·R 리셋** |

추가 요소: 환경맵 반사, 바닥 그림자, 별 입자 배경, HUD UI, 화면 캡처 버튼.

---

##  조작 방법

| 입력 | 동작 |
|---|---|
| 마우스 드래그 / 휠 | 카메라 시점 회전 / 줌 |
| **NOVA 클릭** | 점프 + 발광 플래시 |
| `W` `A` `S` `D` / 방향키 | NOVA 이동 (바라보는 방향으로 회전) |
| `Space` / `R` | 점프 / 위치·색상 리셋 |
| 하단 도크 버튼 | 댄스 · 점프 · 리셋 · 색상 변경 · 화면 캡처 |

---

##  파일 구조

```
graphic/
├─ index.html              # Vite 진입 HTML (UI + CSS)
├─ src/
│  └─ main.js               # Three.js 메인 로직
├─ public/
│  └─ models/
│     └─ nova.glb           # 로봇 3D 모델
├─ package.json             # 의존성(three, vite) + 스크립트
├─ vite.config.js           # Vite 설정
└─ README.md
```

---

##  동작 원리 (구현 설명)

- **모듈 번들링**: Vite가 `src/main.js`의 `import * as THREE from 'three'`, `import ... from 'three/addons/...'를 `node_modules`에서 해석해 번들링한다.
- **렌더링 파이프라인**: `WebGLRenderer`(antialias, PCFSoftShadowMap, ACESFilmic 톤매핑) → `Scene` → `PerspectiveCamera`.
- **모델 로드**: `GLTFLoader.load()`로 `nova.glb`를 비동기 로드 → `traverse()`로 각 메쉬에 그림자 속성 지정, 눈·안테나·패널은 `emissive` 재질로 교체해 발광.
- **이동 로직**: 키 입력 상태를 저장 → 매 프레임 카메라 전방 벡터 기준 이동 벡터 계산 → `clamp`로 범위 제한, `atan2`+`MathUtils.damp`로 진행 방향을 향해 부드럽게 회전.
- **점프**: 초기 속도 + 중력 가속(`v -= g·dt`) 적분.
- **클릭 반응**: `Raycaster`로 화면 좌표를 광선으로 바꿔 로봇과 교차 검사 → 점프·발광
- **애니메이션 루프**: `requestAnimationFrame` + `Clock.getDelta()`(프레임 독립적 시간 기반 갱신).
- **환경맵/조명**: `PMREMGenerator`+`RoomEnvironment`로 금속 반사 표현, 방향광이 그림자 생성.

---

##  실행
https://assignment-gold-phi.vercel.app/
