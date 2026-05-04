"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three/webgpu";
import { PATH_POINTS, playerPosition } from "./Player";
import { FLOOR_CHUNK_SIZE } from "./WebGPUFloor";
import { CameraStableMeshToonNodeMaterial } from "../utils/CameraStableMeshToonNodeMaterial";
import { getToonGradientTexture } from "../utils/toonGradientTextures";

// Same coordinate space as Player and Train (no Scene group scale applied here).
const RENDER_RADIUS = FLOOR_CHUNK_SIZE * 1.5;

// ── WebGPU material builder (mirrors Train.tsx logic) ────────────────────────

function buildRailMaterial(
  src: THREE.Material,
  toonGradient: THREE.DataTexture,
): THREE.Material {
  const srcStd = src as THREE.MeshStandardMaterial;

  if (srcStd.map) {
    srcStd.map.channel = 0;
    const mat = new THREE.MeshStandardNodeMaterial();
    mat.name = src.name;
    mat.map = srcStd.map;
    mat.color.copy(srcStd.color);
    mat.roughness = 1;
    mat.metalness = 0;
    mat.side = src.side;
    return mat;
  }

  const mat = new CameraStableMeshToonNodeMaterial({
    gradientMap: toonGradient,
  });
  mat.name = src.name;
  mat.color.copy(srcStd.color);
  mat.side = src.side;
  return mat;
}

function buildRailScene(
  gltfScene: THREE.Object3D,
  toonGradient: THREE.DataTexture,
): THREE.Object3D {
  const matCache = new Map<string, THREE.Material>();
  const clone = gltfScene.clone(true);

  clone.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.castShadow = true;
    node.receiveShadow = true;

    const replace = (src: THREE.Material): THREE.Material => {
      const cached = matCache.get(src.uuid);
      if (cached) return cached;
      const built = buildRailMaterial(src, toonGradient);
      matCache.set(src.uuid, built);
      return built;
    };

    if (Array.isArray(node.material)) {
      node.material = node.material.map(replace);
    } else {
      node.material = replace(node.material);
    }
  });

  return clone;
}

// ── Path placement ────────────────────────────────────────────────────────────

type RailPiece = {
  index: number;
  worldPos: THREE.Vector3;
  matrix: THREE.Matrix4;
};

function buildAllPieces(spacing: number, height: number, scale: number): RailPiece[] {
  const pieces: RailPiece[] = [];
  const n = PATH_POINTS.length;

  const _scaleVec = new THREE.Vector3(scale, scale, scale);
  const _up = new THREE.Vector3(0, 1, 0);

  let accumulated = 0;
  let pieceIndex = 0;

  for (let seg = 0; seg < n; seg++) {
    const a = PATH_POINTS[seg];
    const b = PATH_POINTS[(seg + 1) % n];

    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const segLen = Math.sqrt(dx * dx + dz * dz);
    if (segLen < 1e-6) continue;

    // Quaternion that rotates the rail to face along this segment's direction
    const angle = Math.atan2(dx, dz) + Math.PI/2;
    const segQuat = new THREE.Quaternion().setFromAxisAngle(_up, angle);

    let distUntilNext = spacing - accumulated;

    while (distUntilNext <= segLen) {
      const t = distUntilNext / segLen;
      const px = a.x + dx * t;
      const pz = a.z + dz * t;
      const worldPos = new THREE.Vector3(px, height, pz);

      const mat = new THREE.Matrix4().compose(worldPos, segQuat, _scaleVec);
      pieces.push({ index: pieceIndex++, worldPos, matrix: mat });

      distUntilNext += spacing;
    }

    accumulated = segLen - (distUntilNext - spacing);
  }

  return pieces;
}

function filterVisible(allPieces: RailPiece[]): RailPiece[] {
  return allPieces.filter((p) => p.worldPos.distanceTo(playerPosition) <= RENDER_RADIUS);
}

// ── Single rail piece ─────────────────────────────────────────────────────────

const OneRailPiece = memo(function OneRailPiece({
  builtScene,
  matrix,
}: {
  builtScene: THREE.Object3D;
  matrix: THREE.Matrix4;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const obj = useMemo(() => builtScene.clone(true), [builtScene]);

  useLayoutEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.matrix.copy(matrix);
    g.matrixWorldNeedsUpdate = true;
  }, [matrix]);

  return (
    <group ref={groupRef} matrixAutoUpdate={false} frustumCulled={false}>
      <primitive object={obj} />
    </group>
  );
});

// ── Main component ────────────────────────────────────────────────────────────

export function RailPieces({
  spacing,
  height,
  scale,
}: {
  spacing: number;
  height: number;
  scale: number;
}) {
  const { scene } = useGLTF("/rails.glb");
  const toonGradient = useMemo(() => getToonGradientTexture("fiveTone"), []);

  const builtScene = useMemo(
    () => buildRailScene(scene, toonGradient),
    [scene, toonGradient],
  );

  const allPieces = useMemo(
    () => buildAllPieces(spacing, height, scale),
    [spacing, height, scale],
  );

  const [visiblePieces, setVisiblePieces] = useState<RailPiece[]>([]);

  useEffect(() => {
    setVisiblePieces(filterVisible(allPieces));
  }, [allPieces]);

  const lastPlayerPos = useRef(new THREE.Vector3(Infinity, Infinity, Infinity));
  const updateThreshold = Math.max(50, spacing / 2);

  useFrame(() => {
    if (lastPlayerPos.current.distanceTo(playerPosition) < updateThreshold) return;
    lastPlayerPos.current.copy(playerPosition);
    setVisiblePieces(filterVisible(allPieces));
  });

  return (
    <>
      {visiblePieces.map((p) => (
        <OneRailPiece key={p.index} builtScene={builtScene} matrix={p.matrix} />
      ))}
    </>
  );
}

useGLTF.preload("/rails.glb");
