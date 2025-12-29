//
// Copyright 2025 DXOS.org
//

import { Capability, Common } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../../meta';
import { type DeckSettingsProps, DeckSettingsSchema } from '../../types';

export default Capability.makeModule(() => {
  const settings = live<DeckSettingsProps>({
    showHints: false,
    enableDeck: false,
    enableStatusbar: false,
    enableNativeRedirect: false,
    newPlankPositioning: 'start',
    overscroll: 'none',
    encapsulatedPlanks: false,
  });

  return Capability.contributes(Common.Capability.Settings, {
    prefix: meta.id,
    schema: DeckSettingsSchema,
    value: settings,
  });
});
