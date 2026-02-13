//
// Copyright 2025 DXOS.org
//

import { type ActivationEvent } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import { meta } from '../meta';

import { DeckCapabilities } from './capabilities';

export namespace DeckEvents {
  export const StateReady: ActivationEvent.ActivationEvent = AppActivationEvents.createStateEvent(
    `${meta.id}/state-ready`,
  );

  /** Fired when DeckSettings capability is ready. */
  export const SettingsReady: ActivationEvent.ActivationEvent = AppActivationEvents.createSettingsEvent(
    DeckCapabilities.Settings.identifier,
  );
}
