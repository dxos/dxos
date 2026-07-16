//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type ActivationEvent } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import { meta } from '#meta';

import * as DeckCapabilities from './DeckCapabilities';

/**
 * @deprecated Declare `requires: [DeckCapabilities.State]` instead.
 */
export const StateReady: ActivationEvent.ActivationEvent = AppActivationEvents.createStateEvent(
  `${meta.profile.key}.state-ready`,
);

/**
 * Fired when DeckSettings capability is ready.
 * @deprecated Declare `requires: [DeckCapabilities.Settings]` instead.
 */
export const SettingsReady: ActivationEvent.ActivationEvent = AppActivationEvents.createSettingsEvent(
  DeckCapabilities.Settings.identifier,
);
