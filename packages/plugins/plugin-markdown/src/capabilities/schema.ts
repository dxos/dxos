//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Text } from '@dxos/schema';

import { Markdown } from '#types';

export const Schema = AppCapability.schema([Markdown.Document, Text.Text]);
