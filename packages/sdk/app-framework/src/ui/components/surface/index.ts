//
// Copyright 2025 DXOS.org
//

import { SurfaceContext } from './context';
import { SurfaceComponent, isSurfaceAvailable } from './SurfaceComponent';
import { type Definition as SurfaceDefinition, create as createReact, createWeb as createWebComponent } from './types';

export namespace Surface {
  export type Definition = SurfaceDefinition;
  export const create = createReact;
  export const createWeb = createWebComponent;

  export type Context = SurfaceContext;
  export const Context = SurfaceContext;

  export const Surface = SurfaceComponent;
  export const isAvailable = isSurfaceAvailable;
}
