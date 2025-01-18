//
// Copyright 2024 DXOS.org
//

import { PerspectiveCamera, useFBO } from '@react-three/drei';
import { Canvas, createPortal, extend, useFrame } from '@react-three/fiber';
import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { useAudioStream } from './Audio';
import { ComputeShape, createAnchorId, type CreateShapeProps } from './defs';
import { createAnchorMap, type ShapeComponentProps, type ShapeDef } from '../../components';
import { DofPointsMaterial, SimulationMaterial } from '../../shaders';
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
    <div className='flex w-full justify-center items-center bg-black'>
      <Sphere active={active} options={defaultOptions} />
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

export type Options = {
  size: number;
  focus: number;
  speed: number;
  aperture: number;
  curl: number;
  chaos: number;
  tint: [number, number, number];

  fov: number;
  zoom: number;
};

const defaultOptions: Options = {
  size: 100,
  focus: 7,
  speed: 5,
  aperture: 9,
  curl: 0.9,
  chaos: 10,
  tint: [0, 0, 0.9],

  fov: 15,
  zoom: 7,
};

const Sphere = ({ active, options = defaultOptions }: { active?: boolean; options?: Options }) => {
  // https://docs.pmnd.rs/react-three-fiber/api/canvas#render-props
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
      <PerspectiveCamera makeDefault fov={options.fov} position={[0, 0, options.zoom]} zoom={1} />
      <Particles active={active} options={options} />
    </Canvas>
  );
};

const Particles = ({ active, options: { size, ...options } }: { active?: boolean; options: Options }) => {
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

  // TODO(burdon): Get from stream.
  const getAmplitude = useAudioStream(true);

  // Update FBO and point-cloud every frame.
  useFrame(({ gl, clock }) => {
    gl.setRenderTarget(target);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);

    invariant(renderRef.current);
    const render = renderRef.current;
    invariant(simRef.current);
    const sim = simRef.current;

    render.uniforms.positions.value = target.texture;
    render.uniforms.uTime.value = clock.elapsedTime;
    render.uniforms.uFocus.value = THREE.MathUtils.lerp(render.uniforms.uFocus.value, options.focus, 0.1);
    render.uniforms.uFov.value = THREE.MathUtils.lerp(render.uniforms.uFov.value, options.fov, 0.1);
    render.uniforms.uBlur.value = THREE.MathUtils.lerp(render.uniforms.uBlur.value, (5.6 - options.aperture) * 9, 0.1);

    sim.uniforms.uCurlFreq.value = options.curl;
    sim.uniforms.uTime.value = clock.elapsedTime * options.speed;
    // sim.uniforms.uPerturbation.value = Math.sin(clock.elapsedTime * 8) * 0.5 + 0.5;
    sim.uniforms.uPerturbation.value = getAmplitude();
  });

  return (
    <>
      {/* Simulation goes into a FBO/Off-buffer. */}
      {createPortal(
        <mesh>
          {/* eslint-disable react/no-unknown-property */}
          {/* @ts-ignore */}
          <simulationMaterial ref={simRef} {...{ args: [options] }} />
          <bufferGeometry>
            <bufferAttribute attach='attributes-position' count={positions.length / 3} array={positions} itemSize={3} />
            <bufferAttribute attach='attributes-uv' count={uvs.length / 2} array={uvs} itemSize={2} />
          </bufferGeometry>
        </mesh>,
        scene,
      )}

      {/* The simulation buffer is forwarded into a point-cloud via data-texture. */}
      <points>
        {/* eslint-disable react/no-unknown-property */}
        {/* @ts-ignore */}
        <dofPointsMaterial ref={renderRef} {...{ args: [options] }} />
        <bufferGeometry>
          <bufferAttribute attach='attributes-position' count={particles.length / 3} array={particles} itemSize={3} />
        </bufferGeometry>
      </points>
    </>
  );
};

//
// Shaders
//

extend({
  THREE,
  DofPointsMaterial,
  SimulationMaterial,
});
