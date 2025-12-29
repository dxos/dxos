//
// Copyright 2025 DXOS.org
//

import { Common, Plugin, Capability, createIntent } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';
import { Text } from '@dxos/schema';

import { IntentResolver } from '../capabilities';
import { meta } from '../meta';
import { Markdown, MarkdownAction } from '../types';

export const MarkdownPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () => Capability.contributes(ClientCapabilities.Schema, [Markdown.Document, Text.Text]),
  }),
  Plugin.addModule({
    id: 'metadata',
    activatesOn: Common.ActivationEvent.SetupMetadata,
    activate: () =>
      Capability.contributes(Common.Capability.Metadata, {
        id: Markdown.Document.typename,
        metadata: {
          createObjectIntent: (() => createIntent(MarkdownAction.Create)) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      }),
  }),
  Plugin.addModule({
    id: 'intent-resolver',
    activatesOn: Common.ActivationEvent.SetupIntentResolver,
    activate: IntentResolver,
  }),
  Plugin.make,
);
