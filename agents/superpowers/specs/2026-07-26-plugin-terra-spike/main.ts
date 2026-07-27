//
// Terra spike — Babylon scene. NPR: flat shading, no shadows, matte materials.
//

import '@babylonjs/core/Meshes/thinInstanceMesh';

import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Color4, Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreatePolyhedron } from '@babylonjs/core/Meshes/Builders/polyhedronBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Scene } from '@babylonjs/core/scene';

import { defaultConfig, generatePlanet, palette, type Planet, type Vec3 } from './planet';

const canvas = document.getElementById('app') as HTMLCanvasElement;
const engine = new Engine(canvas, true, { adaptToDeviceRatio: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.043, 0.051, 0.071, 1);

const camera = new ArcRotateCamera('camera', Math.PI * 0.6, Math.PI * 0.42, 6.5, Vector3.Zero(), scene);
camera.attachControl(canvas, true);
camera.wheelPrecision = 40;
camera.lowerRadiusLimit = 2.6;
camera.upperRadiusLimit = 20;
camera.minZ = 0.01;
// Continuous rotation: remove the pole clamps so orbit can pass over the poles.
camera.lowerBetaLimit = null as unknown as number;
camera.upperBetaLimit = null as unknown as number;
camera.allowUpsideDown = true;

// Shift-drag pans the target across the surface (screen-space).
let panning = false;
let lastX = 0;
let lastY = 0;
canvas.addEventListener('pointerdown', (event) => {
  if (event.shiftKey) {
    panning = true;
    lastX = event.clientX;
    lastY = event.clientY;
    camera.detachControl();
  }
});
window.addEventListener('pointerup', () => {
  if (panning) {
    panning = false;
    camera.attachControl(canvas, true);
  }
});
window.addEventListener('pointermove', (event) => {
  if (!panning) {
    return;
  }
  const dx = event.clientX - lastX;
  const dy = event.clientY - lastY;
  lastX = event.clientX;
  lastY = event.clientY;
  const speed = camera.radius * 0.0018;
  const right = camera.getDirection(Vector3.Right());
  const up = camera.getDirection(Vector3.Up());
  camera.target.addInPlace(right.scale(-dx * speed));
  camera.target.addInPlace(up.scale(dy * speed));
});

// Two hemispheric lights (key + subtle fill) for flat ambient, no shadows.
const key = new HemisphericLight('key', new Vector3(0.5, 1, 0.4), scene);
key.intensity = 0.95;
key.groundColor = new Color3(0.35, 0.37, 0.42);
const fill = new HemisphericLight('fill', new Vector3(-0.6, -0.3, -0.7), scene);
fill.intensity = 0.25;

const matte = (name: string): StandardMaterial => {
  const mat = new StandardMaterial(name, scene);
  mat.specularColor = new Color3(0, 0, 0); // NPR: no highlights.
  return mat;
};

const col3 = (c: Vec3, tint = 0): Color3 =>
  new Color3(
    Math.min(1, Math.max(0, c[0] + tint)),
    Math.min(1, Math.max(0, c[1] + tint)),
    Math.min(1, Math.max(0, c[2] + tint)),
  );

let planetMesh: Mesh | null = null;
let waterMesh: Mesh | null = null;
const scatterBases: Mesh[] = [];
let wireframe = false;
let showScatter = true;
let showWater = false; // depth-shaded ocean reads as water; overlay is an optional sheen.

const disposeAll = () => {
  planetMesh?.dispose();
  waterMesh?.dispose();
  scatterBases.forEach((m) => m.dispose());
  scatterBases.length = 0;
};

// Build one low-poly tree/rock base mesh; thin instances are placed onto it.
const makeTreeBase = (variant: number): Mesh => {
  const trunk = CreateCylinder(`trunk${variant}`, { height: 0.5, diameterTop: 0.08, diameterBottom: 0.12 }, scene);
  const canopyH = 0.7 + (variant % 3) * 0.25;
  const canopy = CreateCylinder(
    `canopy${variant}`,
    { height: canopyH, diameterTop: 0, diameterBottom: 0.6 - (variant % 2) * 0.15, tessellation: 6 },
    scene,
  );
  canopy.position.y = 0.35 + canopyH / 2;
  trunk.position.y = 0.25;
  const merged = Mesh.MergeMeshes([trunk, canopy], true, true, undefined, false, false)!;
  merged.name = `tree${variant}`;
  merged.convertToFlatShadedMesh();
  const mat = matte(`treeMat${variant}`);
  mat.diffuseColor = col3(variant % 2 ? palette.forest : palette.grass, -0.05 + (variant % 3) * 0.03);
  merged.material = mat;
  merged.isVisible = false;
  return merged;
};

const makeRockBase = (variant: number): Mesh => {
  const rock = CreatePolyhedron(`rock${variant}`, { type: variant % 4, size: 0.18 }, scene);
  rock.convertToFlatShadedMesh();
  const mat = matte(`rockMat${variant}`);
  mat.diffuseColor = col3(palette.rock, -0.05 + (variant % 3) * 0.04);
  rock.material = mat;
  rock.isVisible = false;
  return rock;
};

const orient = (position: Vec3, normal: Vec3, scaleV: number): Matrix => {
  const up = new Vector3(normal[0], normal[1], normal[2]);
  const q = new Quaternion();
  Quaternion.FromUnitVectorsToRef(Vector3.Up(), up, q);
  return Matrix.Compose(new Vector3(scaleV, scaleV, scaleV), q, new Vector3(position[0], position[1], position[2]));
};

const buildScatter = (planet: Planet) => {
  const trees = new Map<number, Matrix[]>();
  const rocks = new Map<number, Matrix[]>();
  for (const s of planet.scatter) {
    const bucket = s.type === 'tree' ? trees : rocks;
    const arr = bucket.get(s.variant) ?? bucket.set(s.variant, []).get(s.variant)!;
    // Sink base slightly into the surface.
    const pos: Vec3 = [
      s.position[0] - s.normal[0] * 0.05,
      s.position[1] - s.normal[1] * 0.05,
      s.position[2] - s.normal[2] * 0.05,
    ];
    arr.push(orient(pos, s.normal, s.scale * (s.type === 'tree' ? 0.05 : 0.06)));
  }
  const emit = (map: Map<number, Matrix[]>, make: (v: number) => Mesh) => {
    for (const [variant, mats] of map) {
      const base = make(variant);
      const buffer = new Float32Array(mats.length * 16);
      mats.forEach((m, idx) => m.copyToArray(buffer, idx * 16));
      base.thinInstanceSetBuffer('matrix', buffer, 16, true);
      base.isVisible = showScatter;
      scatterBases.push(base);
    }
  };
  emit(trees, makeTreeBase);
  emit(rocks, makeRockBase);
};

let currentSeed = 'terra-1';
let currentResolution = defaultConfig().resolution;

const build = () => {
  disposeAll();
  const config = { ...defaultConfig(currentSeed), resolution: currentResolution };
  const planet = generatePlanet(config);

  const mesh = new Mesh('planet', scene);
  const vd = new VertexData();
  vd.positions = planet.mesh.positions as unknown as number[];
  vd.normals = planet.mesh.normals as unknown as number[];
  vd.colors = planet.mesh.colors as unknown as number[];
  // Babylon is left-handed by default; the generator's right-handed winding reads as
  // back-facing, so reverse each triangle's winding to make outer faces front-facing.
  const triCount = planet.mesh.positions.length / 9;
  const indices = new Array<number>(triCount * 3);
  for (let tri = 0; tri < triCount; tri++) {
    indices[tri * 3] = tri * 3;
    indices[tri * 3 + 1] = tri * 3 + 2;
    indices[tri * 3 + 2] = tri * 3 + 1;
  }
  vd.indices = indices;
  vd.applyToMesh(mesh);
  const mat = matte('planetMat');
  mat.diffuseColor = new Color3(1, 1, 1);
  mat.useVertexColor = true;
  (mat as any).emissiveColor = new Color3(0, 0, 0);
  mesh.material = mat;
  mesh.useVertexColors = true;
  planetMesh = mesh;

  const water = CreateSphere('water', { diameter: planet.seaRadius * 2.002, segments: 64 }, scene);
  const waterMat = matte('waterMat');
  waterMat.diffuseColor = new Color3(0.18, 0.4, 0.55);
  waterMat.alpha = 0.4;
  // Depth pre-pass so the translucent sheen occludes the far hemisphere/interior
  // instead of letting geometry behind it bleed through (the "see-through planet").
  waterMat.needDepthPrePass = true;
  water.material = waterMat;
  water.setEnabled(showWater);
  waterMesh = water;

  buildScatter(planet);

  wireframe && applyWireframe();
  (document.getElementById('seedLabel') as HTMLElement).textContent = `seed: ${currentSeed}`;
  (document.getElementById('resLabel') as HTMLElement).textContent =
    `${currentResolution}² · ${(planet.mesh.positions.length / 9 / 1000).toFixed(0)}k tris`;
  console.log(
    `[terra] res=${currentResolution} tris=${planet.mesh.positions.length / 9} scatter=${planet.scatter.length}`,
  );
};

const applyWireframe = () => {
  if (planetMesh?.material) (planetMesh.material as StandardMaterial).wireframe = wireframe;
};

let seedN = 1;
const resInput = document.getElementById('resolution') as HTMLInputElement;
resInput.value = String(currentResolution);
build();

document.getElementById('reseed')!.addEventListener('click', () => {
  currentSeed = `terra-${++seedN}`;
  build();
});
resInput.addEventListener('change', () => {
  currentResolution = Number(resInput.value);
  build();
});
document.getElementById('toggleWire')!.addEventListener('click', () => {
  wireframe = !wireframe;
  applyWireframe();
});
document.getElementById('toggleScatter')!.addEventListener('click', () => {
  showScatter = !showScatter;
  scatterBases.forEach((m) => (m.isVisible = showScatter));
});
document.getElementById('toggleWater')!.addEventListener('click', () => {
  showWater = !showWater;
  waterMesh?.setEnabled(showWater);
});

(window as any).__terra = { scene, camera, engine };

engine.runRenderLoop(() => scene.render());
window.addEventListener('resize', () => engine.resize());
