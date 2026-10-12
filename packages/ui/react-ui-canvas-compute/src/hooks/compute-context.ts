//
// Copyright 2025 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';
import { type NodeDef } from '@dxos/react-ui-canvas/scene';

import type { ComputeGraphController } from '../graph/index.ts';

export type ComputeContextType = {
  controller: ComputeGraphController;
  debug?: boolean;
  /** Grows or shrinks a shape by `delta` px (a function body opening); absent, the body opens in place. */
  resize?: (id: string, delta: number) => void;
};

export const ComputeContext = createContext<ComputeContextType | null>(null);

export const useComputeContext = () => {
  return useContext(ComputeContext) ?? raise(new Error('Missing ComputeContext'));
};

/** The definition of the node being rendered, from the registry the scene renders with, for the frame chrome. */
export const ComputeNodeDefContext = createContext<NodeDef | undefined>(undefined);

export const useComputeNodeDef = () => useContext(ComputeNodeDefContext);
