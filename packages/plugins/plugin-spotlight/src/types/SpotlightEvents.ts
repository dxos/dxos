//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type ActivationEvent } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import * as SpotlightCapabilities from './SpotlightCapabilities';

export const StateReady: ActivationEvent.ActivationEvent = AppActivationEvents.createStateEvent(
  SpotlightCapabilities.State.identifier,
);
