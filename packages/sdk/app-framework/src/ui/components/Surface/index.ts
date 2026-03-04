//
// Copyright 2025 DXOS.org
//

// TODO(wittjosiah): Cleanup to avoid re-naming.
import { SurfaceContext } from './context';
import { SurfaceComponent, isSurfaceAvailable } from './SurfaceComponent';
import { type Definition as SurfaceDefinition, create as createSurface, createWeb as createWebSurface } from './types';

export namespace Surface {
  export type Definition = SurfaceDefinition;
  export const create = createSurface;
  export const createWeb = createWebSurface;

  export type Context = SurfaceContext;
  export const Context = SurfaceContext;

  export const Surface = SurfaceComponent;
  export const isAvailable = isSurfaceAvailable;
}
