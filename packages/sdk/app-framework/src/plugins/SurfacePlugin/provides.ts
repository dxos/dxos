//
// Copyright 2023 DXOS.org
//

import { type SurfaceComponent, type SurfaceRootContext } from './SurfaceRootContext';
import { type Plugin } from '../PluginHost';

export type SurfaceProvides = {
  surface: {
    /**
     * Used by the `Surface` resolver to find a component to render.
     */
    component: SurfaceComponent;
  };
};

export type SurfacePluginProvides = {
  surface: SurfaceRootContext;
};

export const parseRootSurfacePlugin = (plugin?: Plugin) =>
  (plugin?.provides as any)?.surface?.components ? (plugin as Plugin<SurfacePluginProvides>) : undefined;

export const parseSurfacePlugin = (plugin?: Plugin) =>
  (plugin?.provides as any)?.surface?.component ? (plugin as Plugin<SurfaceProvides>) : undefined;
