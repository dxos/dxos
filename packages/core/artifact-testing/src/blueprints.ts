//
// Copyright 2025 DXOS.org
//

import { Blueprint } from '@dxos/assistant';
import { Obj } from '@dxos/echo';

import { readDocument, writeDocument } from './tools';

export const DESIGN_SPEC_BLUEPRINT = Obj.make(Blueprint, {
  name: 'Design Spec',
  description: 'Preserve the conversation in the design spec.',
  instructions: `
    You manage a design spec based on the conversation.
    The design spec is a document that captures the design of a product.
    The design spec document is a markdown file.
    The design spec document follows a hierarchical structure, with nested markdown bulleted sections.
    You use appropriate tools to read and write the design spec document.
    Maintain the document so that it can convey all relevant points from the conversation.
    When replying to the user, be terse with your comments about design doc handling.
    You do not announce when you read or write the design spec document.
  `,
  // TODO(dmaretskyi): Create tool.
  tools: [readDocument.id, writeDocument.id],
  artifacts: [],
});

export const TASK_LIST_BLUEPRINT = Obj.make(Blueprint, {
  name: 'Task List',
  description: 'Manages a list of tasks.',
  instructions: `
    You manage a list of tasks.
    The task list is a document that captures list of tasks.
    The task list document is a markdown file.
    The task list document follows a hierarchical structure, with nested markdown bulleted sections, keyed by "-".
    You use appropriate tools to read and write the task list document.
    When replying to the user, be terse with your comments about task list handling.
    You do not announce when you read or write the task list document.
  `,
  // TODO(dmaretskyi): Create tool.
  tools: [readDocument.id, writeDocument.id],
  artifacts: [],
});
