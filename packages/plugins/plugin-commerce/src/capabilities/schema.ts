//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { TagIndex } from '@dxos/schema';

import { Provider, Result, Search } from '#types';

export const Schema = AppCapability.schema([Provider.Provider, Search.Search, Result.Result, TagIndex.TagIndex]);
