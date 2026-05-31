import { useMemo, useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";

const ROOM_BOUNDS = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
const ROBOT_RADIUS = 0.7;
const ROBOT_SPEED = 0.05;
const ROBOT_SCALE = 0.28;
const CAMERA_MODES = {
  ROOM: "room",
  ROBOT: "robot",
};

const FURNITURE_COLLIDERS = [
  { x: 2, z: 2, w: 2, h: 1 },
  { x: 2, z: 0.8, w: 0.7, h: 0.7 },
  { x: -3, z: 3, w: 0.6, h: 0.6 },
  { x: -2, z: -2, w: 2.5, h: 4 },
  { x: -2, z: -3.2, w: 0.8, h: 0.5 },
];

function createStripeTexture(primary, secondary, size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  context.fillStyle = primary;
  context.fillRect(0, 0, size, size);
  context.strokeStyle = secondary;
  context.lineWidth = 4;

  for (let i = -size; i < size * 2; i += 32) {
    context.beginPath();
    context.moveTo(i, 0);
    context.lineTo(i + size, size);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

function createWallpaperTexture(primary, secondary, size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  context.fillStyle = primary;
  context.fillRect(0, 0, size, size);

  context.strokeStyle = secondary;
  context.lineWidth = 2;

  for (let i = 24; i < size; i += 48) {
    context.beginPath();
    context.arc(i, 32, 6, 0, Math.PI * 2);
    context.arc(i + 18, 142, 5, 0, Math.PI * 2);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

function createWoodFloorTexture(size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  context.fillStyle = "#b9824f";
  context.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 42) {
    context.fillStyle = y % 84 === 0 ? "#c18c58" : "#ad7848";
    context.fillRect(0, y, size, 40);
    context.strokeStyle = "#7b4f2f";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(size, y);
    context.stroke();

    context.strokeStyle = "rgba(92, 55, 31, 0.35)";
    context.lineWidth = 1;
    for (let x = (y % 84 === 0 ? 0 : 58); x < size; x += 92) {
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x, y + 40);
      context.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

function BloomEffect() {
  const { gl, scene, camera, size } = useThree();
  const composer = useMemo(() => {
    const nextComposer = new EffectComposer(gl);
    nextComposer.addPass(new RenderPass(scene, camera));
    nextComposer.addPass(
      new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 0.45, 0.35, 0.85),
    );

    return nextComposer;
  }, [camera, gl, scene, size.height, size.width]);

  useEffect(() => {
    composer.setSize(size.width, size.height);
  }, [composer, size.height, size.width]);

  useEffect(() => {
    return () => composer.dispose();
  }, [composer]);

  useFrame(() => {
    composer.render();
  }, 1);

  return null;
}

function RobotCameraController({ robotRef, cameraMode }) {
  const cameraRef = useRef();
  const robotPosition = useRef(new THREE.Vector3());
  const cameraPosition = useRef(new THREE.Vector3());
  const cameraTarget = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const modeRef = useRef(cameraMode);

  useEffect(() => {
    modeRef.current = cameraMode;
  }, [cameraMode]);

  useFrame(() => {
    if (
      modeRef.current !== CAMERA_MODES.ROBOT ||
      !robotRef.current ||
      !cameraRef.current
    ) {
      return;
    }

    robotRef.current.getWorldPosition(robotPosition.current);
    forward.current.set(
      -Math.sin(robotRef.current.rotation.y),
      0,
      -Math.cos(robotRef.current.rotation.y),
    );

    cameraPosition.current
      .copy(robotPosition.current)
      .addScaledVector(forward.current, 0.44);
    cameraPosition.current.y = 0.58;
    cameraTarget.current
      .copy(robotPosition.current)
      .addScaledVector(forward.current, 3.4);
    cameraTarget.current.y = 0.48;

    cameraRef.current.position.copy(cameraPosition.current);
    cameraRef.current.lookAt(cameraTarget.current);
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault={cameraMode === CAMERA_MODES.ROBOT}
      fov={76}
      near={0.05}
      far={100}
    />
  );
}

function DustParticles({ active }) {
  const groupRef = useRef();
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => ({
        angle: (index / 14) * Math.PI * 2,
        radius: 0.18 + (index % 5) * 0.035,
        speed: 3.5 + (index % 4) * 0.6,
        lift: 0.012 + (index % 5) * 0.005,
        size: 0.035 + (index % 3) * 0.01,
      })),
    [],
  );
  const progressRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current || !active) return;

    progressRef.current += delta;
    groupRef.current.children.forEach((particle, index) => {
      const data = particles[index];
      const age = progressRef.current * data.speed;
      const radius = Math.max(0.01, data.radius * (1 - progressRef.current * 1.5));

      particle.position.x = Math.cos(data.angle + age) * radius;
      particle.position.z = Math.sin(data.angle + age) * radius;
      particle.position.y += data.lift;
      particle.material.opacity = Math.max(0, particle.material.opacity - delta * 1.4);
      particle.scale.multiplyScalar(0.992);
    });
  });

  if (!active) return null;

  return (
    <group ref={groupRef}>
      {particles.map((particle, index) => (
        <mesh
          key={index}
          position={[
            Math.cos(particle.angle) * particle.radius,
            0.04,
            Math.sin(particle.angle) * particle.radius,
          ]}>
          <sphereGeometry args={[particle.size, 8, 8]} />
          <meshStandardMaterial
            color="#f4d8a6"
            emissive="#f59f00"
            emissiveIntensity={1.8}
            transparent
            opacity={0.95}
          />
        </mesh>
      ))}
    </group>
  );
}

function SuctionVortex({ active }) {
  const groupRef = useRef();
  const ringRefs = useRef([]);
  const progressRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current || !active) return;

    progressRef.current += delta;
    groupRef.current.rotation.y += delta * 7;

    ringRefs.current.forEach((ring, index) => {
      if (!ring) return;

      const pulse = Math.sin(progressRef.current * 10 + index) * 0.08;
      const scale = Math.max(0.12, 1 - progressRef.current * 1.2 - index * 0.12 + pulse);
      ring.scale.set(scale, scale, scale);
      ring.position.y = 0.05 + index * 0.08 + progressRef.current * 0.08;
      ring.material.opacity = Math.max(0, 0.75 - progressRef.current * 0.9 - index * 0.08);
    });
  });

  if (!active) return null;

  return (
    <group ref={groupRef}>
      {[0, 1, 2].map((ring) => (
        <mesh
          key={ring}
          ref={(mesh) => {
            ringRefs.current[ring] = mesh;
          }}
          position={[0, 0.05 + ring * 0.08, 0]}
          rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.24 + ring * 0.08, 0.012, 8, 48]} />
          <meshStandardMaterial
            color="#74c0fc"
            emissive="#228be6"
            emissiveIntensity={1.7}
            transparent
            opacity={0.72}
          />
        </mesh>
      ))}
    </group>
  );
}

function Dust({ dust, onFadeComplete }) {
  const groupRef = useRef();
  const materialRefs = useRef([]);
  const progressRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current || !dust.removing) return;

    progressRef.current = Math.min(1, progressRef.current + delta * 2.4);
    const scale = Math.max(0.01, 1 - progressRef.current);
    const opacity = Math.max(0, 1 - progressRef.current);

    groupRef.current.scale.setScalar(scale);
    groupRef.current.position.y = dust.position[1] + progressRef.current * 0.16;

    materialRefs.current.forEach((material) => {
      if (material) {
        material.opacity = opacity;
      }
    });

    if (progressRef.current >= 1) {
      onFadeComplete(dust.id);
    }
  });

  return (
    <group ref={groupRef} position={dust.position}>
      <mesh position={[0.08, 0.01, 0.04]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial
          ref={(material) => {
            materialRefs.current[0] = material;
          }}
          color="#555555"
          transparent
        />
      </mesh>
      <mesh position={[-0.06, 0.01, 0.03]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial
          ref={(material) => {
            materialRefs.current[1] = material;
          }}
          color="#666666"
          transparent
        />
      </mesh>
      <mesh position={[0.02, 0.01, -0.06]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial
          ref={(material) => {
            materialRefs.current[2] = material;
          }}
          color="#444444"
          transparent
        />
      </mesh>
      <DustParticles active={dust.removing} />
      <SuctionVortex active={dust.removing} />
    </group>
  );
}

function RobotCleaner({ dustItems, onDustRemove, cameraMode }) {
  const robotRef = useRef();
  const keys = useRef({
    ArrowUp: false,
    ArrowLeft: false,
    ArrowRight: false,
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key in keys.current) {
        event.preventDefault();
        keys.current[event.key] = true;
      }
    };

    const handleKeyUp = (event) => {
      if (event.key in keys.current) {
        event.preventDefault();
        keys.current[event.key] = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const checkWallCollision = (x, z) => {
    return (
      x - ROBOT_RADIUS < ROOM_BOUNDS.minX ||
      x + ROBOT_RADIUS > ROOM_BOUNDS.maxX ||
      z - ROBOT_RADIUS < ROOM_BOUNDS.minZ ||
      z + ROBOT_RADIUS > ROOM_BOUNDS.maxZ
    );
  };

  const checkFurnitureCollision = (x, z) => {
    return FURNITURE_COLLIDERS.some((furniture) => {
      const dx = Math.abs(x - furniture.x);
      const dz = Math.abs(z - furniture.z);
      return (
        dx < furniture.w / 2 + ROBOT_RADIUS &&
        dz < furniture.h / 2 + ROBOT_RADIUS
      );
    });
  };

  useFrame(() => {
    if (!robotRef.current) return;

    const rotation = robotRef.current.rotation.y;
    let dx = 0;
    let dz = 0;

    if (keys.current.ArrowLeft) {
      robotRef.current.rotation.y += 0.03;
    }

    if (keys.current.ArrowRight) {
      robotRef.current.rotation.y -= 0.03;
    }

    if (keys.current.ArrowUp) {
      dx = -Math.sin(rotation) * ROBOT_SPEED;
      dz = -Math.cos(rotation) * ROBOT_SPEED;
    }

    if (dx !== 0 || dz !== 0) {
      const nextX = robotRef.current.position.x + dx;
      const nextZ = robotRef.current.position.z + dz;

      if (!checkWallCollision(nextX, nextZ) && !checkFurnitureCollision(nextX, nextZ)) {
        robotRef.current.position.x = nextX;
        robotRef.current.position.z = nextZ;
      }
    }

    dustItems.forEach((dust) => {
      if (dust.removing) return;

      const distX = robotRef.current.position.x - dust.position[0];
      const distZ = robotRef.current.position.z - dust.position[2];
      const distance = Math.sqrt(distX * distX + distZ * distZ);

      if (distance < 0.6) {
        onDustRemove(dust.id);
      }
    });
  });

  return (
    <>
      <RobotCameraController robotRef={robotRef} cameraMode={cameraMode} />

      <group ref={robotRef} position={[0, 0.23, -3]} scale={ROBOT_SCALE}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[2, 2, 0.8, 64]} />
          <meshStandardMaterial color="#111111" />
        </mesh>

        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[2.2, 2.2, 0.6, 64]} />
          <meshStandardMaterial color="#f2f4f7" />
        </mesh>

        <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.8, 0.15, 16, 100]} />
          <meshStandardMaterial color="#1f6feb" emissive="#1f6feb" emissiveIntensity={0.9} />
        </mesh>

        <mesh position={[0.3, 0.4, -1.2]}>
          <cylinderGeometry args={[0.2, 0.2, 0.4, 64]} />
          <meshStandardMaterial color="#1f6feb" emissive="#1f6feb" emissiveIntensity={1.1} />
        </mesh>

        <mesh position={[-0.3, 0.4, -1.2]}>
          <cylinderGeometry args={[0.2, 0.2, 0.4, 64]} />
          <meshStandardMaterial color="#e5484d" emissive="#e5484d" emissiveIntensity={1.1} />
        </mesh>

        <mesh position={[1, -0.05, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.5, 0.5, 0.2, 64]} />
          <meshStandardMaterial color="#8b949e" />
        </mesh>

        <mesh position={[-1, -0.05, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.5, 0.5, 0.2, 64]} />
          <meshStandardMaterial color="#8b949e" />
        </mesh>
      </group>
    </>
  );
}

function RoomScene({ dustItems, onDustRemove, onDustFadeComplete, cameraMode }) {
  const textures = useMemo(
    () => ({
      floor: createWoodFloorTexture(),
      wall: createWallpaperTexture("#f2eadf", "#d7c8b7"),
      fabric: createStripeTexture("#d8d8d8", "#b8bbc0"),
      wood: createStripeTexture("#8b4513", "#5f2f0d"),
    }),
    [],
  );

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 4.5, 0]} intensity={32} color="#fff1d6" />
      <pointLight position={[3, 3, 3]} intensity={6} color="#ffe3ba" />

      <mesh position={[0, 2.5, -5]}>
        <boxGeometry args={[10, 5, 0.2]} />
        <meshStandardMaterial map={textures.wall} color="#f2eadf" roughness={1} />
      </mesh>

      <mesh position={[5, 2.5, 0]}>
        <boxGeometry args={[0.2, 5, 10]} />
        <meshStandardMaterial map={textures.wall} color="#f2eadf" />
      </mesh>

      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[10, 0.1, 10]} />
        <meshStandardMaterial
          map={textures.floor}
          color="#c79b6b"
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>

      <mesh position={[2, 0.5, 2]}>
        <boxGeometry args={[2, 1, 1]} />
        <meshStandardMaterial map={textures.wood} color="#8b4513" />
      </mesh>

      <mesh position={[2, 0.3, 0.8]}>
        <boxGeometry args={[0.7, 0.6, 0.7]} />
        <meshStandardMaterial color="#444444" />
      </mesh>

      <mesh position={[-3, 0.3, 3]}>
        <cylinderGeometry args={[0.3, 0.3, 0.5, 16]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>

      <mesh position={[-3, 0.9, 3]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color="#2f9e44" />
      </mesh>

      <mesh position={[-2, 0.3, -2]}>
        <boxGeometry args={[2.5, 0.6, 4]} />
        <meshStandardMaterial map={textures.fabric} color="#d6d8df" />
      </mesh>

      <mesh position={[-2, 0.7, -3.2]}>
        <boxGeometry args={[0.8, 0.2, 0.5]} />
        <meshStandardMaterial color="#fff7ed" />
      </mesh>

      <mesh position={[0, 3, -4.9]}>
        <boxGeometry args={[3, 1.5, 0.05]} />
        <meshStandardMaterial
          color="#87ceeb"
          emissive="#5fb3d4"
          emissiveIntensity={0.45}
        />
      </mesh>

      <mesh position={[1.65, 0.005, -0.55]} rotation={[0, 0, 0]}>
        <boxGeometry args={[3.2, 0.035, 2.2]} />
        <meshStandardMaterial color="#8f3f46" roughness={0.9} />
      </mesh>

      <mesh position={[1.65, 0.028, -0.55]} rotation={[0, 0, 0]}>
        <boxGeometry args={[2.72, 0.02, 1.72]} />
        <meshStandardMaterial color="#d9b58c" roughness={0.95} />
      </mesh>

      <mesh position={[-3.7, 1.15, -4.82]}>
        <boxGeometry args={[2.2, 2.3, 0.28]} />
        <meshStandardMaterial map={textures.wood} color="#7a4a29" />
      </mesh>

      {[0.42, 0.92, 1.42, 1.92].map((height) => (
        <mesh key={height} position={[-3.7, height, -4.64]}>
          <boxGeometry args={[2.0, 0.06, 0.18]} />
          <meshStandardMaterial color="#f1d8a7" />
        </mesh>
      ))}

      {Array.from({ length: 36 }, (_, index) => {
        const shelf = Math.floor(index / 9);
        const slot = index % 9;
        const colors = ["#d9480f", "#1971c2", "#2f9e44", "#7048e8", "#f08c00", "#495057"];

        return (
          <mesh
            key={index}
            position={[
              -4.55 + slot * 0.2,
              0.24 + shelf * 0.5,
              -4.52,
            ]}>
            <boxGeometry args={[0.12, 0.28 + (index % 3) * 0.04, 0.18]} />
            <meshStandardMaterial color={colors[index % colors.length]} />
          </mesh>
        );
      })}

      <mesh position={[4.88, 2.55, -1.35]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.2, 0.8, 0.06]} />
        <meshStandardMaterial color="#6f4e37" />
      </mesh>

      <mesh position={[4.84, 2.55, -1.35]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.95, 0.58, 0.04]} />
        <meshStandardMaterial color="#ffd8a8" emissive="#8ce99a" emissiveIntensity={0.15} />
      </mesh>

      {dustItems.map((dust) => (
        <Dust key={dust.id} dust={dust} onFadeComplete={onDustFadeComplete} />
      ))}

      <RobotCleaner
        dustItems={dustItems}
        onDustRemove={onDustRemove}
        cameraMode={cameraMode}
      />
      <OrbitControls target={[0, 1, 0]} enabled={cameraMode === CAMERA_MODES.ROOM} />
      <BloomEffect />
    </>
  );
}

function createDustPositions() {
  const positions = [];

  while (positions.length < 30) {
    const x = Math.random() * 8 - 4;
    const z = Math.random() * 8 - 4;

    const nearDesk = x > 1 && x < 3 && z > 1 && z < 3;
    const nearChair = x > 1.3 && x < 2.7 && z > 0.2 && z < 1.5;
    const nearBed = x > -3.5 && x < -0.5 && z > -4 && z < 0;
    const nearPlant = x > -3.8 && x < -2.2 && z > 2.2 && z < 3.8;

    if (!nearDesk && !nearChair && !nearBed && !nearPlant) {
      positions.push({
        id: `dust-${positions.length}`,
        position: [x, 0.005, z],
        removing: false,
      });
    }
  }

  return positions;
}

export default function App() {
  const initialDustItems = useMemo(() => createDustPositions(), []);
  const [dustItems, setDustItems] = useState(initialDustItems);
  const [cameraMode, setCameraMode] = useState(CAMERA_MODES.ROOM);
  const isClear = dustItems.length === 0;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key.toLowerCase() !== "v" || event.repeat) return;

      event.preventDefault();
      setCameraMode((currentMode) =>
        currentMode === CAMERA_MODES.ROOM ? CAMERA_MODES.ROBOT : CAMERA_MODES.ROOM,
      );
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const removeDust = (idToRemove) => {
    setDustItems((currentItems) =>
      currentItems.map((dust) =>
        dust.id === idToRemove ? { ...dust, removing: true } : dust,
      ),
    );
  };

  const finishDustRemoval = (idToRemove) => {
    setDustItems((currentItems) =>
      currentItems.filter((dust) => dust.id !== idToRemove),
    );
  };

  const restart = () => {
    setDustItems(createDustPositions());
  };

  return (
    <div className="app-shell">
      <Canvas camera={{ position: [7, 5, 7], fov: 60 }}>
        <RoomScene
          dustItems={dustItems}
          onDustRemove={removeDust}
          onDustFadeComplete={finishDustRemoval}
          cameraMode={cameraMode}
        />
      </Canvas>

      <div className="view-mode-badge" aria-live="polite">
        <span>{cameraMode === CAMERA_MODES.ROOM ? "방 전체 시점" : "로봇 시점"}</span>
        <kbd>V</kbd>
      </div>

      {isClear && (
        <div className="clear-overlay" role="status" aria-live="polite">
          <div className="clear-panel">
            <h1>Clear</h1>
            <button type="button" onClick={restart}>
              다시하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
