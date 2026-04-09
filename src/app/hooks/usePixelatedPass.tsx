import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RenderPixelatedPass } from '../utils/RenderPixelatedPass'

interface Props {
  pixelSize?: number
}

export function usePixelatedPass({ pixelSize = 6 }: Props = {}) {
  const { scene, camera, size } = useThree()

  const resolution = useMemo(() => {
    const r = new THREE.Vector2(
      Math.floor(size.width  / pixelSize),
      Math.floor(size.height / pixelSize),
    )
    return r
  }, [size.width, size.height, pixelSize])

  const pass = useMemo(
    () => new RenderPixelatedPass(resolution, scene, camera),
    [resolution, scene, camera]
  )

  useEffect(() => () => pass.dispose(), [pass])

  return pass
}