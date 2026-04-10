"use client";
import * as THREE from "three";
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { playerPosition } from "./Player";
import { Fn, fract, sin, dot, vec2, cos, floor, uniformArray, mix, Loop, float, positionLocal, vec3, uint } from 'three/tsl';

const CHUNK_SIZE = 200;
const CHUNK_COUNT = 9;

function worldToChunkIndex(axis: number) {
  return Math.floor(axis / 60);
}

function getChunkPositions(pos: THREE.Vector3) {
  const chunks: { chunkX: number; chunkZ: number }[] = [];
  const currentChunkX = worldToChunkIndex(pos.x);
  const currentChunkZ = worldToChunkIndex(pos.z);

  for (let cx = -1; cx <= 1; cx++) {
    for (let cz = -1; cz <= 1; cz++) {
      chunks.push({
        chunkX: (currentChunkX + cx) * CHUNK_SIZE + CHUNK_SIZE / 2,
        chunkZ: (currentChunkZ + cz) * CHUNK_SIZE + CHUNK_SIZE / 2
      })
    }
  }
  return chunks
}

const chunkOffsets = uniformArray(
  Array.from({ length: CHUNK_COUNT }, () => new THREE.Vector2(0, 0)),
  'vec2'
)

const materials = Array.from({ length: CHUNK_COUNT }, () =>
  new MeshStandardNodeMaterial({ color: '#1122ff', wireframe: true })
);

const hash = Fn(([p]: any, _builder: unknown) => {
  void _builder;
  return fract(sin(dot(p, vec2(127.1, 311.7))).mul(44758.2378));
});

const hash2 = Fn(([p]: any, _builder: unknown) => {
  void _builder;
  const angle = hash(p).mul(6.2831853);
  return vec2(cos(angle), sin(angle));
});

const noise = Fn(([p]: any, _builder: unknown) => {
  void _builder;
  const i = floor(p)
  const f = fract(p)

  const gridA = dot(hash2(i), f)
  const gridB = dot(hash2(i.add(vec2(1, 0))), f.sub(vec2(1, 0)))
  const gridC = dot(hash2(i.add(vec2(0, 1))), f.sub(vec2(0, 1)))
  const gridD = dot(hash2(i.add(vec2(1, 1))), f.sub(vec2(1, 1)))

  const mixBottomEdge = mix(gridA, gridB, fract(p.x))
  const mixTopEdge = mix(gridC, gridD, fract(p.x))
  return mix(mixBottomEdge, mixTopEdge, fract(p.y))
})

const fbm = Fn(([p]: any, _builder: unknown) => {
  void _builder;
  const frequency = float(1).toVar();
  const amplitude = float(0.5).toVar();
  const value = float(0).toVar();
  Loop(20, () => {
    value.assign(value.add(noise(p.mul(frequency)).mul(amplitude)))
    frequency.assign(frequency.mul(float(2)))
    amplitude.assign(amplitude.mul(float(0.5)))
  })
  return value
})

materials.forEach((material, i) => {
  const chunkOffset = chunkOffsets.element(uint(i));
  const worldPos = vec2(positionLocal.x, positionLocal.y.negate()).add(chunkOffset);
  const regional = fbm(worldPos.mul(float(0.001)));
  const detail = fbm(worldPos.mul(float(0.008)));
  const h = regional.mul(detail).mul(float(300.0));

  material.positionNode = vec3(positionLocal.x, positionLocal.y, h)
});

export function WebGPUFloor() {
  const meshRefs = useRef<(THREE.Mesh | null)[]>(Array.from({ length: CHUNK_COUNT }, () => null));

  useFrame(() => {
    const chunkPositions = getChunkPositions(playerPosition);

    meshRefs.current.forEach((mesh, i) => {
      if (mesh) {
        const pos = chunkPositions[i];
        mesh.position.x = pos.chunkX;
        mesh.position.y = 0;
        mesh.position.z = pos.chunkZ;
        (chunkOffsets.array as THREE.Vector2[])[i].set(pos.chunkX, pos.chunkZ);
      }
    });

  });

  return (
    <>
      {Array.from({ length: CHUNK_COUNT }, (_, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          ref={(el) => {
            meshRefs.current[i] = el;
          }}
        >
          <planeGeometry args={[200, 200, 20, 20]} />
          <primitive object={materials[i]} attach="material" />
        </mesh>
      ))}
    </>
  )
}
