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
import { DofPointsMaterial, type ShaderOptions, SimulationMaterial } from '../../shaders';
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
  size: { width: 192, height: 192 },
  classNames: 'rounded-full dark:border-none',
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

const defaultOptions: ShaderOptions = {
  size: 500,
  fov: 60,
  zoom: 2.5,
  focus: 2.2, // Should be close to zoom value.
  aperture: 5.6, // Max 5.6 (sharper).
  speed: 15,
  curl: 1, // Higher values (e.g., 10) create more plasma-like grouping; lower values are more diffuse (e.g., 1).
  chaos: 1, // Degree of chaos (1-5).
  color: [0, 0.2, 0.6],
};

const Sphere = ({ active, options = defaultOptions }: { active?: boolean; options?: ShaderOptions }) => {
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

const Particles = ({ active, options: { size, ...options } }: { active?: boolean; options: ShaderOptions }) => {
  // Set up frame buffer.
  const [scene] = useState(() => new THREE.Scene());
  const [camera] = useState(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 1 / Math.pow(2, 53), 1));
  const [positions] = useState(() => new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0]));
  const [uvs] = useState(() => new Float32Array([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0]));

  // Creates a WebGL Frame Buffer Object (FBO) with dimensions size x size
  // https://drei.docs.pmnd.rs/misc/fbo-use-fbo
  const target = useFBO(size, size, {
    magFilter: THREE.NearestFilter, // Uses nearest neighbor sampling (pixelated look)
  });

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
  const getAmplitude = useAudioStream(active);

  // Update FBO and point-cloud every frame.
  // https://r3f.docs.pmnd.rs/api/hooks#useframe
  useFrame(({ gl, clock, internal }, delta) => {
    // TODO(burdon): Pause rendering if frame rate is too low (e.g., while dragging).
    if (delta > 0.01) {
      return;
    }

    gl.setRenderTarget(target);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);

    invariant(renderRef.current);
    const render = renderRef.current;
    invariant(simRef.current);
    const sim = simRef.current;

    render.uniforms.positions.value = target.texture;
    // TODO(burdon): These don't seem to affect anything?
    render.uniforms.uTime.value = clock.elapsedTime;
    render.uniforms.uFocus.value = THREE.MathUtils.lerp(render.uniforms.uFocus.value, options.focus, 0.1);
    render.uniforms.uFov.value = THREE.MathUtils.lerp(render.uniforms.uFov.value, options.fov, 0.1);
    render.uniforms.uBlur.value = THREE.MathUtils.lerp(render.uniforms.uBlur.value, (5.6 - options.aperture) * 9, 0.1);

    const amplitude = getAmplitude();
    sim.uniforms.uCurl.value = options.curl;
    sim.uniforms.uTime.value = clock.elapsedTime * options.speed;
    sim.uniforms.uPerturbation.value = 2.5 + amplitude;
    // sim.uniforms.uPerturbation.value = Math.cos(clock.elapsedTime * options.speed * 0.5 * amplitude) * 0.1;
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
