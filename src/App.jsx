import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useEffect, useState } from 'react'
import { Environment, useGLTF, MeshTransmissionMaterial } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

const colorA = new THREE.Color('#00CC9B')
const colorB = new THREE.Color('#e600ff')
const lerpedColor = new THREE.Color()

function TransmissionMesh({ geometry, position, rotation, scale, speedX, speedY, speedZ, offset }) {
  const ref = useRef()
  const matRef = useRef()

  useFrame(({ clock }) => {
    if (!ref.current) return

    const t = clock.getElapsedTime()

    ref.current.rotation.x += speedX * 0.01
    ref.current.rotation.y += speedY * 0.01
    ref.current.rotation.z += speedZ * 0.01

    const colorT = (Math.sin(t * 0.5) + 1) / 2
    lerpedColor.lerpColors(colorA, colorB, colorT)

    if (matRef.current) {
      matRef.current.color = lerpedColor.clone()
      matRef.current.attenuationColor = lerpedColor.clone()
    }
  })

  return (
    <mesh
      ref={ref}
      geometry={geometry}
      position={[position.x, position.y, position.z]}
      rotation={[rotation.x, rotation.y, rotation.z]}
      scale={[scale.x, scale.y, scale.z]}
    >
      <MeshTransmissionMaterial
        ref={matRef}
        transmission={1}
        thickness={0.5}
        roughness={0.05}
        ior={1.5}
        color="#00CC9B"
        attenuationColor="#88ccff"
        attenuationDistance={0.5}
        chromaticAberration={0.05}
        backside={true}
        samples={10}
        resolution={512}
        envMapIntensity={1.5}
      />
    </mesh>
  )
}

function GlassModel() {
  const { scene } = useGLTF('/A_COIN_MULTI.glb')
  const groupRef = useRef()
  const [meshes, setMeshes] = useState([])

  useEffect(() => {
    const extracted = []
    scene.traverse((child) => {
      if (child.isMesh) {
        extracted.push({
          uuid: child.uuid,
          geometry: child.geometry,
          position: child.position.clone(),
          rotation: child.rotation.clone(),
          scale: child.scale.clone(),
          speedX: (Math.random() - 0.5) * 0.5,
          speedY: (Math.random() - 0.5) * 0.5,
          speedZ: (Math.random() - 0.5) * 0.5,
          offset: Math.random() * Math.PI * 2,
        })
      }
    })
    setMeshes(extracted)
  }, [scene])

  useFrame(({ mouse }) => {
    if (!groupRef.current) return

    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y, mouse.x * 0.8, 0.05
    )
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x, mouse.y * 0.5, 0.05
    )
  })

  return (
    <group
      ref={groupRef}
      rotation={[0, Math.PI * 0.5, Math.PI * 0.20]}
    >
      {meshes.map((m) => (
        <TransmissionMesh
          key={m.uuid}
          geometry={m.geometry}
          position={m.position}
          rotation={m.rotation}
          scale={m.scale}
          speedX={m.speedX}
          speedY={m.speedY}
          speedZ={m.speedZ}
          offset={m.offset}
        />
      ))}
    </group>
  )
}

export default function App() {
  return (
    <Canvas
      style={{ width: '100vw', height: '100vh' }}
      gl={{
        antialias: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        alpha: true,
      }}
      dpr={[1, 2]}
      camera={{ position: [0, 0, 5], fov: 35 }}
    >
      <Environment
        files="/hdri/GSG_HC005_A041_HDRISTUDIOvol2041.hdr"
        background
        backgroundRotation={[0, Math.PI / 2.3, 0]}
        intensity={0.1}
        blur={0.1}
      />

      <pointLight position={[5, 5, 5]} intensity={5} color="#e600ff" />
      <pointLight position={[-5, 3, -5]} intensity={2} color="#00ff51" />
      <pointLight position={[0, -5, -5]} intensity={1} color="#0056ec" />

      <OrbitControls />
      <GlassModel />

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.7}
          luminanceThreshold={0.5}
          luminanceSmoothing={0.9}
          blendFunction={BlendFunction.ADD}
        />
        <Vignette
          offset={0.1}
          darkness={0.6}
          blendFunction={BlendFunction.NORMAL}
        />
      </EffectComposer>

    </Canvas>
  )
}