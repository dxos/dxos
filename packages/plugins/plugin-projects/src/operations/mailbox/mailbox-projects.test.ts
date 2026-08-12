//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AiService } from '@dxos/ai';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { Collection, Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { invariant } from '@dxos/invariant';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { TagIndex, Text } from '@dxos/schema';
import { Message, Organization, Person, Task, TaskSet } from '@dxos/types';

import { scaffoldProject } from '../../templates';
import * as ProjectOperation from '../../types/ProjectOperation';
import createTrackingProject from './create-tracking-project';
import updateInvestorLog from './update-investor-log';
import updateProjectTasks from './update-project-tasks';
import updateTravelLog from './update-travel-log';

const testLayer = () =>
  TestDatabaseLayer({
    types: [
      Collection.Collection,
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

type MessageProps = {
  email: string;
  name?: string;
  subject: string;
  body?: string;
  threadId?: string;
};

const makeMessage = ({ email, name, subject, body, threadId }: MessageProps, index: number) =>
  Message.make({
    created: new Date(Date.parse('2026-07-01T00:00:00.000Z') + index * 60_000).toISOString(),
    sender: { email, name },
    threadId,
    blocks: [{ _tag: 'text', text: body ?? `Body of ${subject}` }],
    properties: { subject },
  });

const seed = Effect.fnUntraced(function* (messages: MessageProps[]) {
  const { db } = yield* Database.Service;
  const mailbox = db.add(Mailbox.make({ name: 'Inbox' }));
  const feed = yield* Database.load(mailbox.feed);
  yield* Effect.promise(() => db.appendToFeed(feed, messages.map(makeMessage)));
  const project = db.add(scaffoldProject({ name: 'Test Project' }));
  yield* Effect.promise(() => db.flush());
  return { db, mailbox, feed, project };
});

/** The markdown content of the single artifact document with the given name. */
const artifactContent = Effect.fnUntraced(function* (project: Project.Project, name: string) {
  const artifacts = yield* Database.load(project.artifacts!);
  const documents: Markdown.Document[] = [];
  for (const ref of artifacts.objects) {
    const object = yield* Effect.promise(() => ref.load());
    if (Obj.instanceOf(Markdown.Document, object) && object.name === name) {
      documents.push(object);
    }
  }
  expect(documents).toHaveLength(1);
  const text = yield* Database.load(documents[0].content);
  return text.content;
});

describe('mailbox project pipelines', () => {
  it.effect('UpdateProjectTasks tracks requests as tasks, idempotently, preserving user edits', () =>
    Effect.gen(function* () {
      const { db, feed, mailbox, project } = yield* seed([
        { email: 'ngudmand@kirkconsult.com', name: 'Nicole Gudmand', subject: "Dmytro's July Pmt - Approval" },
        { email: 'mahern@kirkconsult.com', name: 'Madeline Ahern', subject: "Approval for Dmytro's payment" },
        { email: 'news@bulk.io', subject: 'Weekly digest' },
      ]);

      const first = yield* updateProjectTasks.handler({
        project: Ref.make(project),
        mailbox: Ref.make(mailbox),
        senders: ['kirkconsult.com'],
      });
      expect(first).toMatchObject({ scanned: 3, matched: 2, created: 2 });

      const tasks = yield* Database.query(Filter.type(Task.Task)).run;
      expect(tasks.map((task) => task.title).sort()).toEqual([
        "Approval for Dmytro's payment",
        "Dmytro's July Pmt - Approval",
      ]);

      // The user completes a task; a rerun must not resurrect or duplicate it.
      Obj.update(tasks[0], (task) => {
        task.status = 'done';
      });
      const rerun = yield* updateProjectTasks.handler({
        project: Ref.make(project),
        mailbox: Ref.make(mailbox),
        senders: ['kirkconsult.com'],
      });
      expect(rerun.created).toBe(0);
      expect((yield* Database.query(Filter.type(Task.Task)).run).length).toBe(2);

      // A new message from a tracked colleague yields exactly one new task.
      yield* Effect.promise(() =>
        db.appendToFeed(feed, [
          makeMessage({ email: 'mkirkendall@kirkconsult.com', subject: 'July invoice approval' }, 9),
        ]),
      );
      const incremental = yield* updateProjectTasks.handler({
        project: Ref.make(project),
        mailbox: Ref.make(mailbox),
        senders: ['kirkconsult.com'],
      });
      expect(incremental.created).toBe(1);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('UpdateTravelLog regenerates the bookings document from travel mail', () =>
    Effect.gen(function* () {
      const { db, feed, mailbox, project } = yield* seed([
        { email: 'noreply@united.com', subject: 'Your flight confirmation UA123' },
        { email: 'reservations@hotelchain.com', subject: 'Hotel reservation confirmed' },
        { email: 'alice@example.com', subject: 'Lunch?' },
      ]);

      const first = yield* updateTravelLog.handler({ project: Ref.make(project), mailbox: Ref.make(mailbox) });
      expect(first).toMatchObject({ scanned: 3, matched: 2 });
      const content = yield* artifactContent(project, 'Travel Bookings');
      expect(content).toContain('UA123');
      expect(content).toContain('Hotel reservation confirmed');
      expect(content).not.toContain('Lunch?');

      // Regeneration: a new booking appears; still ONE document artifact.
      yield* Effect.promise(() =>
        db.appendToFeed(feed, [makeMessage({ email: 'noreply@delta.com', subject: 'Itinerary DL42' }, 9)]),
      );
      const rerun = yield* updateTravelLog.handler({ project: Ref.make(project), mailbox: Ref.make(mailbox) });
      expect(rerun.matched).toBe(3);
      const updated = yield* artifactContent(project, 'Travel Bookings');
      expect(updated).toContain('DL42');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('UpdateInvestorLog extracts contacts and writes one section per conversation', () =>
    Effect.gen(function* () {
      const { mailbox, project } = yield* seed([
        {
          email: 'lucia@backed.vc',
          name: 'Lucia Cerchlan',
          subject: 'Quarterly update',
          threadId: 'thread-q',
          body: 'Thanks for the update — numbers look strong.',
        },
        { email: 'lucia@backed.vc', subject: 'Re: Quarterly update', threadId: 'thread-q' },
        { email: 'martina@blueyard.com', name: 'Martina Bortot', subject: 'Portfolio reporting', threadId: 'thread-p' },
        { email: 'alice@example.com', subject: 'Not an investor' },
      ]);

      const result = yield* updateInvestorLog
        .handler({
          project: Ref.make(project),
          mailbox: Ref.make(mailbox),
          domains: ['backed.vc', 'blueyard.com'],
        })
        .pipe(Effect.provide(AiService.notAvailable));
      expect(result).toMatchObject({ scanned: 4, matched: 3, threads: 2, contacts: 2 });

      // Contact graph: a Person per investor sender, each linked to a derived Organization.
      const people = yield* Database.query(Filter.type(Person.Person)).run;
      expect(people.map((person) => person.emails?.[0]?.value).sort()).toEqual([
        'lucia@backed.vc',
        'martina@blueyard.com',
      ]);
      expect((yield* Database.query(Filter.type(Organization.Organization)).run).length).toBe(2);

      const content = yield* artifactContent(project, 'Investor Conversations');
      expect(content).toContain('## Quarterly update');
      expect(content).toContain('## Portfolio reporting');
      expect(content).toContain('lucia@backed.vc');
      expect(content).not.toContain('Not an investor');
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('CreateTrackingProject scaffolds the project, routine, and backfilled tasks from a message', () =>
    Effect.gen(function* () {
      const { mailbox } = yield* seed([
        { email: 'ngudmand@kirkconsult.com', name: 'Nicole Gudmand', subject: 'Monthly Meeting' },
        { email: 'mahern@kirkconsult.com', name: 'Madeline Ahern', subject: "Approval for Dmytro's payment" },
        { email: 'news@bulk.io', subject: 'Weekly digest' },
      ]);
      const feed = yield* Database.load(mailbox.feed);
      const [message] = yield* Feed.query(feed, Filter.type(Message.Message)).run;

      const result = yield* createTrackingProject.handler({ mailbox: Ref.make(mailbox), message });
      // The sender's corporate domain defines the tracked group — colleagues included.
      expect(result.senders).toEqual(['kirkconsult.com']);
      expect(result.pipeline).toBe('tasks');
      expect(result.tasks).toBe(2);

      const projects = yield* Database.query(Filter.type(Project.Project)).run;
      const project = projects.find((candidate) => candidate.id === result.projectId);
      expect(project?.name).toBe('Kirkconsult — Requests');

      // The tracking routine: owned by the project, runnable-bound, feed-triggered, disabled.
      invariant(project);
      expect(project.routines).toHaveLength(1);
      const routine = yield* Effect.promise(() => project.routines[0].load());
      expect(routine.spec?.kind).toBe('runnable');
      expect(routine.triggers).toHaveLength(1);
      const trigger = yield* Effect.promise(() => routine.triggers[0].load());
      expect(trigger.enabled).toBe(false);
      expect(trigger.spec?.kind).toBe('feed');

      // The backfill is idempotent with the routine's later firings: re-running the sync creates nothing.
      const rerun = yield* updateProjectTasks.handler({
        project: Ref.make(project),
        mailbox: Ref.make(mailbox),
        senders: result.senders,
      });
      expect(rerun.created).toBe(0);
    }).pipe(Effect.provide(testLayer())),
  );
  it.effect('scope and pipeline choose who is followed and which operation the routine binds', () =>
    Effect.gen(function* () {
      const { mailbox } = yield* seed([
        { email: 'ngudmand@kirkconsult.com', name: 'Nicole Gudmand', subject: 'Monthly Meeting' },
        { email: 'mahern@kirkconsult.com', name: 'Madeline Ahern', subject: "Approval for Dmytro's payment" },
      ]);
      const feed = yield* Database.load(mailbox.feed);
      const [message] = yield* Feed.query(feed, Filter.type(Message.Message)).run;

      // `sender` scope narrows to the individual, and the summaries pipeline binds a different
      // runnable — so no task backfill happens.
      const result = yield* createTrackingProject.handler({
        mailbox: Ref.make(mailbox),
        message,
        scope: 'sender',
        pipeline: 'summaries',
        name: 'Nicole — Threads',
      });
      expect(result.senders).toEqual(['ngudmand@kirkconsult.com']);
      expect(result.pipeline).toBe('summaries');
      expect(result.tasks).toBe(0);
      expect((yield* Database.query(Filter.type(Task.Task)).run).length).toBe(0);

      const projects = yield* Database.query(Filter.type(Project.Project)).run;
      const project = projects.find((candidate) => candidate.id === result.projectId);
      expect(project?.name).toBe('Nicole — Threads');
      invariant(project);
      const routine = yield* Effect.promise(() => project.routines[0].load());
      // Compared against the operation's own key, so renaming the operation moves this assertion
      // with it rather than leaving a stale string behind.
      expect(routine.spec?.kind === 'runnable' && routine.spec.runnable.uri.toString()).toContain(
        ProjectOperation.UpdateInvestorLog.meta.key.toString(),
      );
    }).pipe(Effect.provide(testLayer())),
  );
});
