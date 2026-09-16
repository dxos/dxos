//
// Copyright 2026 DXOS.org
//

import { Milestone, Outline, RemoteSession, Task, TaskSet } from '@dxos/types';

import { Journal } from '#types';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 */
export default [
  Journal.JournalEntry,
  Journal.Journal,
  Milestone.Milestone,
  Outline.Outline,
  RemoteSession.RemoteSession,
  Task.Task,
  TaskSet.TaskSet,
];
