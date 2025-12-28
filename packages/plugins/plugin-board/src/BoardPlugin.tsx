//
// Copyright 2023 DXOS.org
//

import { Capabilities, Capability, Events, Plugin, createIntent } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';
import { translations as boardTranslations } from '@dxos/react-ui-board';

import { IntentResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Board } from './types';

export const BoardPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'translations',
    activatesOn: Events.SetupTranslations,
    activate: () => Capability.contributes(Capabilities.Translations, [...translations, ...boardTranslations]),
  }),
  Plugin.addModule({
    id: 'metadata',
    activatesOn: Events.SetupMetadata,
    activate: () =>
      // TODO(burdon): "Metadata" here seems non-descriptive; is this specifically for the type? ObjectMetadata?
      Capability.contributes(Capabilities.Metadata, {
        id: Board.Board.typename,
        metadata: {
          icon: 'ph--squares-four--regular',
          iconHue: 'green',
          creatObjectIntent: (() => createIntent(Board.Create)) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      }),
  }),
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () => Capability.contributes(ClientCapabilities.Schema, [Board.Board]),
  }),
  Plugin.addModule({
    id: 'react-surface',
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    id: 'intent-resolver',
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
  Plugin.make,
);
