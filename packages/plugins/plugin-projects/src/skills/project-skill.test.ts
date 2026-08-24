//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ProjectSkill } from '@dxos/assistant-toolkit';
import * as Operation from '@dxos/compute/Operation';
import * as OutlineOperation from '@dxos/plugin-tasks/OutlineOperation';
import * as TaskOperation from '@dxos/plugin-tasks/TaskOperation';

import { ProjectMcpOperation, ProjectOperation } from '#types';

// The skill sits below these packages and names their verbs as strings, so a re-key there would rot
// the list silently; this is the only place both the skill and the real definitions are visible.
const DEFINITIONS: readonly Operation.Definition.Any[] = [
  ProjectOperation.Create,
  ProjectMcpOperation.ListProjects,
  ProjectMcpOperation.GetProject,
  ProjectMcpOperation.UpdateProject,
  TaskOperation.CreateTask,
  TaskOperation.UpdateTask,
  TaskOperation.CompleteTask,
  TaskOperation.AssignTask,
  TaskOperation.ListTasks,
  TaskOperation.CreateMilestone,
  TaskOperation.UpdateMilestone,
  TaskOperation.DeleteMilestone,
  TaskOperation.ListMilestones,
  OutlineOperation.GetOutline,
  OutlineOperation.UpdateOutline,
];

describe('project skill tools', () => {
  test('every plugin verb the skill names resolves to a real operation', ({ expect }) => {
    const declared = new Set<string>(ProjectSkill.make().tools);
    const missing = DEFINITIONS.map((op) => Operation.toolName(op)).filter((name) => !declared.has(name));
    expect(missing).toEqual([]);
  });
});
