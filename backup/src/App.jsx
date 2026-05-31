import { useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

function RobotCleaner({ scale = 1 }) {
  const robotRef = useRef()

  const keys = useRef({
    ArrowUp: false,
    ArrowLeft: false,
    ArrowRight: false,
  })

  useEffect(() => {
    const down = (e) => {
      if (e.key in keys.current) {
        keys.current[e.key] = true
      }
    }

    const up = (e) => {
      if (e.key in keys.current) {
        keys.current[e.key] = false
      }
    }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)

    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useFrame(() => {
    if (!robotRef.current) return

    if (keys.current.ArrowLeft) {
      robotRef.current.rotation.y += 0.03
    } else if (keys.current.ArrowRight) {
      robotRef.current.rotation.y -= 0.03
    } else if (keys.current.ArrowUp) {
      robotRef.current.position.x -=
        Math.sin(robotRef.current.rotation.y) * 0.05
      robotRef.current.position.z -=
        Math.cos(robotRef.current.rotation.y) * 0.05
    }
  })

  return (
    <group ref={robotRef} scale={scale}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[2, 2, 0.8, 64]} />
        <meshStandardMaterial color="black" />
      </mesh>

      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[2.2, 2.2, 0.6, 64]} />
        <meshStandardMaterial color="white" />
      </mesh>

      <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.8, 0.15, 16, 100]} />
        <meshStandardMaterial color="blue" />
      </mesh>

      <mesh position={[0.3, 0.4, -1.2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.4, 64]} />
        <meshStandardMaterial color="blue" />
      </mesh>

      <mesh position={[-0.3, 0.4, -1.2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.4, 64]} />
        <meshStandardMaterial color="red" />
      </mesh>

      <mesh position={[1, -0.05, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.5, 0.5, 0.2, 64]} />
        <meshStandardMaterial color="gray" />
      </mesh>

      <mesh position={[-1, -0.05, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.5, 0.5, 0.2, 64]} />
        <meshStandardMaterial color="gray" />
      </mesh>
    </group>
  )
}

export default function App() {
  return (
    <Canvas
      style={{
        width: '100vw',
        height: '100vh',
      }}>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} />
      <RobotCleaner scale={1} />
      <OrbitControls />
    </Canvas>
  )
}
