//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { type LibraryItem } from '@dxos/react-ui-canvas-editor';
import { type Scene } from '@dxos/scene';

import { CanvasCapabilities } from '#types';

/** The contributed library objects for canvases of one dimension, as the editor's library tool offers them. */
export const useCanvasLibrary = (dim: Scene.Dimension): readonly LibraryItem[] => {
  const contributed = Hooks.useCapabilities(CanvasCapabilities.LibraryItem);
  return useMemo(() => contributed.filter((item) => item.dim === dim), [contributed, dim]);
};
