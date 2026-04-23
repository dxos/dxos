//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Database, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { EditorViewMode } from '@dxos/ui-editor/types';
import { trim } from '@dxos/util';

import { meta } from '#meta';

import { Markdown } from '../types';

const MARKDOWN_OPERATION = `${meta.id}.operation`;

const Edit = Schema.Struct({
  oldString: Schema.String.annotations({
    description: 'The text to find in the document.',
  }),
  newString: Schema.String.annotations({
    description: 'The text to replace it with.',
  }),
  replaceAll: Schema.optional(Schema.Boolean).annotations({
    description: 'If true, replaces all occurrences. Defaults to false (first occurrence only).',
  }),
});

export const Create = Operation.make({
  meta: {
    key: 'org.dxos.function.markdown.create',
    name: 'Create',
    description: 'Creates a new markdown document and adds it to the space.',
  },
  input: Schema.Struct({
    name: Schema.String,
    content: Schema.String,
  }),
  output: Schema.Struct({
    id: Schema.String.annotations({
      description: 'The DXN of the created document.',
    }),
  }),
  services: [Database.Service],
});

export const CreateMarkdown = Operation.make({
  meta: { key: `${MARKDOWN_OPERATION}.create`, name: 'Create Markdown Document' },
  services: [Capability.Service],
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    content: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    object: Markdown.Document,
  }),
});

export const Open = Operation.make({
  meta: {
    key: 'org.dxos.function.markdown.open',
    name: 'Open',
    description: 'Opens and reads the contents of a new markdown document.',
  },
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document).annotations({
      description: 'The ID of the markdown document.',
    }),
  }),
  output: Schema.Struct({
    content: Schema.String,
  }),
  services: [Database.Service],
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

export const Update = Operation.make({
  meta: {
    key: 'org.dxos.function.markdown.update',
    name: 'Update',
    description: trim`
      Applies a set of edits to the markdown document.
    `,
  },
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document).annotations({
      description: 'The ID of the markdown document.',
    }),
    edits: Schema.Array(Edit).annotations({
      description: 'The edits to apply to the document. Each edit finds oldString and replaces it with newString.',
    }),
  }),
  output: Schema.Struct({
    newContent: Schema.String,
  }),
  services: [Database.Service],
});
