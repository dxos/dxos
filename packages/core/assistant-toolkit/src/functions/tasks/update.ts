//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Type } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { Markdown } from '@dxos/plugin-markdown/types';

import { MarkdownTasks, type TaskOperation } from './task-list';

export default defineFunction({
  key: 'dxos.org/function/markdown/update-tasks',
  name: 'Update markdown',
  description: 'Creates and updates tasks in markdown documents.',
  inputSchema: Schema.Struct({
    doc: Type.Ref(Markdown.Document).annotations({
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
  outputSchema: Schema.Struct({
    content: Schema.String,
    numberedContent: Schema.String.annotations({
      description: 'Content with line numbers for agent reference.',
    }),
  }),
  handler: Effect.fn(function* ({ data: { doc, operations = [] } }) {
    const document = yield* Database.load(doc);

    // Create task manager and apply operations if provided.
    const { content } = yield* Database.load(document.content);
    const taskManager = new MarkdownTasks(content);
    if (operations.length > 0) {
      taskManager.applyOperations(operations as TaskOperation[]);
      // TODO: Update the document content when database operations are fixed.
    }

    return {
      content: taskManager.getRawContent(),
      numberedContent: taskManager.getNumberedContent(),
    };
  }),
});
