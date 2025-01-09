//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework/next';
import { create } from '@dxos/live-object';

import { DECK_PLUGIN } from '../../meta';
import { type DeckSettingsProps } from '../../types';

export default (context: PluginsContext) => {
  const settings = create<DeckSettingsProps>({
    showHints: false,
    customSlots: false,
    flatDeck: false,
    enableNativeRedirect: false,
    newPlankPositioning: 'start',
    overscroll: 'centering',
  });

  // const [settingsStore] = context.requestCapability(Capabilities.SettingsStore);
  // settingsStore.createStore({
  //   schema: DeckSettingsSchema,
  //   prefix: DECK_PLUGIN,
  //   value: settings,
  // });

  return contributes(Capabilities.Settings, { plugin: DECK_PLUGIN, settings });
};
