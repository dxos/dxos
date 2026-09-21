//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AccessToken } from '@dxos/link';

import { Sandbox } from '#types';

export const Schema = AppCapability.schema([Sandbox.Sandbox, AccessToken.AccessToken]);
