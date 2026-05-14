//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type ActivationEvent } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import * as SimpleLayoutCapabilities from './SimpleLayoutCapabilities';

/** Fired when State capability is ready. */
export const StateReady: ActivationEvent.ActivationEvent = AppActivationEvents.createStateEvent(
  SimpleLayoutCapabilities.State.identifier,
);
