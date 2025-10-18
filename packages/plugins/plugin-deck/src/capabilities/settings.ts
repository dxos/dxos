//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../meta';
import { type DeckSettingsProps, DeckSettingsSchema } from '../types';

export default () => {
  const settings = live<DeckSettingsProps>({
    showHints: false,
    enableDeck: false,
    enableStatusbar: false,
    enableNativeRedirect: false,
    newPlankPositioning: 'start',
    overscroll: 'none',
    encapsulatedPlanks: false,
  });

  return contributes(Capabilities.Settings, {
    prefix: meta.id,
    schema: DeckSettingsSchema,
    value: settings,
  });
};
