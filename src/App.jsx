import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useEffect, useState } from 'react'
import { Environment, useGLTF, MeshTransmissionMaterial } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, DepthOfField } from '@react-three/postprocessing'
import { mergeVertices } from 'three-stdlib'
import { useTexture } from '@react-three/drei'
import { BlendFunction } from 'postprocessing'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

const colorA = new THREE.Color('#00CC9B')
const colorB = new THREE.Color('#e600ff')
const lerpedColor = new THREE.Color()

function TransmissionMesh({ geometry, position, rotation, scale, speedX, speedY, speedZ, offset }) {
  const ref = useRef()
  const matRef = useRef()
  const normalMap = useTexture('/normal-noise.png')  // any tileable normal map

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

      // normalMap={normalMap}
      // normalScale={[0.1, 0.1]}  // subtle distortion

  transmission={1}
  thickness={2}
  ior={1.8}
  roughness={0.1}
  metalness={0}
  color="#00CC9B"
  attenuationColor="#00CC9B"
  attenuationDistance={1.5}
  samples={32}
  resolution={2048}
  backside={true} // drei handles back face internally
  backsideThickness={1}
  
  chromaticAberration={0.08}
  anisotropicBlur={0.3}
  envMapIntensity={0.8}
  // --- add these ---
  depthWrite={false}
  transparent={true}
  opacity={0.9}
  // remove side={THREE.DoubleSide} or set explicitly to front only
  side={THREE.FrontSide}
      />
    </mesh>
  )
}

function GlassModel() {
  const { scene } = useGLTF('/A_COIN_MULTI_v3.glb')
  const groupRef = useRef()
  const [meshes, setMeshes] = useState([])

  useEffect(() => {
    const extracted = []
        scene.traverse((child) => {
      if (child.isMesh) {
        
        child.geometry = mergeVertices(child.geometry)
        child.geometry.computeVertexNormals()
        
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
        
        if (child.isMesh && child.material.map) {
        child.material.map.anisotropy = 16
        child.material.needsUpdate = true
         }
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
      camera={{ position: [0.5, 1, 5], fov: 35 }}
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

      {/* <OrbitControls /> */}
      <GlassModel />

      <EffectComposer multisampling={0}>
        <DepthOfField
          focusDistance={0.01}    // distance from camera to focus point, 0-1 normalized
          focalLength={0.05}      // depth of the in-focus zone, lower = shallower
          bokehScale={10}          // size of the blur/bokeh, higher = more blur
          height={700}            // resolution of the effect
        />
    
        <Bloom
          intensity={0.1}
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