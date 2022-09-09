//
// Copyright 2020 DXOS.org
//

import { css } from '@emotion/css';
import React, { useEffect, useRef, useState } from 'react';
import useResizeAware from 'react-resize-aware';
import * as THREE from 'three';

import { THREEx } from '../libs';

const config = {
  mesh: {
    // https://threejs.org/docs/#api/en/core/Object3D.lookAt
    orientation: [0.4, 1.2, 0.5],
    scale: {
      x: 3.5,
      y: 3,
      z: 0.2
    },
    multiplyScalar: 10
  },
  camera: {
    fov: 25,
    position: {
      z: 15,
      y: 2
    }
  },
  // https://threejs.org/docs/#api/en/scenes/Fog
  fog: {
    color: 'darkgreen',
    near: 0,
    far: 35
  },
  rotation: {
    z: 0.02
  }
};

const styles = css`
  root: {
    display: 'flex',
    flex: 1
  }
`;

// https://codepen.io/marctannous/pen/RNGjmz
// https://threejs.org/examples/?q=ocean#webgl_shaders_ocean2

export const Waves = () => {
  const [resizeListener, size] = useResizeAware();
  const [renderer] = useState(() => new THREE.WebGLRenderer({ antialias: true }));
  const div = useRef<HTMLDivElement>();

  // Resize.
  useEffect(() => {
    const { width, height } = size;
    if (width && height) {
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }, [size]);

  // Init.
  useEffect(() => {
    // Append.
    div.current.appendChild(renderer.domElement);

    // Camera.
    // TODO(burdon): Change aspect on resize?
    // https://threejs.org/docs/#api/en/cameras/PerspectiveCamera
    const camera = new THREE.PerspectiveCamera(config.camera.fov, window.innerWidth / window.innerHeight, 0.01, 1000);
    Object.assign(camera.position, config.camera.position);

    // Mesh.
    const heightMap = THREEx.Terrain.allocateHeightMap(256, 256);
    THREEx.Terrain.simplexHeightMap(heightMap);

    const geometry = THREEx.Terrain.heightMapToPlaneGeometry(heightMap);
    THREEx.Terrain.heightMapToVertexColor(heightMap, geometry);

    const material = new THREE.MeshBasicMaterial({ wireframe: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.lookAt(new THREE.Vector3(...config.mesh.orientation));
    Object.assign(mesh.scale, config.mesh.scale);
    mesh.scale.multiplyScalar(config.mesh.multiplyScalar);

    // Scene.
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(config.fog.color, config.fog.near, config.fog.far);
    scene.add(mesh);

    // Camera motion.
    const onRenderFcts: any[] = [];
    onRenderFcts.push((delta: number) => {
      mesh.rotation.z += config.rotation.z * delta;
    });
    onRenderFcts.push(() => {
      renderer.render(scene, camera);
    });

    // Animation.
    let lastTime: number = null;
    let frame = requestAnimationFrame((now) => {
      // TODO(wittjosiah): Fix undefined.
      // eslint-disable-next-line
      // @ts-ignore
      frame = requestAnimationFrame(animate);
      lastTime = lastTime || now - 1000 / 60;
      const deltaMsec = Math.min(200, now - lastTime);
      lastTime = now;
      onRenderFcts.forEach((onRenderFct) => {
        onRenderFct(deltaMsec / 1000, now / 1000);
      });
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={div} className={styles}>
      {resizeListener}
    </div>
  );
};

export default Waves;
