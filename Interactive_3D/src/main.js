import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';


const app = document.getElementById('app');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060d);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
camera.position.set(4.5, 4, 7);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;                  // [그림자] 그림자 기능 켜기
renderer.shadowMap.type = THREE.PCFSoftShadowMap;   // 부드러운 그림자
app.appendChild(renderer.domElement);


const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;


scene.add(new THREE.AmbientLight(0x4a5a88, 0.8));    // 전체 환경광

const dirLight = new THREE.DirectionalLight(0xffffff, 2.4);  // 주광
dirLight.position.set(5, 9, 6);
dirLight.castShadow = true;                          // [그림자] 이 빛이 그림자를 만든다
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 40;
dirLight.shadow.camera.left = -10;
dirLight.shadow.camera.right = 10;
dirLight.shadow.camera.top = 10;
dirLight.shadow.camera.bottom = -10;
dirLight.shadow.bias = -0.0004;
scene.add(dirLight);

const pointCyan = new THREE.PointLight(0x36f1ff, 50, 30);   // 시안 보조광
pointCyan.position.set(-6, 3, -4);
scene.add(pointCyan);

const pointPink = new THREE.PointLight(0xff5d8f, 40, 30);   // 핑크 보조광
pointPink.position.set(6, 2, -5);
scene.add(pointPink);


const floor = new THREE.Mesh(
  new THREE.CircleGeometry(14, 64),
  new THREE.MeshStandardMaterial({ color: 0x0a1024, roughness: 0.85, metalness: 0.2 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;                          // [그림자] 바닥이 그림자를 받음
scene.add(floor);

const grid = new THREE.GridHelper(28, 28, 0x36f1ff, 0x123047);
grid.material.transparent = true;
grid.material.opacity = 0.35;
grid.position.y = 0.01;
scene.add(grid);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 3.5;
controls.maxDistance = 16;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.target.set(0, 1.4, 0);

const loaderEl = document.getElementById('loader');
const ldbar = document.getElementById('ldbar');
const ldtxt = document.getElementById('ldtxt');

let nova = null;                       // 모델 본체
const robot = new THREE.Group();       // 이동/점프를 적용할 그룹
scene.add(robot);
const emissiveParts = [];              // 눈/안테나 등 발광 메쉬
let panelMat = null;                   // 가슴 패널(색 변경용)

const MODEL_URL = `${import.meta.env.BASE_URL}models/nova.glb`;

const gltfLoader = new GLTFLoader();
gltfLoader.load(
  MODEL_URL,
  (gltf) => {
    nova = gltf.scene;
    nova.scale.set(1.1, 1.1, 1.1);
    nova.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;             // [그림자] 모델이 그림자를 만든다
      o.receiveShadow = true;
      const n = o.name.toLowerCase();
      if (n.includes('eye') || n.includes('antenna_ball')) {  // 눈/안테나 발광
        o.material = o.material.clone();
        o.material.emissive = new THREE.Color(0x36f1ff);
        o.material.emissiveIntensity = 1.4;
        emissiveParts.push(o);
      }
      if (n.includes('panel')) {       // 가슴 패널 = 색 변경 대상
        o.material = o.material.clone();
        o.material.emissive = new THREE.Color(0x27e0c0);
        o.material.emissiveIntensity = 0.6;
        panelMat = o.material;
      }
    });
    robot.add(nova);
    finishLoad();
  },
  (e) => { if (e.total) { const p = Math.round(e.loaded / e.total * 100); ldbar.style.width = p + '%'; ldtxt.textContent = 'LOADING MODEL ' + p + '%'; } },
  (err) => { ldtxt.textContent = 'LOAD ERROR — public/models/nova.glb 확인'; console.error(err); }
);

function finishLoad() {
  ldbar.style.width = '100%';
  ldtxt.textContent = 'READY';
  setTimeout(() => loaderEl.classList.add('hide'), 450);
}

const raycaster = new THREE.Raycaster();   // 클릭 위치 판정
const pointer = new THREE.Vector2();

// 클릭: 로봇을 맞히면 점프 + 발광 (문구 출력 없음)
function onClick(e) {
  if (!nova) return;
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(robot, true);
  if (hit.length) {
    triggerJump();
    flash();
  }
}
renderer.domElement.addEventListener('click', onClick);

// 눈/안테나 순간 발광
function flash() {
  emissiveParts.forEach((m) => { m.material.emissiveIntensity = 4; });
  setTimeout(() => emissiveParts.forEach((m) => { m.material.emissiveIntensity = 1.4; }), 220);
}

// 키보드 입력 상태 저장
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space') { e.preventDefault(); triggerJump(); }
  if (e.code === 'KeyR') doReset();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });

// 점프 / 댄스 / 리셋 상태
let jumpV = 0, isJumping = false, danceOn = false, danceT = 0, spinBoost = 0;

function triggerJump() {
  if (isJumping) return;
  isJumping = true;
  jumpV = 7.5;
  spinBoost = Math.PI * 2;
}
function toggleDance() { danceOn = !danceOn; danceT = 0; }
function doReset() {
  robot.position.set(0, 0, 0);
  robot.rotation.set(0, 0, 0);
  if (nova) nova.rotation.set(0, 0, 0);
  danceOn = false; isJumping = false; jumpV = 0;
  setColor('#27e0c0');
}
function setColor(hex) {
  if (!panelMat) return;
  panelMat.color.set(hex);
  panelMat.emissive.set(hex);
  emissiveParts.forEach((m) => m.material.emissive.set(hex));
  pointCyan.color.set(hex);
}

// 하단 버튼 / 색상 선택
document.getElementById('dock').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  const sw = e.target.closest('[data-color]');
  if (sw) setColor(sw.dataset.color);
  if (!b) return;
  if (b.dataset.act === 'dance') toggleDance();
  if (b.dataset.act === 'jump') triggerJump();
  if (b.dataset.act === 'reset') doReset();
  if (b.dataset.act === 'shot') screenshot();
});

// 화면 캡처 (제출용 결과 이미지)
function screenshot() {
  renderer.render(scene, camera);
  const link = document.createElement('a');
  link.href = renderer.domElement.toDataURL('image/png');
  link.download = 'nova_' + Date.now() + '.png';
  link.click();
}

const clock = new THREE.Clock();
const MOVE_SPEED = 4.2;
const BOUND = 11;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (nova) {
    // (a) 키보드 이동 (카메라가 보는 방향 기준)
    const dir = new THREE.Vector3();
    if (keys['KeyW'] || keys['ArrowUp']) dir.z -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) dir.z += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) dir.x -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) dir.x += 1;
    if (dir.lengthSq() > 0) {
      dir.normalize();
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      camDir.y = 0; camDir.normalize();
      const right = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0));
      const move = new THREE.Vector3()
        .addScaledVector(camDir, -dir.z)
        .addScaledVector(right, dir.x)
        .normalize();
      robot.position.addScaledVector(move, MOVE_SPEED * dt);
      robot.position.x = THREE.MathUtils.clamp(robot.position.x, -BOUND, BOUND);
      robot.position.z = THREE.MathUtils.clamp(robot.position.z, -BOUND, BOUND);
      const targetAngle = Math.atan2(move.x, move.z);
      nova.rotation.y = THREE.MathUtils.damp(nova.rotation.y, targetAngle, 8, dt);
    }

    // (b) 점프 (중력 적용)
    if (isJumping) {
      robot.position.y += jumpV * dt;
      jumpV -= 22 * dt;
      nova.rotation.y += spinBoost * dt * 1.2;
      spinBoost *= 0.92;
      if (robot.position.y <= 0) { robot.position.y = 0; isJumping = false; jumpV = 0; }
    }

    // (c) 평상시 둥실 떠다님
    nova.position.y = isJumping ? 0 : Math.sin(t * 2) * 0.08;
    nova.rotation.z = Math.sin(t * 1.3) * 0.03;

    // (d) 댄스 모드
    if (danceOn) {
      danceT += dt;
      nova.rotation.y += dt * 3;
      robot.position.y = Math.abs(Math.sin(danceT * 6)) * 0.4;
      nova.rotation.z = Math.sin(danceT * 8) * 0.25;
    }

    // (e) 눈/안테나 맥동 발광
    const pulse = 1.2 + Math.sin(t * 4) * 0.5;
    emissiveParts.forEach((m) => { if (!isJumping) m.material.emissiveIntensity = pulse; });
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
