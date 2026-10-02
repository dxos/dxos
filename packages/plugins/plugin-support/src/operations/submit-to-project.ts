//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { Task, TaskSet } from '@dxos/types';

import { SupportOperation } from '#types';

import { ProjectNotReportableError } from '../errors.ts';

const PRIORITY: Record<SupportOperation.Severity, Task.Priority> = {
  'High priority': 'high',
  'Medium priority': 'medium',
  'Low priority': 'low',
};

/** The report's metadata, appended to its body so the task carries what the support route sends as fields. */
export const taskDescription = (report: SupportOperation.SupportRequest): string => {
  const details = [
    report.type && `- Type: ${report.type}`,
    report.severity && `- Severity: ${report.severity}`,
    report.area && `- Area: ${report.area}`,
    report.version && `- Version: ${report.version}`,
  ].filter(Boolean);
  return details.length > 0 ? `${report.body}\n\n${details.join('\n')}` : report.body;
};

const handler: Operation.WithHandler<typeof SupportOperation.SubmitToProject> = SupportOperation.SubmitToProject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ project: projectRef, report, attachments }) {
      const project = yield* Database.load(projectRef);
      if (!project.taskSet) {
        return yield* Effect.fail(new ProjectNotReportableError());
      }

      const taskSet = yield* Database.load(project.taskSet);
      const task = yield* TaskSet.addPersisted(
        Task.make({
          title: report.title.trim(),
          status: 'todo',
          description: taskDescription(report),
          priority: report.severity && PRIORITY[report.severity],
        }),
      );
      TaskSet.addTaskToSet(taskSet, task);
      for (const fileRef of attachments ?? []) {
        Task.addAttachment(task, yield* Database.load(fileRef));
      }
      yield* Database.flush();
      return { task };
    }),
  ),
);

export default handler;
