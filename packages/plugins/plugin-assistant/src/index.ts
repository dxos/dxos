//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const AssistantPlugin = Plugin.lazy(meta, () => import('./AssistantPlugin'));

export * from './blueprints';
// TODO(wittjosiah): Assistant components/hooks should not be exported from the main entry point.
export * from './meta';
export * from './translations';
export * from './types';
