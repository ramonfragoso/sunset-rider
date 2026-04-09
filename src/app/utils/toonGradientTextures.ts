import * as THREE from "three";

const WIDTH = 64;

function createStepBands(steps: number): THREE.DataTexture {
  const data = new Uint8Array(WIDTH);
  for (let i = 0; i < WIDTH; i++) {
    const u = (i + 0.5) / WIDTH;
    const band = Math.min(steps - 1, Math.floor(u * steps));
    data[i] = Math.round((band / Math.max(1, steps - 1)) * 255);
  }
  return finalizeDataTexture(data);
}

function createSmoothRamp(): THREE.DataTexture {
  const data = new Uint8Array(WIDTH);
  for (let i = 0; i < WIDTH; i++) {
    data[i] = Math.round((i / Math.max(1, WIDTH - 1)) * 255);
  }
  const tex = finalizeDataTexture(data);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

function finalizeDataTexture(data: Uint8Array): THREE.DataTexture {
  const tex = new THREE.DataTexture(data, WIDTH, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

/** Five built-in toon ramps for {@link THREE.MeshToonNodeMaterial} (WebGPU). */
export const ToonGradientPreset = {
  /** Three hard steps (strong comic bands). */
  threeTone: "threeTone",
  /** Four bands. */
  fourTone: "fourTone",
  /** Five bands — closest to classic `fiveTone.jpg` / three.js examples. */
  fiveTone: "fiveTone",
  /** Six finer bands. */
  sixTone: "sixTone",
  /** Smooth luminance ramp (still uses toon lighting; softer look). */
  smoothRamp: "smoothRamp",
} as const;

export type ToonGradientPresetName =
  (typeof ToonGradientPreset)[keyof typeof ToonGradientPreset];

const cache = new Map<ToonGradientPresetName, THREE.DataTexture>();

export function getToonGradientTexture(
  preset: ToonGradientPresetName,
): THREE.DataTexture {
  let tex = cache.get(preset);
  if (tex) return tex;
  switch (preset) {
    case ToonGradientPreset.threeTone:
      tex = createStepBands(3);
      break;
    case ToonGradientPreset.fourTone:
      tex = createStepBands(4);
      break;
    case ToonGradientPreset.fiveTone:
      tex = createStepBands(5);
      break;
    case ToonGradientPreset.sixTone:
      tex = createStepBands(6);
      break;
    case ToonGradientPreset.smoothRamp:
      tex = createSmoothRamp();
      break;
  }
  cache.set(preset, tex);
  return tex;
}

export const TOON_GRADIENT_PRESET_LIST = Object.values(ToonGradientPreset);
