//
// Copyright 2025 DXOS.org
//

import { Operation } from '@dxos/operation';
import * as Schema from 'effect/Schema';

import { Database, Ref } from '@dxos/echo';
import { trim } from '@dxos/util';

import { Markdown } from '../../types';

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
      description:
        'The edits to apply to the document. Each edit finds oldString and replaces it with newString.',
    }),
  }),
  output: Schema.Struct({
    newContent: Schema.String,
  }),
  services: [Database.Service],
});
