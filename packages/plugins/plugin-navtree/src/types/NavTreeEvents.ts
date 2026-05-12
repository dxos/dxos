//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type ActivationEvent } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import { meta } from '#meta';

export const StateReady: ActivationEvent.ActivationEvent = AppActivationEvents.createStateEvent(meta.id);
