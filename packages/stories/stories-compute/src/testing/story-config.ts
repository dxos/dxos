//
// Copyright 2026 DXOS.org
//

import { Config } from '@dxos/config';
import { makeModuleSurfacesPlugin } from '@dxos/storybook-testing';

import { moduleSurfaces } from '../modules/index.ts';

export const surfacesPlugin = () => makeModuleSurfacesPlugin('org.dxos.stories.compute.modules', moduleSurfaces);

/** Client config pointing at an EDGE service, for the stories that spawn there for real. */
export const makeEdgeConfig = (url: string) =>
  new Config({
    version: 1,
    runtime: {
      client: { edgeFeatures: { signaling: true, agents: true } },
      services: { edge: { url } },
    },
  });

/** A local EDGE stack (`pnpm stack:start` in the edge repo), whose edge worker listens on :8787. */
export const EDGE_LOCAL_URL = 'http://localhost:8787';

/** Dev EDGE; it must host a story's process key for remote spawns to succeed. */
export const EDGE_DEV_URL = 'https://dev.dxos.network';
