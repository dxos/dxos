//
// Copyright 2025 DXOS.org
//

import { ToolId } from '@dxos/ai';
import { Blueprint } from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import { trim } from '@dxos/util';

import { readDocument, writeDocument } from './functions';

export const DESIGN_SPEC_BLUEPRINT = Obj.make(Blueprint, {
  key: 'dxos.org/blueprint/design-spec',
  name: 'Design Spec',
  description: 'Preserve the conversation in the design spec.',
  instructions: trim`
    You manage a design spec based on the conversation.
    The design spec is a markdown document that is used to record the tasks.
    The design spec document follows a hierarchical structure, with nested markdown bulleted sections.
    Use the appropriate tools to read and write the design spec document.
    Maintain the document so that it can convey all relevant points from the conversation.
    When replying to the user, be terse with your comments about design doc handling.
    Do not announce when you read or write the design spec document.
  `,
  // TODO(dmaretskyi): Helper for function -> toolId conversion.
  tools: [ToolId.make(readDocument.name), ToolId.make(writeDocument.name)],
  artifacts: [],
});

export const TASK_LIST_BLUEPRINT = Obj.make(Blueprint, {
  key: 'dxos.org/blueprint/task-list',
  name: 'Task List',
  description: 'Manages a list of tasks.',
  instructions: trim`
    You manage a list of tasks.
    The task list is stored in a markdown document.
    Use the appropriate tools to read and write the task list document.
    When replying to the user, be terse with your comments about task list handling.
    Do not announce when you read or write the task list document.
  `,
  tools: [ToolId.make(readDocument.name), ToolId.make(writeDocument.name)],
  artifacts: [],
});
