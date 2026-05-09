"use client";
import { useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { Suspense, useEffect, useRef, useState } from "react";
import { Leva } from "leva";
import { fog, color, densityFogFactor, float } from "three/tsl";
import { Lights } from "./components/Lights";
import { useDebugUI } from "./hooks/useDebugUI";
import WebGPUCanvas from "./components/WebGPUCanvas";
import { PostProcessing } from "./components/PostProcessing";
import { WebGPUFloor } from "./components/WebGPUFloor";
import { ChunkCacti } from "./components/ChunkCacti";
import { Player } from "./components/Player";
import { Clouds } from "./components/Clouds";
import { Train } from "./components/Train";
import { RailPieces } from "./components/RailPieces";
import { useManagedSound } from "./hooks/useManagedSound";

function SceneFog() {
  const { scene } = useThree();

  useEffect(() => {
    const sceneFog = fog(color('#FFD300'), densityFogFactor(float(0.001)));
    scene.fogNode = sceneFog;
    return () => {
      scene.fogNode = null;
    };
  }, [scene]);

  return null;
}

function Scene() {
  return (
    <group scale={0.3}>
      <SceneFog />
      <Lights />
      <WebGPUFloor />
      <ChunkCacti />
    </group>
  );
}

function SceneReadyReporter({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

type AudioControls = ReturnType<typeof useDebugUI>["audio"];

function SceneAudio({
  controls,
  active,
}: {
  controls: AudioControls;
  active: boolean;
}) {
  useManagedSound({
    src: "/train_sound.mp3",
    autoplay: active,
    enabled: active && controls.enabled,
    loop: true,
    volume: controls.volume,
    fadeInMs: controls.fadeInMs,
    playbackRate: controls.playbackRate,
  });

  return null;
}

export default function Home() {
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const { train, trainLights, trainEmissive, trainSun, clouds, rails, audio } = useDebugUI();

  const [sceneReady, setSceneReady] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);

  useEffect(() => {
    if (!sceneReady) return;
    const timeout = setTimeout(() => setOverlayVisible(false), 2000);
    return () => clearTimeout(timeout);
  }, [sceneReady]);

  return (
    <div className="w-full h-screen">
      <div className="z-50 absolute  overflow-auto top-1 right-1 rounded-md max-w-[370px] ">
        <Leva hidden />
      </div>

      <WebGPUCanvas
        dpr={[1.0, 2.0]}
        camera={{ position: [20, 20, 20], fov: 45, near: 0.1, far: 1500 }}
        shadows
        onCreated={({ camera }) => {
          camera.lookAt(0, 0, 0);
          cameraRef.current = camera as THREE.PerspectiveCamera;
        }}
      >

        <Suspense fallback={null}>
          <Environment
            files="/textures/skybox.hdr"
            background
          />

          <PostProcessing normalEdgeStrength={3} radius={1} depthEdgeStrength={3} strength={0.3} threshold={0.8} />
          <Clouds
            count={clouds.cloudCount}
            spread={clouds.spread}
            height={clouds.height}
            speed={clouds.speed}
          />
          <SceneAudio controls={audio} active={sceneReady} />
          <Scene />
          <Player />
          <RailPieces spacing={rails.spacing} height={rails.height} scale={rails.scale} />
          <Train
            yOffset={train.yOffset}
            trainLights={trainLights}
            emissive={trainEmissive}
            sun={trainSun}
          />
          <SceneReadyReporter onReady={() => setSceneReady(true)} />
        </Suspense>
      </WebGPUCanvas>

      {overlayVisible && (
        <div
          className="absolute inset-0 bg-black pointer-events-none z-40"
          style={{
            transition: sceneReady ? "opacity 2s ease-in-out" : "none",
            opacity: sceneReady ? 0 : 1,
          }}
        />
      )}
    </div>
  );
}
