//
// Copyright 2026 DXOS.org
//

import { Milestone, Outline, PullRequest, RemoteSession, Task, TaskSet } from '@dxos/types';

import { Journal } from '#types';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph. `PullRequest` is here because
 * the task list renders it as an artifact pill, which needs its type resolved without plugin-github.
 */
export default [
  Journal.JournalEntry,
  Journal.Journal,
  Milestone.Milestone,
  Outline.Outline,
  PullRequest.PullRequest,
  RemoteSession.RemoteSession,
  Task.Task,
  TaskSet.TaskSet,
];
