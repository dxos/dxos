//
// Copyright 2025 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';
import { type ShapeRegistry } from '@dxos/react-ui-canvas-editor';

import type { ComputeGraphController } from '../graph/index.ts';

export type ComputeContextType = {
  controller: ComputeGraphController;
  /** Shape definitions for the frame chrome (icon, name, openable); the editor's own registry is the fallback. */
  registry?: ShapeRegistry;
  debug?: boolean;
  /** Grows or shrinks a shape by `delta` px (a function body opening); absent, the frame's element is resized. */
  resize?: (id: string, delta: number) => void;
};

export const ComputeContext = createContext<ComputeContextType | null>(null);

export const useComputeContext = () => {
  return useContext(ComputeContext) ?? raise(new Error('Missing ComputeContext'));
};
