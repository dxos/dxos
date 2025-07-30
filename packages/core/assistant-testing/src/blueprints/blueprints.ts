//
// Copyright 2025 DXOS.org
//

import { ToolId } from '@dxos/ai';
import { Blueprint, Template } from '@dxos/blueprints';
import { Obj, Ref } from '@dxos/echo';
import { trim } from '@dxos/util';

import { readDocument, writeDocument } from '../functions';

export const DESIGN_BLUEPRINT = Obj.make(Blueprint.Blueprint, {
  key: 'dxos.org/blueprint/design-spec',
  name: 'Design Spec',
  description: 'Preserve the conversation in the design spec.',
  instructions: Ref.make(
    Template.make({
      source: trim`
        You manage a design spec based on the conversation.
        The design spec is a markdown document that is used to record the tasks.
        The design spec document follows a hierarchical structure, with nested markdown bulleted sections.
        Use the appropriate tools to read and write the design spec document.
        Maintain the document so that it can convey all relevant points from the conversation.
        When replying to the user, be terse with your comments about design doc handling.
        Do not announce when you read or write the design spec document.
      `,
    }),
  ),
  // TODO(dmaretskyi): Helper for function -> toolId conversion.
  tools: [ToolId.make(readDocument.name), ToolId.make(writeDocument.name)],
});

export const TASK_BLUEPRINT = Obj.make(Blueprint.Blueprint, {
  key: 'dxos.org/blueprint/task-list',
  name: 'Task List',
  description: 'Manages a list of tasks.',
  instructions: Ref.make(
    Template.make({
      source: trim`
        You manage a list of tasks.
        The task list is stored in a markdown document.
        Use the appropriate tools to read and write the task list document.
        When replying to the user, be terse with your comments about task list handling.
        Do not announce when you read or write the task list document.
      `,
    }),
  ),
  tools: [ToolId.make(readDocument.name), ToolId.make(writeDocument.name)],
});

export const PLANNING_BLUEPRINT = Obj.make(Blueprint.Blueprint, {
  key: 'dxos.org/blueprint/planning',
  name: 'Planning',
  description: 'Plans and tracks complex tasks with artifact management.',
  instructions: Ref.make(
    Template.make({
      source: trim`
        You are a planning agent that manages complex tasks by creating and maintaining a markdown planning document.

        ## Core Responsibilities
        - Create structured plans for complex tasks as markdown task lists
        - Track task progress by updating completion status in real-time
        - Maintain an artifacts section to document all created/modified files and resources
        - Use tools to read and write the planning document throughout task execution

        ## Planning Document Structure
        Use this markdown format:
        
        # Task Plan: [Task Name]
        
        ## Overview
        [Brief description of the overall goal]
        
        ## Tasks
        - [ ] Task 1: Description
        - [ ] Task 2: Description  
        - [x] Task 3: Completed task
        - [ ] Task 4: Description
        
        ## Artifacts Created/Modified
        - \`file.js\` - Description of what was created/changed
        - \`config.json\` - Description of modifications
        - \`README.md\` - Documentation added
        
        ## Notes
        [Any important observations, decisions, or blockers encountered]

        ## Workflow
        1. When given a complex task, first create the planning document with all identified subtasks
        2. Mark tasks as completed (- [x]) as you finish them
        3. Add any newly discovered tasks during execution
        4. Update the artifacts section whenever you create or modify files
        5. Add notes about important decisions or blockers encountered

        ## Communication Style
        - Be concise when discussing document updates
        - Focus on task execution rather than document management
        - Only mention document updates when they provide valuable context to the user
      `,
    }),
  ),
  tools: [ToolId.make(readDocument.name), ToolId.make(writeDocument.name)],
});
