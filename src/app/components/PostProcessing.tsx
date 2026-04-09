"use client";
import * as THREE from "three/webgpu";
import {
  pass,
  mrt,
  output,
  emissive,
  normalView,
  Fn,
  float,
  uv,
  vec2,
  vec3,
  clamp,
  floor,
  dot,
  smoothstep,
  sign,
  step,
  screenSize,
  convertToTexture,
} from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";

interface PostProcessingProps {
  strength?: number;
  radius?: number;
  threshold?: number;
  normalEdgeStrength?: number;
  depthEdgeStrength?: number;
  /**
   * Block size in **screen pixels** for the internal scene pass (1 = full res, 4 = 4×4 blocks).
   * Uses {@link THREE.PassNode#setResolution} — same idea as `PixelationPassNode`’s pixel size.
   */
  pixelSize?: number;
}

/**
 * Pixel-aligned edge pass (same math as three.js PixelationNode / RenderPixelatedPass GLSL).
 * Uses {@link screenSize} for texel steps so sampling matches the scene pass render target.
 */
export function PostProcessing({
  strength = 1.5,
  radius = 0.5,
  threshold = 0.6,
  normalEdgeStrength = 0.3,
  depthEdgeStrength = 0.4,
  pixelSize = 4,
}: PostProcessingProps) {
  const { gl, scene, camera } = useThree();
  const postProcessingRef = useRef<THREE.PostProcessing | null>(null);

  useEffect(() => {
    if (!gl || !scene || !camera) return;

    const scenePass = pass(scene, camera, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });

    const px = Math.max(1, pixelSize);
    scenePass.setResolution(1 / px);

    scenePass.setMRT(
      mrt({
        output: output,
        emissive: emissive,
        normal: normalView,
      }),
    );

    const scenePassColor = scenePass.getTextureNode("output");
    const scenePassEmissive = scenePass.getTextureNode("emissive");
    const scenePassDepth = scenePass.getTextureNode("depth");
    const scenePassNormal = scenePass.getTextureNode("normal");

    const colorTex = convertToTexture(scenePassColor);
    const depthTex = convertToTexture(scenePassDepth);
    const normalTex = convertToTexture(scenePassNormal);

    const uvNode = uv();
    // One "game pixel" in UV space: low-res RT is screenSize/px; neighbor taps stay 1 texel apart.
    const texelStep = vec2(1, 1).mul(float(px)).div(screenSize);

    const sampleDepth = (x: number, y: number) =>
      depthTex.sample(uvNode.add(vec2(x, y).mul(texelStep))).r;

    const sampleNormal = (x: number, y: number) =>
      normalTex.sample(uvNode.add(vec2(x, y).mul(texelStep))).rgb.normalize();

    const neighborNormalEdgeIndicator = (
      x: number,
      y: number,
      depthCenter: ReturnType<typeof sampleDepth>,
      normalCenter: ReturnType<typeof sampleNormal>,
    ) => {
      const depthDiff = sampleDepth(x, y).sub(depthCenter);
      const neighborNormal = sampleNormal(x, y);
      const normalEdgeBias = vec3(1, 1, 1);
      const normalDiff = dot(normalCenter.sub(neighborNormal), normalEdgeBias);
      const normalIndicator = clamp(smoothstep(-0.01, 0.01, normalDiff), 0, 1);
      const depthIndicator = clamp(sign(depthDiff.mul(0.25).add(0.0025)), 0, 1);
      return float(1)
        .sub(dot(normalCenter, neighborNormal))
        .mul(depthIndicator)
        .mul(normalIndicator);
    };

    const depthEdgeIndicator = (depthCenter: ReturnType<typeof sampleDepth>) => {
      const diff = clamp(sampleDepth(1, 0).sub(depthCenter))
        .add(clamp(sampleDepth(-1, 0).sub(depthCenter)))
        .add(clamp(sampleDepth(0, 1).sub(depthCenter)))
        .add(clamp(sampleDepth(0, -1).sub(depthCenter)));
      return floor(smoothstep(0.01, 0.02, diff).mul(2)).div(2);
    };

    const normalEdgeIndicator = (
      depthCenter: ReturnType<typeof sampleDepth>,
      normalCenter: ReturnType<typeof sampleNormal>,
    ) =>
      step(
        float(0.1),
        neighborNormalEdgeIndicator(0, -1, depthCenter, normalCenter)
          .add(neighborNormalEdgeIndicator(0, 1, depthCenter, normalCenter))
          .add(neighborNormalEdgeIndicator(-1, 0, depthCenter, normalCenter))
          .add(neighborNormalEdgeIndicator(1, 0, depthCenter, normalCenter)),
      );

    const nes = float(normalEdgeStrength);
    const des = float(depthEdgeStrength);

    const pixelEdge = Fn(() => {
      const texel = colorTex.sample(uvNode);
      const depth = sampleDepth(0, 0);
      const normal = sampleNormal(0, 0);
      const dei = depthEdgeIndicator(depth);
      const nei = normalEdgeIndicator(depth, normal);
      const coefficient = dei.greaterThan(0).select(
        float(1).sub(des.mul(dei)),
        float(1).add(nes.mul(nei)),
      );
      return texel.mul(coefficient);
    });

    const edgedColor = pixelEdge();
    const bloomPass = bloom(scenePassEmissive, strength, radius, threshold);

    const postProcessing = new THREE.PostProcessing(gl as unknown as THREE.Renderer);
    postProcessing.outputNode = edgedColor.add(bloomPass);
    postProcessingRef.current = postProcessing;

    return () => {
      postProcessingRef.current = null;
    };
  }, [
    gl,
    scene,
    camera,
    strength,
    radius,
    threshold,
    normalEdgeStrength,
    depthEdgeStrength,
    pixelSize,
  ]);

  useFrame(() => {
    postProcessingRef.current?.render();
  }, 1);

  return null;
}
