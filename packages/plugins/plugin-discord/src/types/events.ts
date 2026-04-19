//
// Copyright 2026 DXOS.org
//

import { type ActivationEvent } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import { DiscordCapabilities } from './capabilities';

export namespace DiscordEvents {
  /** Fired when the Discord Settings capability is ready. */
  export const SettingsReady: ActivationEvent.ActivationEvent = AppActivationEvents.createSettingsEvent(
    DiscordCapabilities.Settings.identifier,
  );
}
