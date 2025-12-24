//
// Copyright 2025 DXOS.org
//

import { Capabilities, Events, contributes, createIntent, defineModule, definePlugin, lazy } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';
import { Text } from '@dxos/schema';

import { meta } from '../meta';
import { Markdown, MarkdownAction } from '../types';

const IntentResolver = lazy(() => import('../capabilities/intent-resolver'));

export const MarkdownPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/schema`,
    activatesOn: ClientEvents.SetupSchema,
    activate: () => contributes(ClientCapabilities.Schema, [Markdown.Document, Text.Text]),
  }),
  defineModule({
    id: `${meta.id}/module/metadata`,
    activatesOn: Events.SetupMetadata,
    activate: () =>
      contributes(Capabilities.Metadata, {
        id: Markdown.Document.typename,
        metadata: {
          createObjectIntent: (() => createIntent(MarkdownAction.Create)) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      }),
  }),
  defineModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
]);
