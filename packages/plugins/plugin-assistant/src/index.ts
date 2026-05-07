//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const AssistantPlugin = Plugin.lazy(meta, () => import('#plugin'));

export * from './blueprints';
// TODO(wittjosiah): Components and hooks should not be exported from the plugin package at all.
//   Either refactor callers to not need them or factor them out to a shared package.
export * from './meta';
export * from './translations';
export * from './types';
