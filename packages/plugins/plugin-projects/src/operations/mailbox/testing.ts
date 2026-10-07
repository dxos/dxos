//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Feed, Obj } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Cursor } from '@dxos/link';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { TagIndex, Text } from '@dxos/schema';
import { Message, Organization, Person, Task, TaskSet } from '@dxos/types';

import { scaffoldProject } from '../../templates/index.ts';

export const testLayer = () =>
  TestDatabaseLayer({
    types: [
      Cursor.Cursor,
      Feed.Feed,
      Instructions.Instructions,
      Mailbox.Mailbox,
      Markdown.Document,
      Message.Message,
      Organization.Organization,
      Person.Person,
      Project.Project,
      Routine.Routine,
      TagIndex.TagIndex,
      Task.Task,
      TaskSet.TaskSet,
      Text.Text,
      Trigger.Trigger,
    ],
  });

export type MessageProps = {
  email: string;
  name?: string;
  subject: string;
  body?: string;
  threadId?: string;
};

export const makeMessage = ({ email, name, subject, body, threadId }: MessageProps, index: number) =>
  Message.make({
    created: new Date(Date.parse('2026-07-01T00:00:00.000Z') + index * 60_000).toISOString(),
    sender: { email, name },
    threadId,
    blocks: [{ _tag: 'text', text: body ?? `Body of ${subject}` }],
    properties: { subject },
  });

/** Named so the declaration emit for {@link seed} does not have to reach for an unexportable inferred type. */
export type Seeded = {
  db: Database.Database;
  mailbox: Mailbox.Mailbox;
  feed: Feed.Feed;
  project: Project.Project;
};

export const seed = Effect.fnUntraced(function* (messages: MessageProps[]) {
  const { db } = yield* Database.Service;
  const mailbox = db.add(Mailbox.make({ name: 'Inbox' }));
  const feed = yield* Database.load(mailbox.feed);
  yield* Effect.promise(() => db.appendToFeed(feed, messages.map(makeMessage)));
  const project = db.add(scaffoldProject({ name: 'Test Project' }));
  yield* Effect.promise(() => db.flush());
  const seeded: Seeded = { db, mailbox, feed, project };
  return seeded;
});

export const artifactContents = Effect.fnUntraced(function* (project: Project.Project, name: string) {
  const documents: Markdown.Document[] = [];
  for (const ref of project.artifacts) {
    const object = yield* Effect.promise(() => ref.load());
    if (Obj.instanceOf(Markdown.Document, object) && object.name === name) {
      documents.push(object);
    }
  }
  const contents: string[] = [];
  for (const document of documents) {
    const text = yield* Database.load(document.content);
    contents.push(text.content ?? '');
  }
  return contents;
});
