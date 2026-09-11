//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import { Database, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { type Task, TaskSet } from '@dxos/types';
import { concat } from '@dxos/util';

import { ProjectOperation } from '#types';

import { findProject } from './find-project.ts';

/**
 * The verb the prompt tells the agent to call. Named by operation key rather than by a host's tool
 * name: the same operation is surfaced under different tool names by different hosts (MCP, the
 * in-app invoker), and the key is what every one of them resolves.
 */
const UPDATE_TASK_KEY = 'org.dxos.operation.tasks.update';

const handler: Operation.WithHandler<typeof ProjectOperation.CopyTaskPrompt> = ProjectOperation.CopyTaskPrompt.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task: taskRef }) {
      const task = yield* Database.load(taskRef);
      const project = findProject(task);
      const context = project ? yield* projectContext(project) : undefined;
      const prompt = renderPrompt({ task, project, context });

      // Best-effort, and never fatal: the prompt is the operation's result, so a host with no
      // clipboard (a headless client, an agent calling the verb) still gets it.
      if (globalThis.navigator?.clipboard) {
        yield* Effect.tryPromise(() => navigator.clipboard.writeText(prompt)).pipe(
          Effect.catchCause((cause) => Effect.sync(() => log.warn('clipboard write failed', { cause }))),
        );
      }

      return { prompt };
    }),
  ),
);

/** The project's own instructions, which is what a session working in it would run with. */
const projectContext = Effect.fnUntraced(function* (project: Project.Project) {
  if (!project.instructions) {
    return undefined;
  }
  const instructions = yield* Database.load(project.instructions);
  const text = yield* Database.load(instructions.text);
  return text.content.trim() || undefined;
});

type PromptInput = {
  task: Task.Task;
  project: Project.Project | undefined;
  context: string | undefined;
};

/**
 * The handoff, as one block a reader pastes into a coding agent: what the work is, where every
 * object it touches lives, and the instruction to claim the task before starting.
 *
 * Addresses rather than a transcription — the URIs resolve to the live objects, so an agent with the
 * space reads the current task and writes its progress back to the row the reader is watching.
 */
const renderPrompt = ({ task, project, context }: PromptInput): string => {
  const spaceId = Obj.getDatabase(task)?.spaceId;
  const lines: string[] = [
    `# ${task.title}`,
    '',
    task.description?.trim() || '_No description._',
    '',
    '## Addresses',
    '',
    `- Task URI: ${Obj.getURI(task)}`,
    `- Task ID: ${task.id}`,
  ];

  // The ECHO parent is the set the task belongs to; a sub-task's `parentTask` is a separate,
  // app-level edge, so the check is what keeps the label honest.
  const parent = Obj.getParent(task);
  if (parent && Obj.instanceOf(TaskSet.TaskSet, parent)) {
    lines.push(`- Task set URI: ${Obj.getURI(parent)}`);
  }
  if (project) {
    lines.push(`- Project URI: ${Obj.getURI(project)}`, `- Project ID: ${project.id}`);
  }
  if (spaceId) {
    lines.push(`- Space ID: ${spaceId}`);
  }

  lines.push('', '## Task', '', `- Status: ${task.status ?? 'todo'}`);
  if (task.priority) {
    lines.push(`- Priority: ${task.priority}`);
  }
  if (task.estimate) {
    lines.push(`- Estimate: ${task.estimate}`);
  }

  if (project) {
    lines.push('', `## Project: ${project.name ?? 'Untitled'}`, '');
    lines.push(project.description?.trim() || '_No description._');
    if (context) {
      lines.push('', '### Project instructions', '', context);
    }
  }

  const assign =
    `Assign yourself to this task before you start: invoke \`${UPDATE_TASK_KEY}\` with the task URI above, ` +
    '`assignee: { "role": "assistant" }` and `status: "started"`' +
    (spaceId ? `, in space \`${spaceId}\`.` : '.');

  lines.push(
    '',
    '## Instructions',
    '',
    assign,
    '',
    concat`
      Then do the work, reading the task and the project through their URIs rather than from this
      summary — it is a snapshot, and the objects are live.
    `,
    '',
    project
      ? concat`
          When you are done set the task's \`status\` to \`"review"\` with the same verb, and file
          anything you produced into the project's artifacts.
        `
      : concat`
          When you are done set the task's \`status\` to \`"review"\` with the same verb.
        `,
  );

  return lines.join('\n');
};

export default handler;
