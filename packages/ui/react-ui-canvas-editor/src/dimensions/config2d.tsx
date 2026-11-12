//
// Copyright 2026 DXOS.org
//

import React, { type ComponentType } from 'react';

import {
  type Camera,
  type CanvasServices,
  constrain2D,
  defaultThemeRegistry,
  useCanvasServices,
} from '@dxos/react-ui-canvas';
import { DEFAULT_GRID, MAJOR_GRID } from '@dxos/scene';

import { CanvasPropertiesForm, type CanvasPropertiesProps } from '../components/index.ts';
import { type DimensionConfig, type LibraryItem, type PropertyFormProps } from '../editor/index.ts';
import { type Dimension2DOptions, createDimension2D } from './dimension2d.tsx';
import { toolDragData2D, tools2D, typeIcons2D } from './tools2d.ts';

/** What the host adds to the 2D Properties form (its database, reference options, per-selection overrides). */
export type UseProperties2D = (canvas: CanvasServices) => CanvasPropertiesProps;

/** The 2D Properties form: the canvas's own form over the selection's types (ports, link ends, line type, a frame's object and role, …). */
const createPropertyForm2D = (useProperties?: UseProperties2D): ComponentType<PropertyFormProps> => {
  const Properties2D = () => {
    const canvas = useCanvasServices('Properties2D');
    const host = useProperties?.(canvas) ?? {};
    return <CanvasPropertiesForm {...host} />;
  };
  Properties2D.displayName = 'Properties2D';
  return Properties2D;
};

/**
 * The 2D editor's config: react-ui-canvas's engine as the dimension, the canvas palette's tools, steps on the grid, the
 * canvas themes as looks and the canvas's own Properties form. A host passes its node types, mode and generators.
 */
export const createConfig2D = ({
  useProperties,
  library,
  ...options
}: Dimension2DOptions & {
  useProperties?: UseProperties2D;
  /** The host's library objects, as the rail's library tool offers them; none yet in 2D. */
  library?: readonly LibraryItem[];
} = {}): DimensionConfig<Camera> => {
  const constrain = options.constrain ?? constrain2D;
  return {
    dim: '2d',
    create: createDimension2D({ ...options, constrain }),
    tools: tools2D(options.nodes),
    icons: typeIcons2D(options.nodes),
    library,
    toolDragData: toolDragData2D,
    geometry: {
      // One major cell aside per paste, as the canvas has always offset a duplicate.
      pasteOffset: (pasted) => ({ x: pasted * MAJOR_GRID, y: pasted * MAJOR_GRID }),
      snap: { move: DEFAULT_GRID, rotate: 15 },
    },
    display: {
      themes: Object.values(defaultThemeRegistry.themes).map(({ id, name, mode }) => ({
        id,
        label: name,
        ...(mode ? { mode } : {}),
      })),
      registry: defaultThemeRegistry,
      grids: ['lines', 'dots'],
      guides: true,
    },
    propertyForm: createPropertyForm2D(useProperties),
    propertyFormSelection: true,
    constrain,
  };
};

/** The 2D config with the default node types. */
export const config2d = createConfig2D();
