//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { create } from '@dxos/live-object';

import { DECK_PLUGIN } from '../../meta';
import { DeckSettingsSchema, type DeckSettingsProps } from '../../types';

export default () => {
  const settings = create<DeckSettingsProps>({
    showHints: false,
    customSlots: false,
    flatDeck: false,
    enableNativeRedirect: false,
    newPlankPositioning: 'start',
    overscroll: 'centering',
  });

  return contributes(Capabilities.Settings, { schema: DeckSettingsSchema, prefix: DECK_PLUGIN, value: settings });
};
