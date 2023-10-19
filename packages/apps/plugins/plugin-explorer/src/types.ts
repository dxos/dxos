//
// Copyright 2023 DXOS.org
//

import type { GraphProvides } from '@braneframe/plugin-graph';
import type { IntentProvides } from '@braneframe/plugin-intent';
import type { TranslationsProvides } from '@braneframe/plugin-theme';
import { View as ViewType } from '@braneframe/types';
import { isTypedObject } from '@dxos/client/echo';

export const EXPLORER_PLUGIN = 'dxos.org/plugin/explorer';

const EXPLORER_ACTION = `${EXPLORER_PLUGIN}/action`;

export enum ExplorerAction {
  CREATE = `${EXPLORER_ACTION}/create`,
}

export type ExplorerPluginProvides = GraphProvides & IntentProvides & TranslationsProvides;

// TODO(burdon): Standardize views?
export const isExplorer = (data: unknown): data is ViewType => {
  return isTypedObject(data) && ViewType.schema.typename === data.__typename;
};
