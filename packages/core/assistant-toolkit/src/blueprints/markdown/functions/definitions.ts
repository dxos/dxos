//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { Markdown } from '@dxos/plugin-markdown/types';

export const Create = Operation.make({
  meta: {
    key: 'org.dxos.function.markdown.create',
    name: 'Create markdown document',
    description: 'Creates a new markdown document.',
  },
  input: Schema.Struct({
    name: Schema.String.annotations({
      description: 'Name of the document.',
    }),
    content: Schema.String.annotations({
      description: 'Content of the document.',
    }),
  }),
  output: Schema.Void,
  services: [Database.Service],
});

export const Read = Operation.make({
  meta: {
    key: 'org.dxos.function.markdown.read',
    name: 'Read markdown document',
    description:
      'Read markdown document. Note that result is a snapshot in time, and might have changed since the document was last read.',
  },
  input: Schema.Struct({
    document: Ref.Ref(Markdown.Document).annotations({
      description: 'The document to read.',
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
    name: 'Update markdown',
    description: 'Updates the entire contents of the markdown document.',
  },
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document).annotations({
      description: 'The ID of the document to write.',
    }),
    content: Schema.String.annotations({
      description: 'New content to write to the document.',
    }),
  }),
  output: Schema.Void,
  services: [Database.Service],
});
