//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { UpdateTasks } from './definitions';
import { MarkdownTasks, type TaskOperation } from './task-list';

export default UpdateTasks.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ doc, operations = [] }) {
      const document = yield* Database.load(doc);

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
  ),
);
