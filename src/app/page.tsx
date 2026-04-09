"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useRef } from "react";
import { useDebugUI } from "./hooks/useDebugUI";
import { Leva } from "leva";
import { Lights } from "./components/Lights";
import { Player } from "./components/Player";
import { TestFloor } from "./components/TestFloor";

export default function Home() {
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  useDebugUI();

  return (
    <div className="w-full h-screen">
      <div className="z-50 absolute  overflow-auto top-1 right-1 rounded-md max-w-[370px] ">
        <Leva fill />
      </div>

      <Canvas
        shadows
        dpr={[1.0, 2.0]}
        camera={{ position: [1000, 1000, 1000], fov: 45, near: 0.1, far: 5000 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 0, 0);
          cameraRef.current = camera as THREE.PerspectiveCamera;
        }}
      >
        <Lights />
        <TestFloor />
        <Player />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          makeDefault
        />
      </Canvas>
    </div>
  );
}
