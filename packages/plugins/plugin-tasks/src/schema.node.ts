//
// Copyright 2026 DXOS.org
//

import { Milestone, Outline, Task, TaskSet } from '@dxos/types';

import { Journal } from '#types';

/** Wider than the browser list: a headless host registers nothing, so the plugin owns every type it writes. */
export default [
  Journal.JournalEntry,
  Journal.Journal,
  Milestone.Milestone,
  Outline.Outline,
  Task.Task,
  TaskSet.TaskSet,
];
