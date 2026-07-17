//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type ActivationEvent } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import { meta } from '#meta';

import * as MeetingCapabilities from './MeetingCapabilities';

/**
 * @deprecated Declare `requires: [MeetingCapabilities.State]` instead.
 */
export const StateReady: ActivationEvent.ActivationEvent = AppActivationEvents.createStateEvent(meta.profile.key);

/**
 * @deprecated Declare `requires: [MeetingCapabilities.Settings]` instead.
 */
export const SettingsReady: ActivationEvent.ActivationEvent = AppActivationEvents.createSettingsEvent(
  MeetingCapabilities.Settings.identifier,
);
