//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type ActivationEvent } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import * as MapCapabilities from './MapCapabilities';

/**
 * @deprecated Declare `requires: [MapCapabilities.State]` instead.
 */
export const StateReady: ActivationEvent.ActivationEvent = AppActivationEvents.createStateEvent(
  MapCapabilities.State.identifier,
);

/**
 * @deprecated Declare `requires: [MapCapabilities.Settings]` instead.
 */
export const SettingsReady: ActivationEvent.ActivationEvent = AppActivationEvents.createSettingsEvent(
  MapCapabilities.Settings.identifier,
);
