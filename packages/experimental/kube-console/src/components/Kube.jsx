//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import * as THREE from 'three';

import { mx } from '@dxos/react-components';

export const defaultConfig = {
  radius: 800,
  minDistance: 150,
  particleCount: 400,
  maxParticleCount: 600,
  maxConnections: 5, // TODO(burdon): No effect.
  limitConnections: false,
  showLines: true,
  rotation: -0.0003, // Angular velocity.
  mask: {
    color: 0x000000,
    opacity: 0
  },
  frame: {
    color: 0xaa0044
  },
  node: {
    color: '#ccc',
    size: 1
  },
  camera: {
    perspective: 45,
    z: 1750
  }
};

/**
 * Based on THREE.js examples:
 * https://threejs.org/examples/?q=webgl#webgl_buffergeometry_drawrange
 * https://github.com/mrdoob/three.js/blob/master/examples/webgl_buffergeometry_drawrange.html
 */
class KubeRenderer {
  _config;
  _group;
  _particlesData = [];
  _camera;
  _scene;
  _renderer;
  _positions;
  _colors;
  _particles;
  _pointCloud;
  _particlePositions;
  _linesMesh;
  _running = false;

  constructor(config) {
    this._config = config;
  }

  init(container) {
    const { maxParticleCount, particleCount, radius } = this._config;

    this._camera = new THREE.PerspectiveCamera(
      this._config.camera.perspective,
      window.innerWidth / window.innerHeight,
      1,
      4000
    );
    this._camera.position.z = this._config.camera.z;

    this._group = new THREE.Group();
    this._scene = new THREE.Scene();
    this._scene.add(this._group);

    const helper = new THREE.BoxHelper(new THREE.Mesh(new THREE.BoxGeometry(radius, radius, radius)));
    helper.material.color.setHex(this._config.frame.color); // Frame color.
    helper.material.blending = THREE.AdditiveBlending;
    helper.material.transparent = true;
    this._group.add(helper);

    const segments = maxParticleCount * maxParticleCount;
    this._positions = new Float32Array(segments * 3);
    this._colors = new Float32Array(segments * 3);

    const pMaterial = new THREE.PointsMaterial({
      size: this._config.node.size,
      color: this._config.node.color,
      blending: THREE.AdditiveBlending,
      transparent: true
    });

    this._particles = new THREE.BufferGeometry();
    this._particlePositions = new Float32Array(maxParticleCount * 3);

    for (let i = 0; i < maxParticleCount; i++) {
      const x = Math.random() * radius - radius / 2;
      const y = Math.random() * radius - radius / 2;
      const z = Math.random() * radius - radius / 2;

      this._particlePositions[i * 3] = x;
      this._particlePositions[i * 3 + 1] = y;
      this._particlePositions[i * 3 + 2] = z;

      this._particlesData.push({
        velocity: new THREE.Vector3(-1 + Math.random() * 2, -1 + Math.random() * 2, -1 + Math.random() * 2),
        numConnections: 0
      });
    }

    this._particles.setDrawRange(0, particleCount);
    this._particles.setAttribute(
      'position',
      new THREE.BufferAttribute(this._particlePositions, 3).setUsage(THREE.DynamicDrawUsage)
    );

    this._pointCloud = new THREE.Points(this._particles, pMaterial);
    this._group.add(this._pointCloud);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this._positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(this._colors, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.computeBoundingSphere(this._clearColor);
    geometry.setDrawRange(0, 0);

    const material = new THREE.LineBasicMaterial({
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      transparent: true
    });

    this._linesMesh = new THREE.LineSegments(geometry, material);
    this._group.add(this._linesMesh);

    this._renderer = new THREE.WebGLRenderer({ antialias: true });
    this._renderer.setClearColor(this._config.mask.color, this._config.mask.opacity);
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.outputEncoding = THREE.sRGBEncoding;

    container.appendChild(this._renderer.domElement);
    return this;
  }

  setSize(width, height) {
    this._camera.aspect = width / height;
    this._camera.updateProjectionMatrix();

    this._renderer.setSize(width, height);
  }

  animate() {
    const { particleCount, radius, showLines, limitConnections, maxConnections, minDistance } = this._config;

    let vertexpos = 0;
    let colorpos = 0;
    let numConnected = 0;

    for (let i = 0; i < particleCount; i++) {
      this._particlesData[i].numConnections = 0;
    }

    for (let i = 0; i < particleCount; i++) {
      const particleData = this._particlesData[i];

      this._particlePositions[i * 3] += particleData.velocity.x;
      this._particlePositions[i * 3 + 1] += particleData.velocity.y;
      this._particlePositions[i * 3 + 2] += particleData.velocity.z;

      const rHalf = radius / 2;

      if (this._particlePositions[i * 3 + 1] < -rHalf || this._particlePositions[i * 3 + 1] > rHalf) {
        particleData.velocity.y = -particleData.velocity.y;
      }

      if (this._particlePositions[i * 3] < -rHalf || this._particlePositions[i * 3] > rHalf) {
        particleData.velocity.x = -particleData.velocity.x;
      }

      if (this._particlePositions[i * 3 + 2] < -rHalf || this._particlePositions[i * 3 + 2] > rHalf) {
        particleData.velocity.z = -particleData.velocity.z;
      }

      if (limitConnections && particleData.numConnections >= maxConnections) {
        continue;
      }

      // Check collision.
      for (let j = i + 1; j < particleCount; j++) {
        const particleDataB = this._particlesData[j];
        if (limitConnections && particleDataB.numConnections >= maxConnections) {
          continue;
        }

        const dx = this._particlePositions[i * 3] - this._particlePositions[j * 3];
        const dy = this._particlePositions[i * 3 + 1] - this._particlePositions[j * 3 + 1];
        const dz = this._particlePositions[i * 3 + 2] - this._particlePositions[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < minDistance) {
          particleData.numConnections++;
          particleDataB.numConnections++;

          const alpha = 1 - dist / minDistance;

          this._positions[vertexpos++] = this._particlePositions[i * 3];
          this._positions[vertexpos++] = this._particlePositions[i * 3 + 1];
          this._positions[vertexpos++] = this._particlePositions[i * 3 + 2];

          this._positions[vertexpos++] = this._particlePositions[j * 3];
          this._positions[vertexpos++] = this._particlePositions[j * 3 + 1];
          this._positions[vertexpos++] = this._particlePositions[j * 3 + 2];

          this._colors[colorpos++] = alpha;
          this._colors[colorpos++] = alpha;
          this._colors[colorpos++] = alpha;

          this._colors[colorpos++] = alpha;
          this._colors[colorpos++] = alpha;
          this._colors[colorpos++] = alpha;

          numConnected++;
        }
      }
    }

    if (showLines) {
      this._linesMesh.geometry.setDrawRange(0, numConnected * 2);
      this._linesMesh.geometry.attributes.position.needsUpdate = true;
      this._linesMesh.geometry.attributes.color.needsUpdate = true;
    }

    this._pointCloud.geometry.attributes.position.needsUpdate = true;

    this.render();
    return this;
  }

  render() {
    const time = Date.now();
    this._group.rotation.y = Math.PI / 4 + time * this._config.rotation;
    this._renderer.render(this._scene, this._camera);
    return this;
  }

  start() {
    this._running = true;
    const render = () => {
      this.animate();
      if (this._running) {
        requestAnimationFrame(render);
      }
    };

    render();
    return this;
  }

  stop() {
    this._running = false;
    return this;
  }
}

export const Kube = ({ config = {} }) => {
  const { ref, width = 0, height = 0 } = useResizeDetector({ refreshRate: 100 });
  const [kube, setKube] = useState(null);

  useEffect(() => {
    const kube = new KubeRenderer(Object.assign({}, defaultConfig, config)).init(ref.current).start();
    setKube(kube);
    return () => kube.stop();
  }, []);

  useEffect(() => {
    if (kube && width && height) {
      kube.setSize(width, height);
    }
  }, [width, height]);

  return (
    <div
      className={mx(
        'flex flex-1 overflow-hidden opacity-0 transition duration-[1s]',
        width === 0 || height === 0 ? 'invisible' : 'opacity-100'
      )}
      ref={ref}
    />
  );
};
