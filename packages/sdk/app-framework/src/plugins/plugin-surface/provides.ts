//
// Copyright 2023 DXOS.org
//

import { type SurfaceDefinition, type SurfaceContextValue } from './SurfaceContext';
import { type HostContext, type Plugin } from '../plugin-host';

export type SurfaceDefinitions = SurfaceDefinition | SurfaceDefinition[] | SurfaceDefinitions[];

export type SurfaceProvides = {
  surface: {
    /**
     * Used by the `Surface` resolver to find a component to render.
     */
    definitions: (context: HostContext) => SurfaceDefinitions;
  };
};

export type SurfacePluginProvides = {
  surface: SurfaceContextValue;
};

export const parseRootSurfacePlugin = (plugin?: Plugin) =>
  (plugin?.provides as any)?.surface?.surfaces ? (plugin as Plugin<SurfacePluginProvides>) : undefined;

export const parseSurfacePlugin = (plugin?: Plugin) =>
  (plugin?.provides as any)?.surface?.definitions ? (plugin as Plugin<SurfaceProvides>) : undefined;
