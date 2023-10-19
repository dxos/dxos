//
// Copyright 2023 DXOS.org
//

import type { GraphProvides } from '@braneframe/plugin-graph';
import type { IntentProvides } from '@braneframe/plugin-intent';
import type { TranslationsProvides } from '@braneframe/plugin-theme';

export const EXPLORER_PLUGIN = 'dxos.org/plugin/explorer';

const EXPLORER_ACTION = `${EXPLORER_PLUGIN}/action`;

export enum ExplorerAction {}

export type ExplorerPluginProvides = GraphProvides & IntentProvides & TranslationsProvides;
