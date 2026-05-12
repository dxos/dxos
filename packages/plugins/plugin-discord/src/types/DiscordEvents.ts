//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type ActivationEvent } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import * as DiscordCapabilities from './DiscordCapabilities';

/** Fired when the Discord Settings capability is ready. */
export const SettingsReady: ActivationEvent.ActivationEvent = AppActivationEvents.createSettingsEvent(
  DiscordCapabilities.Settings.identifier,
);
