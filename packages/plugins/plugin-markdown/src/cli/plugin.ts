//
// Copyright 2025 DXOS.org
//

import { Common, Plugin, createIntent } from '@dxos/app-framework';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';
import { Text } from '@dxos/schema';

// NOTE: Must not import from index to avoid pulling in react dependencies.
import { IntentResolver } from '../capabilities/intent-resolver';
import { meta } from '../meta';
import { Markdown, MarkdownAction } from '../types';

export const MarkdownPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addSchemaModule({ schema: [Markdown.Document, Text.Text] }),
  Common.Plugin.addMetadataModule({
    metadata: {
      id: Markdown.Document.typename,
      metadata: {
        createObjectIntent: (() => createIntent(MarkdownAction.Create)) satisfies CreateObjectIntent,
        addToCollectionOnCreate: true,
      },
    },
  }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Plugin.make,
);
