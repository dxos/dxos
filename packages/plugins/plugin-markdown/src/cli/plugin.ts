//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Common, Plugin } from '@dxos/app-framework';
import { type CreateObject } from '@dxos/plugin-space/types';
import { Text } from '@dxos/schema';

// NOTE: Must not import from index to avoid pulling in react dependencies.
import { OperationResolver } from '../capabilities/operation-resolver';
import { meta } from '../meta';
import { Markdown } from '../types';

export const MarkdownPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addSchemaModule({ schema: [Markdown.Document, Text.Text] }),
  Common.Plugin.addMetadataModule({
    metadata: {
      id: Markdown.Document.typename,
      metadata: {
        createObject: ((props) => Effect.sync(() => Markdown.make(props))) satisfies CreateObject,
        addToCollectionOnCreate: true,
      },
    },
  }),
  Common.Plugin.addOperationResolverModule({ activate: OperationResolver }),
  Plugin.make,
);
