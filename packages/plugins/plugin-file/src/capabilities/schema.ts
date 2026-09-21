//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Blob } from '@dxos/echo';
import { File } from '@dxos/types';

export const Schema = AppCapability.schema([File.File, Blob.Blob]);
