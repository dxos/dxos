//
// Copyright 2023 DXOS.org
//

import type { GraphBuilderProvides, SurfaceProvides, TranslationsProvides } from '@dxos/app-framework';

import { CALLS_PLUGIN } from './meta';

const CALLS_ACTION = `${CALLS_PLUGIN}/action`;

export enum CallsAction {
  CREATE = `${CALLS_ACTION}/create`,
}

export type CallsProvides = {};

export type CallsPluginProvides = SurfaceProvides & GraphBuilderProvides & TranslationsProvides;
