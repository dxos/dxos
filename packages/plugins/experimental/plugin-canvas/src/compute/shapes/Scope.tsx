//
// Copyright 2024 DXOS.org
//

import { PerspectiveCamera, useFBO } from '@react-three/drei';
import { Canvas, createPortal, extend, useFrame } from '@react-three/fiber';
import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { ComputeShape, createAnchorId, type CreateShapeProps } from './defs';
import { createAnchorMap, type ShapeComponentProps, type ShapeDef } from '../../components';
import { DEFAULT_INPUT } from '../graph';
import { useComputeNodeState } from '../hooks';

export const ScopeShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('scope'),
  }),
);

export type ScopeShape = S.Schema.Type<typeof ScopeShape>;

export type CreateScopeProps = CreateShapeProps<ScopeShape>;

export const createScope = ({ id, ...rest }: CreateScopeProps): ScopeShape => ({
  id,
  type: 'scope',
  size: { width: 256, height: 256 },
  ...rest,
});

export const ScopeComponent = ({ shape }: ShapeComponentProps<ScopeShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const input = runtime.inputs[DEFAULT_INPUT];
  const active = input?.type === 'executed' ? input.value : false;

  return (
    <div className='flex w-full justify-center items-center'>
      <Sphere />
    </div>
  );
};

export const scopeShape: ShapeDef<ScopeShape> = {
  type: 'scope',
  name: 'Scope',
  icon: 'ph--waveform--regular',
  component: ScopeComponent,
  createShape: createScope,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('input')]: { x: -1, y: 0 } }),
};

type Options = {
  size: number;
  focus: number;
  speed: number;
  aperture: number;
  fov: number;
  curl: number;
  chaos: number;
  tint: [number, number, number];
};

const defaultOptions: Options = {
  size: 100,
  focus: 5,
  speed: 0.1,
  aperture: 1,
  fov: 175,
  curl: 0.1,
  chaos: 5,
  tint: [1, 1, 1],
};

const Sphere = () => {
  return (
    <Canvas
      linear={true}
      gl={(canvas) =>
        new THREE.WebGLRenderer({
          canvas,
          antialias: false,
          alpha: true,
        })
      }
    >
      <PerspectiveCamera makeDefault fov={30} position={[0, 0, 5]} zoom={1} />
      <Particles {...defaultOptions} />
    </Canvas>
  );
};

const Particles = ({ size, ...options }: Options) => {
  // Set up frame buffer.
  const [scene] = useState(() => new THREE.Scene());
  const [camera] = useState(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 1 / Math.pow(2, 53), 1));
  const [positions] = useState(() => new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0]));
  const [uvs] = useState(() => new Float32Array([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0]));

  // https://drei.docs.pmnd.rs/misc/fbo-use-fbo
  const target = useFBO(size, size, { magFilter: THREE.NearestFilter });

  // Particles.
  const particles = useMemo(() => {
    const length = size * size;
    const particles = new Float32Array(length * 3);
    for (let i = 0; i < length; i++) {
      const i3 = i * 3;
      particles[i3] = (i % size) / size;
      particles[i3 + 1] = i / size / size;
    }

    return particles;
  }, [size]);

  const renderRef = useRef<any>();
  const simRef = useRef<any>();

  // Update FBO and point-cloud every frame.
  useFrame(({ gl, clock }) => {
    gl.setRenderTarget(target);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);

    invariant(renderRef.current);
    renderRef.current.uniforms.positions.value = target.texture;
    renderRef.current.uniforms.uTime.value = clock.elapsedTime;
    renderRef.current.uniforms.uFocus.value = THREE.MathUtils.lerp(
      renderRef.current.uniforms.uFocus.value,
      options.focus,
      0.1,
    );
    renderRef.current.uniforms.uFov.value = THREE.MathUtils.lerp(
      renderRef.current.uniforms.uFov.value,
      options.fov,
      0.1,
    );
    renderRef.current.uniforms.uBlur.value = THREE.MathUtils.lerp(
      renderRef.current.uniforms.uBlur.value,
      (5.6 - options.aperture) * 9,
      0.1,
    );

    invariant(simRef.current);
    simRef.current.uniforms.uCurlFreq.value = options.curl;
    simRef.current.uniforms.uTime.value = clock.elapsedTime * options.speed;
    simRef.current.uniforms.uPerturbation.value = Math.sin(clock.elapsedTime * 10.5) * 0.5 + 0.5;
  });

  return (
    <>
      {/* Simulation goes into a FBO/Off-buffer. */}
      {createPortal(
        <mesh>
          {/* @ts-ignore */}
          <simulationMaterial ref={simRef} {...{ args: [options.chaos] }} />
          {/* eslint-disable react/no-unknown-property */}
          <bufferGeometry>
            <bufferAttribute attach='attributes-position' count={positions.length / 3} array={positions} itemSize={3} />
            <bufferAttribute attach='attributes-uv' count={uvs.length / 2} array={uvs} itemSize={2} />
          </bufferGeometry>
        </mesh>,
        scene,
      )}

      {/* The simulation buffer is forwarded into a point-cloud via data-texture. */}
      <points>
        {/* @ts-ignore */}
        <dofPointsMaterial ref={renderRef} {...{ args: [options.tint] }} />
        <bufferGeometry>
          {/* eslint-disable-next-line react/no-unknown-property */}
          <bufferAttribute attach='attributes-position' count={particles.length / 3} array={particles} itemSize={3} />
        </bufferGeometry>
      </points>
    </>
  );
};

//
// Shaders
//

class DofPointsMaterial extends THREE.ShaderMaterial {
  static vertexShader = `
  uniform sampler2D positions;
  uniform float uTime;
  uniform float uFocus;
  uniform float uFov;
  uniform float uBlur;
  varying float vDistance;
  
  void main() {
    vec3 pos = texture2D(positions, position.xy).xyz;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vDistance = abs(uFocus - -mvPosition.z) / 0.2; // TODO(burdon): Var.
    gl_PointSize = (step(1.0 - (1.0 / uFov), position.x)) * vDistance * uBlur;
  }
  `;

  static fragmentShader = `
  uniform vec3 uMask;
  uniform float uOpacity;
  varying float vDistance;
  
  void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    if (dot(cxy, cxy) > 1.0) discard;
    gl_FragColor = vec4(uMask, (1.04 - clamp(vDistance * 0.5, 0.0, 2.0)));
  }
  `;

  constructor(color: [number, number, number] = [1, 1, 1]) {
    super({
      vertexShader: DofPointsMaterial.vertexShader,
      fragmentShader: DofPointsMaterial.fragmentShader,
      uniforms: {
        positions: { value: null },
        uTime: { value: 0 },
        uFocus: { value: 5.1 },
        uFov: { value: 50 },
        uBlur: { value: 30 },
        uMask: { value: color },
      },
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
  }
}

export class SimulationMaterial extends THREE.ShaderMaterial {
  static vertexShader = `
  uniform sampler2D positions;
  uniform float uTime;
  uniform float uFocus;
  uniform float uFov;
  uniform float uBlur;
  varying float vDistance;

  void main() {
    vec3 pos = texture2D(positions, position.xy).xyz;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vDistance = abs(uFocus - -mvPosition.z) / 0.2; // TODO(burdon): Var.
    gl_PointSize = (step(1.0 - (1.0 / uFov), position.x)) * vDistance * uBlur;
  }
  `;

  static fragmentShader = `
  uniform vec3 uMask;
  uniform float uOpacity;
  varying float vDistance;

  void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    if (dot(cxy, cxy) > 1.0) discard;
    gl_FragColor = vec4(uMask, (1.04 - clamp(vDistance * 0.5, 0.0, 2.0)));
  }
  `;

  constructor(chaos = 5) {
    const positionsTexture = new THREE.DataTexture(
      getSphere(512 * 512, 128),
      512,
      512,
      THREE.RGBAFormat,
      THREE.FloatType,
    );
    positionsTexture.needsUpdate = true;
    super({
      vertexShader: SimulationMaterial.vertexShader,
      fragmentShader: SimulationMaterial.fragmentShader,
      uniforms: {
        positions: { value: positionsTexture },
        uTime: { value: 0 },
        uCurlFreq: { value: 0.25 },
        uChaos: { value: chaos },
        uPerturbation: { value: 1.0 },
      },
    });
  }
}

const getSphere = (count: number, size: number, p = new THREE.Vector4()) => {
  const data = new Float32Array(count * 4);
  for (let i = 0; i < count * 4; i += 4) {
    getPoint(p, size, data, i);
  }

  return data;
};

const getPoint = (v: any, size: number, data: Float32Array, offset: number): any => {
  v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  if (v.length() > 1) {
    return getPoint(v, size, data, offset);
  }

  return v.normalize().multiplyScalar(size).toArray(data, offset);
};

extend({
  THREE,
  DofPointsMaterial,
  SimulationMaterial,
});
