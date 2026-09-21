//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Text } from '@dxos/schema';

import { Bookmark } from '#types';

export const Schema = AppCapability.schema([Bookmark.Bookmark, Text.Text]);
