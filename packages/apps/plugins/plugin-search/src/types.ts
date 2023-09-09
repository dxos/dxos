//
// Copyright 2023 DXOS.org
//

import { IntentProvides } from '@braneframe/plugin-intent';
import { TranslationsProvides } from '@braneframe/plugin-theme';

export const SEARCH_PLUGIN = 'dxos.org/plugin/Search';

// const SEARCH_ACTION = `${SEARCH_PLUGIN}/action`;

export enum SearchAction {}

export type SearchPluginProvides = IntentProvides & TranslationsProvides;
