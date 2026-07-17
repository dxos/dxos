//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type ActivationEvent } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import * as InboxCapabilities from './InboxCapabilities';

/**
 * Fired when the Inbox Settings capability is ready.
 * @deprecated Declare `requires: [InboxCapabilities.Settings]` instead.
 */
export const SettingsReady: ActivationEvent.ActivationEvent = AppActivationEvents.createSettingsEvent(
  InboxCapabilities.Settings.identifier,
);
