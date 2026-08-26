//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as Project from '@dxos/compute/Project';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { normalizeEmail } from '@dxos/extractor-lib';
import { invariant } from '@dxos/invariant';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Message, Task } from '@dxos/types';

import { meta } from '#meta';

/** Foreign-key source for objects the mailbox-project pipelines create (tasks), for idempotent upserts. */
export const PROJECT_PIPELINE_KEY_SOURCE = meta.profile.key;

/**
 * Finds the named markdown document among the project's artifacts, creating and filing it on first
 * use. The name is the identity — pipelines regenerate a document's content wholesale, so reruns
 * converge on one artifact instead of appending copies.
 */
export const findOrCreateDocumentArtifact = (project: Project.Project, name: string) =>
  Effect.gen(function* () {
    const { db } = yield* Database.Service;
    for (const ref of project.artifacts) {
      const object = yield* Effect.promise(() => ref.load());
      if (Obj.instanceOf(Markdown.Document, object) && object.name === name) {
        return object;
      }
    }
    const document = db.add(Markdown.make({ name }));
    Obj.update(project, (project) => {
      project.artifacts = [...project.artifacts, Ref.make(document)];
    });
    return document;
  });

/** Replaces the document's full markdown content. */
export const setDocumentContent = (document: Markdown.Document, content: string) =>
  Effect.gen(function* () {
    const text = yield* Database.load(document.content);
    Obj.update(text, (text) => {
      text.content = content;
    });
  });

/**
 * Creates a task in the project's task set unless one with the same foreign key already exists —
 * the message id keys the task, so re-running a request-tracking pipeline never duplicates a task
 * (and completing/editing a task survives reruns untouched). Returns whether a task was created.
 */
export const upsertTask = (
  project: Project.Project,
  { id, title, description }: { id: string; title: string; description?: string },
) =>
  Effect.gen(function* () {
    const { db } = yield* Database.Service;
    const key = { source: PROJECT_PIPELINE_KEY_SOURCE, id };
    const existing = yield* Effect.promise(() => db.query(Filter.foreignKeys(Task.Task, [key])).run());
    if (existing.length > 0) {
      return false;
    }
    invariant(project.taskSet, 'Project has no task set.');
    const taskSet = yield* Database.load(project.taskSet);
    const task = db.add(Obj.make(Task.Task, { title, description, status: 'todo', [Obj.Meta]: { keys: [key] } }));
    // Membership and order are the set's `tasks` array; the parent edge rides along for cascade.
    Obj.update(taskSet, (taskSet) => {
      taskSet.tasks = [...taskSet.tasks, Ref.make(task)];
    });
    Obj.setParent(task, taskSet);
    return true;
  });

/** Whether the message's sender matches any entry — a full email address or a bare domain. */
export const senderMatches = (message: Message.Message, senders: readonly string[]): boolean => {
  const email = normalizeEmail(message.sender?.email);
  if (!email) {
    return false;
  }
  const domain = email.split('@')[1];
  return senders.some((entry) => {
    const normalized = entry.trim().toLowerCase();
    return normalized === email || normalized === domain;
  });
};

/** Feed messages ascending by `created` (skipping unparseable dates), the order artifacts render in. */
export const messagesAscending = (messages: readonly Message.Message[]): Message.Message[] =>
  messages
    .filter((message) => Number.isFinite(Date.parse(message.created)))
    .sort((left, right) => Date.parse(left.created) - Date.parse(right.created));

/** Groups messages into conversations by `threadId`, falling back to the normalized subject. */
export const groupByThread = (messages: readonly Message.Message[]): Map<string, Message.Message[]> => {
  const threads = new Map<string, Message.Message[]>();
  for (const message of messages) {
    const subject = typeof message.properties?.subject === 'string' ? message.properties.subject : '';
    const key = message.threadId ?? subject.replace(/^\s*(?:re|fwd?)\s*:\s*/i, '').toLowerCase();
    const list = threads.get(key);
    if (list) {
      list.push(message);
    } else {
      threads.set(key, [message]);
    }
  }
  return threads;
};
