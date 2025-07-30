//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { ArtifactId } from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import { DatabaseService, defineFunction } from '@dxos/functions';
import { Document } from '@dxos/plugin-markdown/types';

import { MarkdownTasks, type TaskOperation } from './task-list';

export default defineFunction({
  name: 'dxos.org/function/markdown/update-tasks',
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
    const doc = yield* DatabaseService.resolve(ArtifactId.toDXN(id));
    if (!doc || !Obj.instanceOf(Document.Document, doc)) {
      throw new Error('Document not found.');
    }
    const { content } = yield* DatabaseService.loadRef(doc.content);

    // Create task manager and apply operations if provided.
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
