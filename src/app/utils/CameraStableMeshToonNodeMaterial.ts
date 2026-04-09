import * as THREE from "three/webgpu";
import CameraStableToonLightingModel from "./CameraStableToonLightingModel";

/**
 * {@link THREE.MeshToonNodeMaterial} with a lighting model that matches analytic light directions
 * (view space) to vertex normals in view space — see {@link CameraStableToonLightingModel}.
 */
export class CameraStableMeshToonNodeMaterial extends THREE.MeshToonNodeMaterial {
  override setupLightingModel() {
    return new CameraStableToonLightingModel();
  }
}
