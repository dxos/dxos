//
// Copyright 2025 DXOS.org
//

import { type ActivationEvent } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import { InboxCapabilities } from './capabilities';

export namespace InboxEvents {
  /** Fired when the Inbox Settings capability is ready. */
  export const SettingsReady: ActivationEvent.ActivationEvent = AppActivationEvents.createSettingsEvent(
    InboxCapabilities.Settings.identifier,
  );
}
