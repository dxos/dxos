//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';
import { SpaceSchema } from '@dxos/react-client/echo';
import { Collection } from '@dxos/schema';
import { EditorViewMode } from '@dxos/ui-editor/types';

import { meta } from '../meta';

import { Document } from './Markdown';

const MARKDOWN_OPERATION = `${meta.id}/operation`;

export namespace MarkdownOperation {
  export const OnCreateSpace = Operation.make({
    meta: { key: `${MARKDOWN_OPERATION}/on-create-space`, name: 'On Create Space' },
    services: [Capability.Service],
    schema: {
      input: Schema.Struct({
        space: SpaceSchema,
        rootCollection: Collection.Collection,
        isDefault: Schema.optional(Schema.Boolean),
      }),
      output: Schema.Void,
    },
  });

  export const Create = Operation.make({
    meta: { key: `${MARKDOWN_OPERATION}/create`, name: 'Create Markdown Document' },
    services: [Capability.Service],
    schema: {
      input: Schema.Struct({
        name: Schema.optional(Schema.String),
        content: Schema.optional(Schema.String),
      }),
      output: Schema.Struct({
        object: Document,
      }),
    },
  });

  // TODO(wittjosiah): This appears to be unused.
  export const SetViewMode = Operation.make({
    meta: { key: `${MARKDOWN_OPERATION}/set-view-mode`, name: 'Set View Mode' },
    services: [Capability.Service],
    schema: {
      input: Schema.Struct({
        id: Schema.String,
        viewMode: EditorViewMode,
      }),
      output: Schema.Void,
    },
  });
}
