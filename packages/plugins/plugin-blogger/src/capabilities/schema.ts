//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { Blog } from '#types';

export const Schema = AppCapability.schema([Blog.Publication, Blog.Post]);
