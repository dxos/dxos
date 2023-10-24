//
// Copyright 2023 DXOS.org
//

import { View as ViewType } from '@braneframe/types';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { isTypedObject } from '@dxos/client/echo';

export const EXPLORER_PLUGIN = 'dxos.org/plugin/explorer';

const EXPLORER_ACTION = `${EXPLORER_PLUGIN}/action`;

export enum ExplorerAction {
  CREATE = `${EXPLORER_ACTION}/create`,
}

export type ExplorerPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides;

// TODO(burdon): Standardize views?
export const isExplorer = (data: unknown): data is ViewType => {
  return isTypedObject(data) && ViewType.schema.typename === data.__typename;
};
