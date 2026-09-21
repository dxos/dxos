//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Milestone, Outline, RemoteSession, Task, TaskSet } from '@dxos/types';

import { Journal } from '#types';

export const Schema = AppCapability.schema([
  Journal.JournalEntry,
  Journal.Journal,
  Milestone.Milestone,
  Outline.Outline,
  RemoteSession.RemoteSession,
  Task.Task,
  TaskSet.TaskSet,
]);
