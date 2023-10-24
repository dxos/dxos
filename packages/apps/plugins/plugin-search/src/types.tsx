//
// Copyright 2023 DXOS.org
//

import type { GraphProvides } from '@braneframe/plugin-graph';
import type { IntentProvides } from '@braneframe/plugin-intent';
import type { TranslationsProvides } from '@braneframe/plugin-theme';

export const SEARCH_PLUGIN = 'dxos.org/plugin/search';

const SEARCH_ACTION = `${SEARCH_PLUGIN}/action`;

export enum SearchAction {
  SEARCH = `${SEARCH_ACTION}/search`,
}

export type SearchPluginProvides = GraphProvides & IntentProvides & TranslationsProvides;
