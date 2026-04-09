/**
 * three.js core {@link https://github.com/mrdoob/three.js/blob/dev/src/nodes/functions/ToonLightingModel.js ToonLightingModel}
 * dots `normalGeometry` (object-space) with `lightDirection` from analytic lights, which is built in
 * **view space**. That space mismatch makes the toon ramp slide when the camera moves. This copy
 * uses `normalView` so N·L is consistent with other lit materials.
 */
import LightingModel from "three/src/nodes/core/LightingModel.js";
import BRDF_Lambert from "three/src/nodes/functions/BSDF/BRDF_Lambert.js";
import { diffuseColor } from "three/src/nodes/core/PropertyNode.js";
import {
  Fn,
  float,
  materialReference,
  mix,
  normalView,
  smoothstep,
  vec2,
  vec3,
} from "three/tsl";

// TSL shader graph — parameter types are node objects, not TS-friendly.
const getGradientIrradiance = /* @__PURE__ */ Fn(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ({ normal, lightDirection, builder }: any) => {
    const dotNL = normal.dot(lightDirection);
    const coord = vec2(dotNL.mul(0.5).add(0.5), 0.0);

    if (builder.material.gradientMap) {
      const gradientMap = materialReference("gradientMap", "texture").context({
        getUV: () => coord,
      });
      return vec3(gradientMap.r);
    }

    const fw = coord.fwidth().mul(0.5);
    return mix(
      vec3(0.7),
      vec3(1.0),
      smoothstep(float(0.7).sub(fw.x), float(0.7).add(fw.x), coord.x),
    );
  },
);

export default class CameraStableToonLightingModel extends LightingModel {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  direct({ lightDirection, lightColor, reflectedLight }: any, builder: any) {
    const irradiance = (
      getGradientIrradiance as (args: {
        normal: typeof normalView;
        lightDirection: unknown;
        builder: unknown;
      }) => { mul: (c: unknown) => unknown }
    )({
      normal: normalView,
      lightDirection,
      builder,
    }).mul(lightColor) as {
      mul: (v: unknown) => unknown;
    };

    reflectedLight.directDiffuse.addAssign(
      irradiance.mul(BRDF_Lambert({ diffuseColor: diffuseColor.rgb })),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  indirect(builder: any) {
    const { ambientOcclusion, irradiance, reflectedLight } = builder.context;

    reflectedLight.indirectDiffuse.addAssign(
      irradiance.mul(BRDF_Lambert({ diffuseColor })),
    );

    reflectedLight.indirectDiffuse.mulAssign(ambientOcclusion);
  }
}
