//
// Copyright 2026 DXOS.org
//

import { parseMdlBlocks } from '@dxos/deus/parse';

import { GOAL_STATUSES, type GoalStatus } from './types.ts';

/**
 * A Composer task as the DXOS MCP server returns it: `tasks.recordSession` gives `{ title, dxn, status }`, while
 * `tasks.list` gives the whole object, with `@uri` (or a bare `id`) and the `delegate` actor.
 */
export type ComposerTask = {
  'dxn'?: string;
  '@uri'?: string;
  'id'?: string;
  'title'?: string;
  'status'?: string;
  'delegate'?: { role?: string; subject?: { '/'?: string } };
};

export type SyncResult = {
  text: string;
  /** Goal ids added for tasks the board did not have. */
  added: string[];
  /** Goal ids whose status changed to the task's. */
  updated: string[];
  /** Goal ids linked to a task the input did not contain; the input of `recordSession` holds open tasks only. */
  missing: string[];
  /** Tasks left out because the input gave no `echo:` URI for them; a bare id names no space to link to. */
  skipped: string[];
};

const TITLE_WORDS = 12;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const stringField = (record: Record<string, unknown>, key: string): string | undefined =>
  typeof record[key] === 'string' ? record[key] : undefined;

/** Reads one task, keeping only the fields the sync uses; anything else in the MCP result is ignored. */
const readTask = (value: unknown): ComposerTask | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const delegate = isRecord(value.delegate) ? value.delegate : undefined;
  const subject = delegate && isRecord(delegate.subject) ? stringField(delegate.subject, '/') : undefined;
  return {
    'dxn': stringField(value, 'dxn'),
    '@uri': stringField(value, '@uri'),
    'id': stringField(value, 'id'),
    'title': stringField(value, 'title'),
    'status': stringField(value, 'status'),
    ...(delegate ? { delegate: { role: stringField(delegate, 'role'), subject: { '/': subject } } } : {}),
  };
};

/** The tasks of a saved MCP result: an object with a `tasks` array, or the array itself; undefined for neither. */
export const readTasks = (json: unknown): ComposerTask[] | undefined => {
  const list = Array.isArray(json) ? json : isRecord(json) ? json.tasks : undefined;
  return Array.isArray(list)
    ? list.map(readTask).filter((task): task is ComposerTask => task !== undefined)
    : undefined;
};

/** The trailing object id of an `echo:` URI, so `echo:///<id>` and `echo://<space>/<id>` compare equal. */
export const objectId = (uri: string | undefined): string | undefined => uri?.split('/').filter(Boolean).at(-1);

/** The task's `echo:` URI; a bare `id` is not one, since the goal's `task:` must name the object's space. */
const taskUri = (task: ComposerTask): string | undefined =>
  [task.dxn, task['@uri']].find((uri) => uri?.startsWith('echo:'));

const goalStatus = (status: string | undefined): GoalStatus =>
  GOAL_STATUSES.find((value): value is GoalStatus => value === status) ?? 'todo';

/** A goal title is one line of 12 words at most (`lang/session.mdl` rule 1), and a colon would end the header. */
const goalTitle = (title: string | undefined): string => {
  const normalized = (title ?? '').replaceAll(':', ' -').replace(/\s+/g, ' ').trim();
  const words = (normalized || 'Untitled task').split(' ');
  return words.length > TITLE_WORDS ? `${words.slice(0, TITLE_WORDS).join(' ')}…` : words.join(' ');
};

/**
 * Keeps the tasks a session works: those whose `delegate.subject` is one of the session's objects (one per space it is
 * recorded in). With none given every task is kept, which is right for `recordSession` output because the server
 * already filtered it.
 */
export const delegatedTo = (tasks: readonly ComposerTask[], sessionObjects: readonly string[]): ComposerTask[] => {
  const ids = new Set(sessionObjects.map(objectId));
  return ids.size === 0 ? [...tasks] : tasks.filter((task) => ids.has(objectId(task.delegate?.subject?.['/'])));
};

/**
 * Merges Composer tasks into a `SESSION.mdl` as goals linked by `task: <echo URI>`. A linked goal takes the task's
 * status; a task with no goal gets a new `goal` at the end of `## Goals`. Titles stay as the board wrote them, since
 * the board's words are checked and the task's are not.
 */
export const syncTasks = (text: string, tasks: readonly ComposerTask[]): SyncResult => {
  const lines = text.split('\n');
  const blocks = parseMdlBlocks(text);
  const lineOf = (offset: number) => text.slice(0, offset).split('\n').length - 1;

  const goals = blocks
    .filter((block) => block.type === 'goal')
    .map((block) => {
      const task = block.body.match(/^ {2}task:\s*(\S+)\s*$/m)?.[1];
      return { id: block.id, task: objectId(task), fence: lineOf(block.from) };
    });

  // Several goals may mirror one task, and each of them follows its status.
  const byTask = new Map<string, typeof goals>();
  for (const goal of goals) {
    if (goal.task) {
      byTask.set(goal.task, [...(byTask.get(goal.task) ?? []), goal]);
    }
  }
  const seen = new Set<string>();
  const skipped: string[] = [];
  const updated: string[] = [];
  const added: string[] = [];
  const appended: string[][] = [];
  let next = Math.max(0, ...goals.map((goal) => Number(goal.id.replace(/^G-/, '')) || 0)) + 1;

  for (const task of tasks) {
    const uri = taskUri(task);
    const id = objectId(uri);
    if (!uri || !id) {
      skipped.push(task.title ?? task.id ?? '(untitled)');
      continue;
    }
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    const status = goalStatus(task.status);
    const linked = byTask.get(id);
    if (linked) {
      for (const goal of linked) {
        // The block's lines run from the fence to the closing fence; only its `status:` line changes.
        for (let index = goal.fence + 1; index < lines.length && !lines[index].startsWith('```'); index++) {
          const match = lines[index].match(/^ {2}status:\s*(\S+)\s*$/);
          if (match) {
            if (match[1] !== status) {
              lines[index] = `  status: ${status}`;
              updated.push(goal.id);
            }
            break;
          }
        }
      }
      continue;
    }
    const goalId = `G-${next++}`;
    added.push(goalId);
    appended.push([
      '```mdl',
      `goal ${goalId}: ${goalTitle(task.title)}`,
      `  status: ${status}`,
      `  task: ${uri}`,
      '```',
    ]);
  }

  if (appended.length > 0) {
    insertGoals(lines, appended);
  }

  const missing = goals.filter((goal) => goal.task && !seen.has(goal.task)).map((goal) => goal.id);
  return { text: lines.join('\n'), added, updated, missing, skipped };
};

/** Puts new goal blocks after the last line of `## Goals`, before the next `##` heading, one blank line apart. */
const insertGoals = (lines: string[], goalBlocks: readonly string[][]) => {
  const blocks = goalBlocks.flatMap((block) => ['', ...block]);
  const heading = lines.findIndex((line) => /^## Goals\s*$/.test(line));
  if (heading === -1) {
    lines.push('', '## Goals', ...blocks);
    return;
  }
  let end = lines.findIndex((line, index) => index > heading && /^## /.test(line));
  end = end === -1 ? lines.length : end;
  // Trailing blank lines stay between the last goal and the next heading.
  let insertAt = end;
  while (insertAt > heading + 1 && lines[insertAt - 1].trim() === '') {
    insertAt--;
  }
  lines.splice(insertAt, 0, ...blocks);
};

/**
 * The ids Composer may file this session under, most likely first. A cloud session is filed under its claude.ai id
 * (`session_…`, the `cse_…` id with its prefix changed); a local one under the CLI's id, which the plugin's
 * `recordSession` hook sends.
 */
export const sessionIds = (env: NodeJS.ProcessEnv = process.env): string[] =>
  [env.CLAUDE_CODE_REMOTE_SESSION_ID?.replace(/^cse_/, 'session_'), env.CLAUDE_CODE_SESSION_ID].filter(
    (id): id is string => typeof id === 'string' && id.length > 0,
  );
