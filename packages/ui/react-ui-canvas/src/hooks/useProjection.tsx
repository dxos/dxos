//
// Copyright 2024 DXOS.org
//

import { type CSSProperties, type Dispatch, type SetStateAction, createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { type Projection, type ProjectionState } from './projection';

export type CanvasContext = ProjectionState & {
  root: HTMLDivElement;
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

export const useProjection = (): CanvasContext => {
  return useContext(CanvasContext) ?? raise(new Error('Missing CanvasContext'));
};
