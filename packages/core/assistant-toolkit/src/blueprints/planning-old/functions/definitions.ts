//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { Markdown } from '@dxos/plugin-markdown/types';

export const ReadTasks = Operation.make({
  meta: {
    key: 'org.dxos.function.markdown.read-tasks',
    name: 'Read',
    description: 'Read markdown tasks.',
  },
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document).annotations({
      description: 'The ID of the document to read.',
    }),
  }),
  output: Schema.Struct({
    content: Schema.String,
  }),
  services: [Database.Service],
});

export const UpdateTasks = Operation.make({
  meta: {
    key: 'org.dxos.function.markdown.update-tasks',
    name: 'Update markdown',
    description: 'Creates and updates tasks in markdown documents.',
  },
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document).annotations({
      description: 'The ID of the document to update.',
    }),
    operations: Schema.optional(
      Schema.Array(
        Schema.Any.annotations({
          description: 'Task operations to apply.',
        }),
      ),
    ),
  }),
  output: Schema.Struct({
    content: Schema.String,
    numberedContent: Schema.String.annotations({
      description: 'Content with line numbers for agent reference.',
    }),
  }),
  services: [Database.Service],
});
