//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ArtifactId } from '@dxos/assistant';
import { defineFunction } from '@dxos/functions';
import { Markdown } from '@dxos/plugin-markdown/types';

import { MarkdownTasks, type TaskOperation } from './task-list';
import { Database } from '@dxos/echo';

export default defineFunction({
  key: 'dxos.org/function/markdown/update-tasks',
  name: 'Update markdown',
  description: 'Creates and updates tasks in markdown documents.',
  inputSchema: Schema.Struct({
    id: ArtifactId.annotations({
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
  handler: Effect.fn(function* ({ data: { id, operations = [] } }) {
    const doc = yield* Database.Service.resolve(ArtifactId.toDXN(id), Markdown.Document);

    // Create task manager and apply operations if provided.
    const { content } = yield* Database.Service.load(doc.content);
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
