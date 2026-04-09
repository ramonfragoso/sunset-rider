import { useControls } from "leva";

export const useDebugUI = () => {
  const lightingControls = useControls("Lighting", {
    ambientIntensity: { value: 0.3, min: 0, max: 20, step: 0.1 },
    directionalIntensity: { value: 0.8, min: 0, max: 10, step: 0.1 },
    directionalPosition: { value: [0, 3, 8], step: 0.5 },
    directionalColor: "#ffffff",
    pointIntensity: { value: 60, min: 0, max: 500, step: 0.1 },
    pointPosition: { value: [2, 2, -1], step: 0.01 },
    pointColor: "#626262",
    showHelpers: true,
  });

  const modelControls = useControls("Model", {
    position: { value: [0, 0, 0], step: 0.1 },
    scale: { value: [1, 1, 1], min: 0.1, max: 3, step: 0.1 },
    rotation: { value: [0, 0, 0], step: 0.1 },
    autoRotate: false,
    rotationSpeed: { value: 0.005, min: 0, max: 0.02, step: 0.001 },
  });

  const groundControls = useControls("Ground", {
    offset: { value: 0.0, min: 0.0, max: 20, step: 0.001 },
  });

  const spotlightControls = useControls("Spotlight", {
    enabled: true,
    intensity: { value: 329, min: 0, max: 500, step: 1 },
    color: "#ffffff",
    distance: { value: 33, min: 0, max: 100, step: 0.5 },
    angle: { value: 0.37, min: 0.05, max: Math.PI / 3, step: 0.01 },
    penumbra: { value: 1, min: 0, max: 1, step: 0.01 },
    decay: { value: 1.9, min: 1, max: 2, step: 0.01 },
    orbitRadius: { value: 10.4, min: 0, max: 20, step: 0.1 },
    height: { value: 15, min: 0, max: 30, step: 0.1 },
    orbitSpeed: { value: 0.74, min: 0, max: 2, step: 0.01 },
    orbitEnabled: true,
    targetY: { value: -2, min: -5, max: 5, step: 0.1 },
    shadowFocus: { value: 1, min: 0, max: 1, step: 0.01 },
    shadowBias: { value: 0.01, min: -0.01, max: 0.01, step: 0.0001 },
    shadowIntensity: { value: 1, min: 0, max: 1, step: 0.01 },
  });

  return {
    lighting: lightingControls,
    spotlight: spotlightControls,
    model: modelControls,
    groundControls,
  };
};
