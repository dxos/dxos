//
// Copyright 2024 DXOS.org
//

import { type CSSProperties, type Dispatch, type SetStateAction, createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { type Projection, type ProjectionState } from './projection.tsx';

// Kept out of the canvas components: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and hook exported beside one force a full page reload on every edit.

export type CanvasContext = ProjectionState & {
  root: HTMLDivElement;
  ready: boolean;
  width: number;
  height: number;
  styles: CSSProperties;
  projection: Projection;
  setProjection: Dispatch<SetStateAction<ProjectionState>>;
};

/**
 * @internal
 */
// TODO(burdon): Use radix?
export const CanvasContext = createContext<CanvasContext | null>(null);

export const useCanvasContext = (): CanvasContext => {
  return useContext(CanvasContext) ?? raise(new Error('Missing CanvasContext'));
};
