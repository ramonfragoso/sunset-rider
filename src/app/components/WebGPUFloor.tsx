"use client";
import * as THREE from "three";
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { uniform } from 'three/tsl';

const uChunkOffset = uniform(new THREE.Vector2(0, 0));


export function WebGPUFloor() {

  const material = new MeshStandardNodeMaterial();

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[200, 200, 100, 100]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}