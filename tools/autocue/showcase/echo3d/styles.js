//
// Copyright 2026 DXOS.org
//

// Rendering styles: how a node is drawn, separate from where it is (layout.js) and whether it shows (views.js).
// A style maps a node to a visual: { object, materials, baseOpacity }. A view picks its style by name.

import * as THREE from 'three';

// A dashed circle in the ground plane, for the orbit the ring's spheres sit on.
const dashedRing = (spec) => {
  const points = Array.from({ length: 256 }, (_, index) => {
    const angle = (index / 256) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * spec.size, 0, Math.sin(angle) * spec.size);
  });
  const material = new THREE.LineDashedMaterial({ color: spec.color, dashSize: 0.6, gapSize: 0.45, transparent: true });
  const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), material);
  line.computeLineDistances();
  return { object: line, materials: [material], baseOpacity: [0.95] };
};

// A bright rim where the surface turns away from the viewer (a Fresnel edge), so a faint shell reads as a glass ball.
const rimMaterial = (color) =>
  new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 1 } },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float rim = pow(1.0 - abs(dot(vNormal, vView)), 3.0);
        // A pixel of noise, so the rim's long, faint falloff dithers instead of banding.
        float noise = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
        gl_FragColor = vec4(mix(uColor, vec3(1.0), 0.35), rim * uOpacity + noise / 255.0);
      }
    `,
    transparent: true,
    depthWrite: false,
  });

// A shaded sphere; below full opacity it is a see-through glass shell (with a rim), so the spheres nested inside stay
// visible and the shell still reads as a ball.
const shadedSphere = (spec, opacity) => {
  // Dithered, so the smooth shading across a large sphere does not band into visible steps in 8-bit colour.
  const material = new THREE.MeshStandardMaterial({
    color: spec.color,
    roughness: 0.6,
    transparent: true,
    dithering: true,
  });
  const geometry = new THREE.SphereGeometry(spec.size, 64, 32);
  const mesh = new THREE.Mesh(geometry, material);
  if (opacity >= 1) {
    return { object: mesh, materials: [material], baseOpacity: [opacity] };
  }
  const rim = rimMaterial(spec.color);
  const group = new THREE.Group();
  group.add(mesh, new THREE.Mesh(geometry, rim));
  const materials = [material, rim];
  // `rim` overrides the rim's strength for one shell.
  const baseOpacity = [opacity, spec.rim ?? RIM_STRENGTH];
  // `backOpacity` makes the far half of the shell near-solid: whatever lies behind the sphere is hidden, while what is
  // inside it (in front of that far wall) still shows through the clear near half.
  if (spec.backOpacity) {
    const back = new THREE.MeshStandardMaterial({
      // Much darker than the shell's colour, so the far wall reads as depth rather than a lit surface.
      color: new THREE.Color(spec.color).multiplyScalar(BACK_SHADE),
      roughness: 0.6,
      dithering: true,
      transparent: true,
      side: THREE.BackSide,
    });
    const backMesh = new THREE.Mesh(geometry, back);
    // Drawn before the rest of the scene's see-through surfaces, so the near half and the rim layer over it.
    backMesh.renderOrder = -2;
    group.add(backMesh);
    materials.push(back);
    baseOpacity.push(spec.backOpacity);
  }
  // `wire` overlays a light geodesic lattice, so the shell's curvature reads in 3D.
  if (spec.wire) {
    // In the shell's own colour, much darkened, so the lattice gives depth without lighting the sphere up.
    const lattice = new THREE.LineBasicMaterial({
      color: new THREE.Color(spec.color).multiplyScalar(WIRE_SHADE),
      transparent: true,
      depthWrite: false,
    });
    group.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(spec.size, 3)), lattice));
    materials.push(lattice);
    baseOpacity.push(spec.wire);
  }
  return { object: group, materials, baseOpacity };
};

const RIM_STRENGTH = 0.9;
const BACK_SHADE = 0.1;
const WIRE_SHADE = 0.45;

// Containers default to a faint shell, since everything else is drawn inside them.
const CONTAINER_OPACITY = 0.18;

export const styles = {
  // Every node is a regular shaded sphere.
  plain: (spec) => {
    if (spec.kind === 'ring') {
      return dashedRing(spec);
    }
    return shadedSphere(spec, spec.opacity ?? (spec.kind === 'container' ? CONTAINER_OPACITY : 1));
  },
};

export const DEFAULT_STYLE = 'plain';
