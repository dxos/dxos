//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, type Database, DXN, Obj, Ref, Type } from '@dxos/echo';
import { CollectionItemAnnotation, Text } from '@dxos/schema';

import * as Task from './Task';
import * as TaskSet from './TaskSet';

/**
 * Markdown checklist document: the cheap, fluid form of work. Items promoted to durable
 * {@link Task} objects carry an `echo://` link back in the markdown line.
 */
export class Outline extends Type.makeObject<Outline>(DXN.make('org.dxos.type.outline', '0.2.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    content: Ref.Ref(Text.Text),
    /** Files the tasks promoted from this outline's items; created lazily on the first promotion. */
    taskSet: Schema.optional(Ref.Ref(TaskSet.TaskSet)),
  }).pipe(
    Annotation.IconAnnotation.set({ icon: 'ph--tree-structure--regular', hue: 'indigo' }),
    CollectionItemAnnotation.set(true),
  ),
) {}

export const make = ({ name, content }: { name?: string; content?: string } = {}): Outline => {
  return Obj.make(Outline, {
    name,
    content: Ref.make(Text.make({ content })),
  });
};

export const DEFAULT_TASK_SET_NAME = 'Untitled task set';

/**
 * Get the outline's task set, creating and linking one on first use.
 *
 * The create path runs to completion synchronously — awaiting before the assignment would let two
 * concurrent promotions each observe an unset ref and link a task set of their own.
 */
export const getOrCreateTaskSet = async (outline: Outline, db: Database.Database): Promise<TaskSet.TaskSet> => {
  const existing = outline.taskSet;
  if (existing) {
    return existing.load();
  }

  const taskSet = db.add(TaskSet.make({ name: outline.name ?? DEFAULT_TASK_SET_NAME }));
  Obj.update(outline, (outline) => {
    outline.taskSet = Ref.make(taskSet);
  });

  return taskSet;
};

/**
 * Create a task owned by the outline's task set. Membership is the ECHO parent edge
 * (`TaskSet → Task`), not a ref field.
 */
export const createTask = async (
  outline: Outline,
  db: Database.Database,
  title: string,
  props: Partial<Omit<Obj.MakeProps<typeof Task.Task>, 'title'>> = {},
): Promise<Task.Task> => {
  const taskSet = await getOrCreateTaskSet(outline, db);
  const task = db.add(Task.make({ title: title.trim(), status: 'todo', ...props }));
  Obj.setParent(task, taskSet);
  return task;
};

//
// Checklist markdown — the canonical text grammar of an outline (`- [ ]` / `- [x]` lines).
//

export type ChecklistItem = {
  title: string;
  done: boolean;
};

const CHECKLIST_LINE = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/;

/** Parse the checklist items out of markdown, ignoring non-checklist lines. */
export const parseChecklist = (markdown: string): ChecklistItem[] => {
  const items: ChecklistItem[] = [];
  for (const line of markdown.split('\n')) {
    const match = line.match(CHECKLIST_LINE);
    if (match) {
      items.push({ title: match[2].trim(), done: match[1] !== ' ' });
    }
  }
  return items;
};

export const renderChecklistItem = ({ title, done }: ChecklistItem): string => `- [${done ? 'x' : ' '}] ${title}`;

/**
 * Upsert checklist items into markdown by title match: existing lines keep their position (only
 * the checkbox is rewritten); new items are appended. Non-checklist lines are preserved verbatim.
 */
export const upsertChecklistItems = (markdown: string, items: readonly ChecklistItem[]): string => {
  const lines = markdown.length > 0 ? markdown.split('\n') : [];
  const pending = new Map(items.map((item) => [item.title, item]));
  const next = lines.map((line) => {
    const match = line.match(CHECKLIST_LINE);
    if (!match) {
      return line;
    }
    const item = pending.get(match[2].trim());
    if (!item) {
      return line;
    }
    pending.delete(item.title);
    return renderChecklistItem(item);
  });
  for (const item of pending.values()) {
    next.push(renderChecklistItem(item));
  }

  return next.join('\n');
};

/** True when the markdown has at least one unchecked checklist item. */
export const hasOpenItems = (markdown: string): boolean => parseChecklist(markdown).some((item) => !item.done);
