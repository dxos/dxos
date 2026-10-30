//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type ComponentType } from 'react';

import {
  type Camera,
  CanvasPropertiesForm,
  type CanvasPropertiesProps,
  type CanvasServices,
  CanvasServicesProvider,
  type ConstrainIntent,
  type DimensionConfig,
  MAX_ZOOM,
  type PropertyFormProps,
  createPropertyForm,
  defaultThemeRegistry,
  fitBounds,
  latticeConstrain,
  zoomAt,
} from '@dxos/react-ui-canvas';
import { DEFAULT_GRID, MAJOR_GRID, Scene, findLayout, resolveLayout2D } from '@dxos/scene';

import { type CanvasBridge, createCanvasBridge, useBridgedCanvas } from './canvas-bridge.tsx';
import {
  ELEMENT_FORM_2D_FIELDS,
  ELEMENT_FORM_2D_OVERRIDES,
  ElementForm2D,
  elementForm2DIntents,
  elementForm2DValues,
} from './element-form2d.ts';
import { toolDragData2D, tools2D } from './tools2d.ts';
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

/** What the host adds to the 2D Properties form (its database, reference options, per-selection overrides). */
export type UseProperties2D = (canvas: CanvasServices | undefined) => CanvasPropertiesProps;

/**
 * The 2D Properties form: the canvas's own form over the selection's types (ports, link ends, line type, a frame's
 * object and role, …) while the viewport is mounted; the centre/size form until it is.
 */
const createPropertyForm2D = (
  bridge: CanvasBridge,
  useProperties?: UseProperties2D,
): ComponentType<PropertyFormProps> => {
  const Properties2D = (props: PropertyFormProps) => {
    const canvas = useBridgedCanvas(bridge);
    const host = useProperties?.(canvas) ?? {};
    return canvas ? (
      <CanvasServicesProvider {...canvas}>
        <CanvasPropertiesForm {...host} />
      </CanvasServicesProvider>
    ) : (
      <PropertyForm2D {...props} />
    );
  };
  Properties2D.displayName = 'Properties2D';
  return Properties2D;
};

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

/** A 2D layout's mode, from its own fields: a lattice snaps every frame onto its cells while snapping is on. */
export const constrain2D: ConstrainIntent = (layout, intent, { snap }) =>
  layout.dim === '2d' && layout.lattice && snap ? latticeConstrain(layout, intent) : intent;

/**
 * The 2D editor's config: react-ui-canvas's engine as the viewport, the canvas palette's tools, steps on the grid, the
 * canvas themes as looks and a centre/size/rotation form. A host passes its node types, mode and generators.
 */
export const createConfig2D = ({
  useProperties,
  ...options
}: Viewport2DOptions & { useProperties?: UseProperties2D } = {}): DimensionConfig<Camera> => {
  const bridge = options.bridge ?? createCanvasBridge();
  // A host's own projection owns the canvas's mode, so the layout's fields are not applied over it.
  const constrain = options.createProjection ? undefined : constrain2D;
  return {
    dim: '2d',
    viewport: createViewport2D({ ...options, bridge, constrain }),
    tools: tools2D(options.nodes),
    toolDragData: toolDragData2D,
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
      reset: (authored, document, layout, size) => {
        const bounds = layoutBounds(document, layout);
        if (!bounds || size.width <= 0) {
          return authored;
        }
        const { zoom } = authored;
        return {
          zoom,
          x: size.width / (2 * zoom) - (bounds.x + bounds.width / 2),
          y: size.height / (2 * zoom) - (bounds.y + bounds.height / 2),
        };
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
    propertyForm: createPropertyForm2D(bridge, useProperties),
    propertyFormSelection: true,
    constrain,
  };
};

/** The 2D config with the default node types. */
export const config2d = createConfig2D();
