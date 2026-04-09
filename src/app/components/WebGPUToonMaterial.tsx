"use client";

import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three/webgpu";
import { CameraStableMeshToonNodeMaterial } from "../utils/CameraStableMeshToonNodeMaterial";
import {
  getToonGradientTexture,
  type ToonGradientPresetName,
  ToonGradientPreset,
} from "../utils/toonGradientTextures";

export type { ToonGradientPresetName };
export { ToonGradientPreset, TOON_GRADIENT_PRESET_LIST } from "../utils/toonGradientTextures";

export type WebGPUToonMaterialProps = {
  color: THREE.ColorRepresentation;
  /** Gradient ramp preset; default matches classic five-tone toon. */
  preset?: ToonGradientPresetName;
  side?: THREE.Side;
  transparent?: boolean;
  opacity?: number;
};

/**
 * WebGPU toon shading via node materials. Uses {@link CameraStableMeshToonNodeMaterial} so N·L for
 * the ramp uses view-space normals with view-space light directions (three.js core ToonLightingModel
 * mixes object normals with view-space lights, which makes shading drift with the camera).
 */
export function WebGPUToonMaterial({
  color,
  preset = ToonGradientPreset.fiveTone,
  side,
  transparent,
  opacity,
}: WebGPUToonMaterialProps) {
  const material = useMemo(() => {
    return new CameraStableMeshToonNodeMaterial({
      gradientMap: getToonGradientTexture(preset),
    });
  }, [preset]);

  useLayoutEffect(() => {
    material.color.set(color);
  }, [color, material]);

  useLayoutEffect(() => {
    if (side !== undefined) material.side = side;
    if (transparent !== undefined) material.transparent = transparent;
    if (opacity !== undefined) material.opacity = opacity;
  }, [material, side, transparent, opacity]);

  useEffect(
    () => () => {
      material.dispose();
    },
    [material],
  );

  return <primitive object={material} attach="material" />;
}
