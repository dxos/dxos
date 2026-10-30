//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import {
  type Camera,
  type DimensionConfig,
  MAX_ZOOM,
  createPropertyForm,
  defaultThemeRegistry,
  fitBounds,
  zoomAt,
} from '@dxos/react-ui-canvas';
import { DEFAULT_GRID, MAJOR_GRID, Scene, findLayout, resolveLayout2D } from '@dxos/scene';

import {
  ELEMENT_FORM_2D_FIELDS,
  ELEMENT_FORM_2D_OVERRIDES,
  ElementForm2D,
  elementForm2DIntents,
  elementForm2DValues,
} from './element-form2d.ts';
import { tools2D } from './tools2d.ts';
import { type Viewport2DOptions, createViewport2D } from './Viewport2D.tsx';

const isElement2D = Schema.is(Scene.Element2D);

/** The 2D Properties form: centre and size side by side, rotation, then label, layer and style. */
const PropertyForm2D = createPropertyForm({
  schema: ElementForm2D,
  fields: ELEMENT_FORM_2D_FIELDS,
  overrides: ELEMENT_FORM_2D_OVERRIDES,
  accepts: (element): element is Scene.Element2D => isElement2D(element),
  values: elementForm2DValues,
  intents: elementForm2DIntents,
});

/** A fit leaves this much room around the drawing, in scene px. */
const FIT_INSET = MAJOR_GRID;

/** The bounds of a 2D layout's elements, or undefined when it has none with a frame. */
const layoutBounds = (document: Scene.SceneDocument, layout: string) => {
  const record = findLayout(document, layout);
  if (record?.dim !== '2d') {
    return undefined;
  }
  const frames = Object.values(resolveLayout2D(document, record)).flatMap((element) =>
    element.center && element.size ? [{ center: element.center, size: element.size }] : [],
  );
  if (frames.length === 0) {
    return undefined;
  }
  const left = Math.min(...frames.map(({ center, size }) => center.x - size.width / 2));
  const top = Math.min(...frames.map(({ center, size }) => center.y - size.height / 2));
  const right = Math.max(...frames.map(({ center, size }) => center.x + size.width / 2));
  const bottom = Math.max(...frames.map(({ center, size }) => center.y + size.height / 2));
  return { x: left, y: top, width: right - left, height: bottom - top };
};

/**
 * The 2D editor's config: react-ui-canvas's engine as the viewport, the canvas palette's tools, steps on the grid, the
 * canvas themes as looks and a centre/size/rotation form. A host passes its node types, mode and generators.
 */
export const createConfig2D = (options: Viewport2DOptions = {}): DimensionConfig<Camera> => ({
  dim: '2d',
  viewport: createViewport2D(options),
  tools: tools2D(options.nodes),
  geometry: {
    // One major cell aside per paste, as the canvas has always offset a duplicate.
    pasteOffset: (pasted) => ({ x: pasted * MAJOR_GRID, y: pasted * MAJOR_GRID }),
    snap: { move: DEFAULT_GRID, rotate: 15 },
  },
  camera: {
    fit: (camera, document, layout, size) => {
      const bounds = layoutBounds(document, layout);
      return bounds && size.width > 0 ? fitBounds(bounds, size, FIT_INSET, 1) : camera;
    },
    // About the view's centre, as the camera bar's buttons zoom.
    zoom: (camera, factor) => zoomAt(camera, { x: 0, y: 0 }, Math.min(MAX_ZOOM, camera.zoom / factor)),
    percent: (camera, authored) => Math.round((camera.zoom / authored.zoom) * 100),
  },
  display: {
    themes: Object.values(defaultThemeRegistry.themes).map(({ id, name }) => ({ id, label: name })),
    grids: ['lines'],
    guides: true,
  },
  propertyForm: PropertyForm2D,
});

/** The 2D config with the default node types. */
export const config2d = createConfig2D();
