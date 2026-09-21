//
// Copyright 2025 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { Profile, Sidekick } from '#types';

export const Schema = AppCapability.schema([Sidekick.Profile, Profile.Profile]);
