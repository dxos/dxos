//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';
import { EditorViewMode } from '@dxos/ui-editor/types';

import { meta } from '../meta';

import { Document } from './Markdown';

const MARKDOWN_OPERATION = `${meta.id}.operation`;

export namespace MarkdownOperation {
  export const Create = Operation.make({
    meta: { key: `${MARKDOWN_OPERATION}.create`, name: 'Create Markdown Document' },
    services: [Capability.Service],
    input: Schema.Struct({
      name: Schema.optional(Schema.String),
      content: Schema.optional(Schema.String),
    }),
    output: Schema.Struct({
      object: Document,
    }),
  });

  export const ScrollToAnchor = Operation.make({
    meta: { key: `${MARKDOWN_OPERATION}.scroll-to-anchor`, name: 'Scroll To Anchor' },
    services: [Capability.Service],
    input: Schema.Struct({
      subject: Schema.String.annotations({ description: 'Attendable ID of the markdown editor.' }),
      cursor: Schema.String.annotations({ description: 'Cursor position to scroll to.' }),
      ref: Schema.optional(Schema.String.annotations({ description: 'Reference ID (e.g. thread ID).' })),
    }),
    output: Schema.Void,
  });

  // TODO(wittjosiah): This appears to be unused.
  export const SetViewMode = Operation.make({
    meta: { key: `${MARKDOWN_OPERATION}.set-view-mode`, name: 'Set View Mode' },
    services: [Capability.Service],
    input: Schema.Struct({
      id: Schema.String,
      viewMode: EditorViewMode,
    }),
    output: Schema.Void,
  });
}
