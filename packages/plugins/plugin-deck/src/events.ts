//
// Copyright 2025 DXOS.org
//

import { type ActivationEvent, Common } from '@dxos/app-framework';

import { meta } from './meta';
import { DeckCapabilities } from './types';

export namespace DeckEvents {
  export const StateReady: ActivationEvent.ActivationEvent = Common.ActivationEvent.createStateEvent(
    `${meta.id}/state-ready`,
  );

  /** Fired when DeckSettings capability is ready. */
  export const SettingsReady: ActivationEvent.ActivationEvent = Common.ActivationEvent.createSettingsEvent(
    DeckCapabilities.Settings.identifier,
  );
}
