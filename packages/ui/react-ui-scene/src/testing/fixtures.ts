//
// Copyright 2026 DXOS.org
//

import { createTimeline, setKey } from '@dxos/animation';
import { Dsl } from '@dxos/diagram';
import { CONSTRAINED_GRID, type EditorShot, constrainedPlacement } from '@dxos/react-ui-canvas';
import { between } from '@dxos/react-ui-canvas/headless';
import { type Layer, type Scene, applyIntent } from '@dxos/scene';

const background: Layer = { id: 'background', name: 'Background', z: between() };
const diagram: Layer = { id: 'diagram', name: 'Diagram', z: between(background.z) };
const LAYERS = { background, diagram };

/**
 * Two layers, two named styles and the parts a story needs in each dimension: placed objects, a style reference and a
 * link, so every inspector has rows and Properties has fields.
 */
const withExtras = (
  document: Scene.SceneDocument,
  styles: { layout: Readonly<Record<string, string>>; model: Readonly<Record<string, object>> },
): Scene.SceneDocument => ({
  ...document,
  layouts: document.layouts.map((layout) =>
    layout.dim === '2d'
      ? {
          ...layout,
          layers: LAYERS,
          elements: Object.fromEntries(
            Object.entries(layout.elements).map(([id, element]) => [
              id,
              styles.layout[id] ? { ...element, style: styles.layout[id] } : element,
            ]),
          ),
        }
      : {
          ...layout,
          layers: LAYERS,
          elements: Object.fromEntries(
            Object.entries(layout.elements).map(([id, element]) => [
              id,
              styles.layout[id] ? { ...element, style: styles.layout[id] } : element,
            ]),
          ),
        },
  ),
  models: document.models.map((model) => ({ ...model, styles: { ...model.styles, ...styles.model } })),
});

/** A 2D board: three shapes on the diagram layer, a note on the background, two links and two named styles. */
export const DOCUMENT_2D: Scene.SceneDocument = withExtras(
  Dsl.readScenes(`scene board dim=2d layout=board name="Board" theme=flat {
  camera center=256,64 zoom=1
}

layout board dim=2d model=shapes {
  element a box "A" @ 0,0 layer=diagram
  element b box "B" @ 256,0 layer=diagram
  element c box "C" @ 512,0 layer=diagram
  element note rect "Note" @ 256,192 size=384x64 hue=neutral surface=tint layer=background
  element ab link from=a to=b end=arrow
  element bc link from=b to=c end=arrow
}

model shapes dim=2d {
  object box rect size=128x128 surface=solid border=true rounded=true
}
`).document,
  {
    layout: { a: 'primary', b: 'accent', c: 'primary' },
    model: {
      primary: { name: 'Primary', hue: 'blue', surface: 'solid' },
      accent: { name: 'Accent', hue: 'amber', surface: 'solid' },
    },
  },
);

/** A 3D cluster: a hub and four spokes placed from the model, linked, with two named materials. */
export const DOCUMENT_3D: Scene.SceneDocument = withExtras(
  Dsl.readScenes(`scene cluster dim=3d layout=cluster name="Cluster" theme=cad {
  camera target=0,0,0 yaw=-45 pitch=30 distance=12 fov=0.8 projection=perspective
}

layout cluster dim=3d model=nodes {
  element hub hub "Hub" @ 0,0.6,0 layer=diagram
  element s1 spoke "S1" @ 3,0.3,0 layer=diagram
  element s2 spoke "S2" @ 0,0.3,3 layer=diagram
  element s3 spoke "S3" @ -3,0.3,0 layer=diagram
  element base cube "Base" @ 0,-0.25,0 scale=8x0.5x8 layer=background
  element l1 link from=hub to=s1
  element l2 link from=hub to=s2
  element l3 link from=hub to=s3
}

model nodes dim=3d {
  object hub sphere scale=1.2 surface=solid
  object spoke sphere scale=0.6 surface=solid
}
`).document,
  {
    layout: { hub: 'brass', s1: 'steel', s2: 'steel', s3: 'steel' },
    model: {
      brass: { name: 'Brass', hue: 'amber', surface: 'solid', metalness: 0.8, roughness: 0.3 },
      steel: { name: 'Steel', hue: 'blue', surface: 'solid', metalness: 0.6, roughness: 0.4 },
    },
  },
);

const modeShape = (id: string, label: string, center: { x: number; y: number }): Scene.Element2D => ({
  id,
  type: 'rect',
  label,
  center,
  size: { width: 256, height: 128 },
});

/** A link between two shapes; a `smart` one routes along the lattice's gutters, which a canvas link type selects. */
const modeLink = (id: string, from: string, to: string, smart = false): Scene.Element2D => ({
  id,
  type: 'link',
  source: { node: from },
  target: { node: to },
  ...(smart ? { z: 'a9', props: { canvas: { type: 'smart' } } } : {}),
});

/** A 2D layout in a mode of its own, as the root of a one-scene document. */
const modeDocument = (layout: Omit<Scene.LayoutRecord2D, 'id' | 'dim'>): Scene.SceneDocument => ({
  scenes: [{ id: 'mode', dim: '2d', layout: 'mode', theme: 'flat', camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
  layouts: [{ id: 'mode', dim: '2d', ...layout }],
  models: [],
});

/** Lattice mode: three shapes on whole cells of a 256x128 lattice with 128x64 gutters, A smart-linked to B and C. */
export const LATTICE_2D: Scene.SceneDocument = modeDocument({
  lattice: { width: 256, height: 128, gutterX: 128, gutterY: 64 },
  elements: {
    a: modeShape('a', 'A', { x: 0, y: 0 }),
    b: modeShape('b', 'B', { x: 384, y: 0 }),
    c: modeShape('c', 'C', { x: 0, y: 192 }),
    ab: modeLink('ab', 'a', 'b', true),
    ac: modeLink('ac', 'a', 'c', true),
  },
});

/** Dynamic mode: a small tree whose shapes the layout engine places in rows along its links. */
export const DYNAMIC_2D: Scene.SceneDocument = modeDocument({
  arrange: { kind: 'dynamic' },
  elements: {
    root: modeShape('root', 'Root', { x: 0, y: 0 }),
    left: modeShape('left', 'Left', { x: -256, y: 192 }),
    right: modeShape('right', 'Right', { x: 256, y: 192 }),
    leaf: modeShape('leaf', 'Leaf', { x: -256, y: 384 }),
    e1: modeLink('e1', 'root', 'left'),
    e2: modeLink('e2', 'root', 'right'),
    e3: modeLink('e3', 'left', 'leaf'),
  },
});

/** A shape the size of a constrained grid cell; the solver writes its centre. */
const constrainedShape = (id: string, label: string): Scene.Element2D => ({
  ...modeShape(id, label, { x: 0, y: 0 }),
  size: CONSTRAINED_GRID.size,
});

/** The four shapes and their relations, before the solver places them. */
const CONSTRAINED_LAYOUT: Scene.LayoutRecord2D = {
  id: 'mode',
  dim: '2d',
  elements: {
    a: constrainedShape('a', 'A'),
    b: constrainedShape('b', 'B'),
    c: constrainedShape('c', 'C'),
    d: constrainedShape('d', 'D'),
    ab: modeLink('ab', 'a', 'b'),
    ac: modeLink('ac', 'a', 'c'),
    bd: modeLink('bd', 'b', 'd'),
  },
  constraints: [
    { subject: 'b', relation: 'east', object: 'a' },
    { subject: 'b', relation: 'aligned', object: 'a' },
    { subject: 'c', relation: 'south', object: 'a' },
    { subject: 'd', relation: 'south', object: 'b' },
    { subject: 'd', relation: 'east', object: 'c' },
  ],
};

/** Constrained mode: four shapes related east/west, north/south and aligned, where the solver places them. */
export const CONSTRAINED_2D: Scene.SceneDocument = modeDocument(
  applyIntent(CONSTRAINED_LAYOUT, constrainedPlacement(CONSTRAINED_LAYOUT)),
);

/** One 4s shot moving A across the 2D board and back. */
export const SHOTS_2D: readonly EditorShot[] = [
  {
    id: 'shot-1',
    name: 'Slide',
    timeline: [
      { t: 0, value: { x: 0, y: 0 } },
      { t: 2, value: { x: 0, y: -192 } },
      { t: 4, value: { x: 0, y: 0 } },
    ].reduce((timeline, key) => setKey(timeline, 'a', 'center', key), createTimeline(4)),
  },
];

/** One 4s shot lifting the 3D hub and setting it down. */
export const SHOTS_3D: readonly EditorShot[] = [
  {
    id: 'shot-1',
    name: 'Lift',
    timeline: [
      { t: 0, value: { x: 0, y: 0.6, z: 0 } },
      { t: 2, value: { x: 0, y: 3, z: 0 } },
      { t: 4, value: { x: 0, y: 0.6, z: 0 } },
    ].reduce((timeline, key) => setKey(timeline, 'hub', 'center', key), createTimeline(4)),
  },
];
