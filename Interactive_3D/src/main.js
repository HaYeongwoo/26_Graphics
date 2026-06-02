import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* =========================================================
   1) 기본 씬 / 카메라 / 렌더러
   ========================================================= */
const app = document.getElementById('app');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060d);
scene.fog = new THREE.FogExp2(0x05060d, 0.025);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
camera.position.set(4.5, 4, 7);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;                       // 그림자 켜기
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;      // 시네마틱 톤매핑
renderer.toneMappingExposure = 1.05;
app.appendChild(renderer.domElement);

/* 환경맵(반사) — 외부 HDR 없이 RoomEnvironment로 생성 */
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

/* =========================================================
   2) 조명 (필수: Light 적용)
   ========================================================= */
scene.add(new THREE.AmbientLight(0x4a5a88, 0.7));        // 전체 환경광

const key = new THREE.DirectionalLight(0xffffff, 2.2);   // 주광 + 그림자
key.position.set(5, 9, 6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 1; key.shadow.camera.far = 40;
key.shadow.camera.left = -10; key.shadow.camera.right = 10;
key.shadow.camera.top = 10; key.shadow.camera.bottom = -10;
key.shadow.bias = -0.0004;
scene.add(key);

const rimCyan = new THREE.PointLight(0x36f1ff, 60, 30);  // 시안 림라이트
rimCyan.position.set(-6, 3, -4);
scene.add(rimCyan);

const rimPink = new THREE.PointLight(0xff5d8f, 45, 30);  // 핑크 림라이트
rimPink.position.set(6, 2, -5);
scene.add(rimPink);

/* =========================================================
   3) 바닥 + 네온 그리드 (그림자 받기)
   ========================================================= */
const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a1024, roughness: 0.85, metalness: 0.2 });
const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 64), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(28, 28, 0x36f1ff, 0x123047);
grid.material.transparent = true; grid.material.opacity = 0.35;
grid.position.y = 0.01;
scene.add(grid);

const haloMat = new THREE.MeshBasicMaterial({ color: 0x36f1ff, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
const halo = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.35, 64), haloMat);
halo.rotation.x = -Math.PI / 2; halo.position.y = 0.02;
scene.add(halo);

/* =========================================================
   4) 별 입자 배경 (창의성 요소)
   ========================================================= */
const starGeo = new THREE.BufferGeometry();
const starN = 900, sp = new Float32Array(starN * 3);
for (let i = 0; i < starN; i++) {
  const r = 25 + Math.random() * 40, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
  sp[i * 3] = r * Math.sin(p) * Math.cos(t);
  sp[i * 3 + 1] = Math.abs(r * Math.cos(p)) * 0.6 + 2;
  sp[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
}
starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x9fdcff, size: 0.18, transparent: true, opacity: 0.8 }));
scene.add(stars);

/* =========================================================
   5) 카메라 컨트롤 (마우스 드래그 / 줌)
   ========================================================= */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 3.5;
controls.maxDistance = 16;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.target.set(0, 1.4, 0);

/* =========================================================
   6) GLB 모델 로드 (필수: GLTF/GLB 모델 1개 이상)
   ========================================================= */
const loaderEl = document.getElementById('loader');
const ldbar = document.getElementById('ldbar');
const ldtxt = document.getElementById('ldtxt');

let nova = null;                         // 로봇 루트 그룹
const robot = new THREE.Group();         // 이동/점프를 적용할 래퍼
scene.add(robot);
const emissiveParts = [];                // 발광/색변경 대상 메쉬
let panelMat = null;                     // 가슴 패널 재질(색 변경용)

// public/ 자산은 import.meta.env.BASE_URL 기준으로 참조 (dev/build 모두 호환)
const MODEL_URL = `${import.meta.env.BASE_URL}models/nova.glb`;

const gltfLoader = new GLTFLoader();
gltfLoader.load(
  MODEL_URL,
  (gltf) => {
    nova = gltf.scene;
    nova.scale.set(1.1, 1.1, 1.1);
    nova.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true;
        const n = o.name.toLowerCase();
        if (n.includes('eye') || n.includes('antenna_ball')) {   // 눈/안테나 볼 발광
          o.material = o.material.clone();
          o.material.emissive = new THREE.Color(0x36f1ff);
          o.material.emissiveIntensity = 1.4;
          emissiveParts.push(o);
        }
        if (n.includes('panel')) {                                // 가슴 패널 = 색 변경 타깃
          o.material = o.material.clone();
          o.material.emissive = new THREE.Color(0x27e0c0);
          o.material.emissiveIntensity = 0.6;
          panelMat = o.material;
        }
      }
    });
    robot.add(nova);
    finishLoad();
  },
  (e) => { if (e.total) { const p = Math.round(e.loaded / e.total * 100); ldbar.style.width = p + '%'; ldtxt.textContent = 'LOADING MODEL ' + p + '%'; } },
  (err) => { ldtxt.textContent = 'LOAD ERROR — public/models/nova.glb 확인'; console.error(err); }
);

function finishLoad() {
  ldbar.style.width = '100%'; ldtxt.textContent = 'READY';
  setTimeout(() => loaderEl.classList.add('hide'), 450);
}

/* =========================================================
   7) 인터랙션 — 마우스 클릭(레이캐스트) + 키보드
   ========================================================= */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const bubble = document.getElementById('bubble');
const stateTxt = document.getElementById('statetxt');

const reactions = ['안녕! 👋', '만나서 반가워', '시스템 정상 ✓', '클릭 고마워!', '오늘도 좋은 하루 🚀', '삐릭—작동 중'];

let sayTimer = null;
function say(text) {
  bubble.textContent = text;
  bubble.classList.add('show');
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => bubble.classList.remove('show'), 1600);
}
function bubbleFollow() {
  if (!nova || !bubble.classList.contains('show')) return;
  const p = new THREE.Vector3(0, 3.4, 0).add(robot.position).project(camera);
  bubble.style.left = (p.x * 0.5 + 0.5) * innerWidth + 'px';
  bubble.style.top = (-p.y * 0.5 + 0.5) * innerHeight + 'px';
}

function onClick(e) {
  if (!nova) return;
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(robot, true);
  if (hit.length) {
    triggerJump();
    flash();
    say(reactions[Math.floor(Math.random() * reactions.length)]);
  }
}
renderer.domElement.addEventListener('click', onClick);

function flash() {
  emissiveParts.forEach(m => { m.material.emissiveIntensity = 4; });
  setTimeout(() => emissiveParts.forEach(m => { m.material.emissiveIntensity = 1.4; }), 220);
}

const keys = {};
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') { e.preventDefault(); triggerJump(); }
  if (e.code === 'KeyR') doReset();
});
addEventListener('keyup', e => keys[e.code] = false);

let jumpV = 0, isJumping = false, danceT = -1, spinBoost = 0;
function triggerJump() {
  if (isJumping) return;
  isJumping = true; jumpV = 7.5; spinBoost = Math.PI * 2;
  setState('JUMP!');
}
function toggleDance() {
  danceT = (danceT < 0) ? 0 : -1;
  setState(danceT >= 0 ? 'DANCE MODE' : 'SYSTEM ONLINE');
  if (danceT >= 0) say('춤추자! 🎵');
}
function doReset() {
  robot.position.set(0, 0, 0); robot.rotation.set(0, 0, 0);
  if (nova) nova.rotation.set(0, 0, 0);
  danceT = -1; isJumping = false; jumpV = 0;
  setColor('#27e0c0');
  setState('SYSTEM ONLINE'); say('리셋 ↺');
}
function setColor(hex) {
  if (!panelMat) return;
  panelMat.color.set(hex);
  panelMat.emissive.set(hex);
  emissiveParts.forEach(m => m.material.emissive.set(hex));
  rimCyan.color.set(hex);
}
function setState(t) { stateTxt.textContent = t; }

document.getElementById('dock').addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  const sw = e.target.closest('[data-color]');
  if (sw) setColor(sw.dataset.color);
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'dance') toggleDance();
  if (a === 'jump') triggerJump();
  if (a === 'reset') doReset();
  if (a === 'shot') screenshot();
});

function screenshot() {
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url; a.download = 'nova_capture_' + Date.now() + '.png'; a.click();
  say('캡처 저장됨 📸');
}

/* =========================================================
   8) 애니메이션 루프 (필수: 애니메이션 구현)
   ========================================================= */
const clock = new THREE.Clock();
const MOVE = 4.2;   // 이동 속도
const BOUND = 11;   // 이동 범위

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (nova) {
    /* (a) 키보드 이동 — 카메라 방향 기준 */
    const dir = new THREE.Vector3();
    if (keys['KeyW'] || keys['ArrowUp']) dir.z -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) dir.z += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) dir.x -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) dir.x += 1;
    if (dir.lengthSq() > 0) {
      dir.normalize();
      const cam = new THREE.Vector3(); camera.getWorldDirection(cam); cam.y = 0; cam.normalize();
      const right = new THREE.Vector3().crossVectors(cam, new THREE.Vector3(0, 1, 0));
      const move = new THREE.Vector3().addScaledVector(cam, -dir.z).addScaledVector(right, dir.x).normalize();
      robot.position.addScaledVector(move, MOVE * dt);
      robot.position.x = THREE.MathUtils.clamp(robot.position.x, -BOUND, BOUND);
      robot.position.z = THREE.MathUtils.clamp(robot.position.z, -BOUND, BOUND);
      const targetAngle = Math.atan2(move.x, move.z);
      nova.rotation.y = THREE.MathUtils.damp(nova.rotation.y, targetAngle, 8, dt);
      setState('MOVING');
    } else if (stateTxt.textContent === 'MOVING') { setState('SYSTEM ONLINE'); }

    /* (b) 점프 물리 */
    if (isJumping) {
      robot.position.y += jumpV * dt;
      jumpV -= 22 * dt;
      nova.rotation.y += spinBoost * dt * 1.2; spinBoost *= 0.92;
      if (robot.position.y <= 0) { robot.position.y = 0; isJumping = false; jumpV = 0; }
    }

    /* (c) 평상시 둥실 떠다니기 + 살짝 기울임 */
    const floatY = (isJumping ? 0 : Math.sin(t * 2) * 0.08);
    nova.position.y = floatY;
    nova.rotation.z = Math.sin(t * 1.3) * 0.03;

    /* (d) 댄스 모드 */
    if (danceT >= 0) {
      danceT += dt;
      nova.rotation.y += dt * 3;
      robot.position.y = Math.abs(Math.sin(danceT * 6)) * 0.4;
      nova.rotation.z = Math.sin(danceT * 8) * 0.25;
    }

    /* (e) 눈/안테나 맥동 발광 */
    const pulse = 1.2 + Math.sin(t * 4) * 0.5;
    emissiveParts.forEach(m => { if (!isJumping) m.material.emissiveIntensity = pulse; });
  }

  /* 데코 애니메이션 */
  halo.rotation.z += dt * 0.4;
  halo.material.opacity = 0.18 + Math.sin(t * 2) * 0.1;
  stars.rotation.y += dt * 0.01;
  rimPink.position.x = Math.sin(t * 0.5) * 6;

  controls.update();
  bubbleFollow();
  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
