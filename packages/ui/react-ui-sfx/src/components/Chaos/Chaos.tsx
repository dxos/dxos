//
// Copyright 2024 DXOS.org
//

// TODO(wittjosiah): Typing here broke when upgrading to React 19.
// @ts-nocheck

import { OrbitControls, PerspectiveCamera, Stats, useFBO } from '@react-three/drei';
import { Canvas, createPortal, extend, useFrame } from '@react-three/fiber';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type Specialize } from '@dxos/util';

import { DofPointsMaterial, type ShaderOptions, SimulationMaterial } from '../../shaders';

export const shaderPresets: Record<string, ShaderOptions> = {
  heptapod: {
    aperture: 5.6,
    fov: 50,
    zoom: 0.8,
    distance: 2,
    focus: 0.05,
    rotation: 0,
    size: 500,
    speed: 24,
    curl: 0.7,
    chaos: 1,
    alpha: 0.53,
    gain: 0.9,
    color: [0, 0.2, 0.6],
  },
  spore: {
    aperture: 5.6,
    fov: 50,
    zoom: 0.8,
    distance: 2,
    focus: 0.3,
    rotation: 0,
    size: 500,
    speed: 24,
    curl: 1,
    chaos: 1,
    alpha: 0.53,
    gain: 0.9,
    color: [0, 0.2, 0.6],
  },
  portal: {
    aperture: 5.6,
    fov: 64,
    zoom: 1.1,
    distance: 2,
    focus: 0,
    rotation: 0,
    size: 500,
    speed: 30,
    curl: 0.01,
    chaos: 1,
    alpha: 0.4,
    gain: 0.9,
    color: [0, 0.2, 0.6],
  },
  droplet: {
    aperture: 5.6,
    fov: 82,
    zoom: 2.7,
    distance: 2,
    focus: 0.18,
    rotation: 0,
    size: 500,
    speed: 15,
    curl: 0.01,
    chaos: 5,
    alpha: 0.1,
    gain: 0.9,
    color: [0, 0.2, 0.6],
  },
};

export const defaultShaderOptions = Object.values(shaderPresets)[0];

export type ChaosProps = ThemedClassName<{
  active?: boolean;
  getValue?: () => number;
  options?: ShaderOptions;
  debug?: boolean;
}>;

// TODO(burdon): Memoize so isn't reset on stat change?
export const Chaos = ({ classNames, active, options = defaultShaderOptions, debug, ...props }: ChaosProps) => {
  const [init, setInit] = useState(false);
  useEffect(() => {
    setInit(true);
  }, []);

  // https://docs.pmnd.rs/react-three-fiber/api/canvas#render-props
  return (
    <div className={mx('grid grow', classNames)}>
      <Canvas
        className={mx('transition-opacity opacity-0 duration-[1s]', init && 'opacity-100')}
        linear={true}
        gl={({ canvas }) =>
          new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: false,
          })
        }
      >
        {debug && (
          <>
            <Stats />
            <OrbitControls makeDefault enablePan autoRotate autoRotateSpeed={options.rotation} zoomSpeed={0.05} />
          </>
        )}

        {/* NOTE: Object is at origin. */}
        <PerspectiveCamera makeDefault fov={options.fov} position={[0, 0, options.distance]} zoom={options.zoom} />
        <Particles active={active} options={options} {...props} />
      </Canvas>
    </div>
  );
};

const Particles = ({
  active,
  getValue,
  options: { size, ...options },
}: Specialize<ChaosProps, { options: NonNullable<ChaosProps['options']> }>) => {
  // Set up frame buffer.
  const [scene] = useState(() => new THREE.Scene());
  const [camera] = useState(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 1 / Math.pow(2, 53), 1));
  const [positions] = useState(() => new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0]));
  const [uvs] = useState(() => new Float32Array([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0]));

  // Creates a WebGL Frame Buffer Object (FBO) with dimensions size x size
  // https://drei.docs.pmnd.rs/misc/fbo-use-fbo
  const target = useFBO(size, size, {
    magFilter: THREE.NearestFilter, // Nearest neighbor sampling.
  });

  // Create particles.
  const particles = useMemo(() => {
    const n = size * size;
    const particles = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      particles[i3] = (i % size) / size;
      particles[i3 + 1] = i / size / size;
    }

    return particles;
  }, [size]);

  const renderRef = useRef<any>(undefined);
  const simRef = useRef<any>(undefined);

  // Pause if options changed.
  // TODO(burdon): Pause if re-rendering (e.g., due to dragging). Memoize?
  const pause = useRef(false);
  useEffect(() => {
    pause.current = true;
    const t = setTimeout(() => {
      pause.current = false;
    }, 100);

    return () => clearTimeout(t);
  }, [options]);

  // Current curl value.
  const curl = useRef<{ start: number; delay: number; interval: number; initial: number; target: number } | undefined>(
    undefined,
  );

  // Update FBO and point-cloud every frame.
  // https://r3f.docs.pmnd.rs/api/hooks#useframe
  useFrame(({ gl, clock }, delta) => {
    gl.setRenderTarget(target);
    if (!active || delta > 0.03) {
      return;
    }

    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);

    invariant(renderRef.current);
    const render = renderRef.current;
    render.uniforms.positions.value = target.texture;
    render.uniforms.uTime.value = clock.elapsedTime;
    render.uniforms.uFocus.value = THREE.MathUtils.lerp(
      render.uniforms.uFocus.value,
      options.distance + options.focus,
      0.1,
    );
    render.uniforms.uFov.value = THREE.MathUtils.lerp(render.uniforms.uFov.value, options.fov, 0.1);
    render.uniforms.uBlur.value = THREE.MathUtils.lerp(render.uniforms.uBlur.value, (5.6 - options.aperture) * 9, 0.1);

    invariant(simRef.current);
    const sim = simRef.current;
    sim.uniforms.uTime.value = clock.elapsedTime * options.speed;
    const perturbation = options.gain * (getValue?.() ?? 0);
    sim.uniforms.uPerturbation.value = 0.0; // perturbation;
    if (perturbation > 0.1) {
      const target = 0.01;
      if (curl.current?.target !== target) {
        curl.current = {
          start: clock.elapsedTime,
          delay: 0,
          interval: 1,
          initial: sim.uniforms.uCurl.value,
          target,
        };
      }
    } else {
      // Start to decay after a while.
      if (curl.current && curl.current.target !== options.curl) {
        curl.current = {
          start: clock.elapsedTime,
          delay: 3,
          interval: 3,
          initial: sim.uniforms.uCurl.value,
          target: options.curl,
        };
      }
    }

    // Interpolate curl over time.
    if (curl.current) {
      const { start, delay, interval, initial, target } = curl.current;
      const t = Math.max(0, clock.elapsedTime - (start + delay)) / interval;
      sim.uniforms.uCurl.value = THREE.MathUtils.lerp(initial, target, t);
      if (t >= 1) {
        curl.current = undefined;
        log.info('done', { t });
      }
    } else {
      sim.uniforms.uCurl.value = options.curl;
    }
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

      {/* The simulation buffer is forwarded into a point-cloud represented as a data-texture. */}
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
