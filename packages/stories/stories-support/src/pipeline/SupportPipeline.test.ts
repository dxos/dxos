//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Blob, Database, Feed, Filter, Obj, Relation, Tag } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { type Fact } from '@dxos/echo-memory';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { TagIndex, Text } from '@dxos/schema';
import { DraftMessage, Message, Organization, Person, Task, TaskSet } from '@dxos/types';

import { CORPUS, type CorpusMessage, Generator, type Seeded, seed } from '../generators/index.ts';
import { makeEntityExtractor } from '../processors/entities.ts';
import { makeResearcher } from '../processors/research.ts';
import { makeResponder } from '../processors/responder.ts';
import { Cites, Support } from '../types/index.ts';
import * as SupportPipeline from './SupportPipeline.ts';

const FAULT = CORPUS.filter((entry) => entry.fault === 'research').map((entry) => entry.text);

describe('SupportPipeline', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;
  let seeded: Seeded;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({
      types: [
        Blob.Blob,
        Cites.Cites,
        Feed.Feed,
        Mailbox.Mailbox,
        Markdown.Document,
        Message.Message,
        Organization.Organization,
        Person.Person,
        Tag.Tag,
        TagIndex.TagIndex,
        Task.Task,
        TaskSet.TaskSet,
        Text.Text,
      ],
    }));
    seeded = await seed(db);
  });

  afterEach(async () => {
    await builder.close();
  });

  /** Sends the entries through the feed and the pipeline, and returns what the pipeline reported. */
  const run = async (entries: readonly CorpusMessage[]) => {
    const feed = await seeded.mailbox.feed.load();
    const inputs: SupportPipeline.Input[] = [];
    for (const entry of entries) {
      const message = Generator.toMessage(entry);
      await EffectEx.runAndForwardErrors(Feed.append(feed, [message]).pipe(Effect.provide(Database.layer(db))));
      inputs.push({ key: entry.key, message, recorded: entry.facts });
    }

    const facts: Fact.Fact[] = [];
    const stages: Array<{ message: string; stage: Support.StageRun }> = [];
    const envelopes: SupportPipeline.Envelope[] = [];
    const host = { db };
    await EffectEx.runAndForwardErrors(
      SupportPipeline.run(
        Stream.fromIterable(inputs),
        {
          db,
          mailbox: Obj.getURI(seeded.mailbox),
          taskSet: seeded.taskSet,
          processors: {
            entities: makeEntityExtractor(host),
            researcher: makeResearcher(host, { failOn: (question) => FAULT.includes(question) }),
            responder: makeResponder(host),
          },
          putFacts: (found) => Effect.sync(() => void facts.push(...found)),
          onStage: (message, stage) => stages.push({ message, stage }),
        },
        (envelope) => envelopes.push(envelope),
      ),
    );
    await db.flush({ indexes: true });
    return { inputs, facts, stages, envelopes };
  };

  const finalStages = (stages: Array<{ message: string; stage: Support.StageRun }>, message: string) =>
    Object.fromEntries(
      stages.filter((entry) => entry.message === message).map(({ stage }) => [stage.id, stage.status] as const),
    );

  test('an answerable question ends in a draft that cites its document', async ({ expect }) => {
    const { inputs, stages, facts } = await run([CORPUS[0]]);

    const messages = await db.query(Filter.type(Message.Message)).run();
    const drafts = messages.filter((message) => DraftMessage.belongsTo(message, Obj.getURI(seeded.mailbox)));
    expect(drafts).toHaveLength(1);
    expect(drafts[0].parentMessage).toBe(inputs[0].message.id);
    expect(drafts[0].properties?.subject).toBe('Re: CPU time limit');
    expect(Message.extractText(drafts[0])).toContain('30 seconds by default');

    const [citation] = await db.query(Filter.type(Cites.Cites)).run();
    expect(Relation.getSource(citation).id).toBe(drafts[0].id);
    expect(Obj.getLabel(Relation.getTarget(citation))).toBe('Workers platform limits');
    expect(citation.heading).toBe('CPU time');

    expect(await db.query(Filter.type(Task.Task)).run()).toHaveLength(0);
    expect(facts.map(Support.kindOf)).toEqual(['question', 'statement']);
    expect(finalStages(stages, inputs[0].message.id)).toEqual({
      ingest: 'success',
      entities: 'success',
      facts: 'success',
      research: 'success',
      respond: 'success',
      triage: 'success',
    });
  });

  test('an unanswerable question ends in a task, not a draft', async ({ expect }) => {
    const { inputs } = await run([CORPUS[1]]);

    const tasks = await db.query(Filter.type(Task.Task)).run();
    expect(tasks.map((task) => task.title)).toEqual([CORPUS[1].text]);
    expect(Obj.getMeta(tasks[0]).keys).toEqual([
      { source: SupportPipeline.MESSAGE_KEY_SOURCE, id: inputs[0].message.id },
    ]);
    expect(seeded.taskSet.tasks.map((ref) => ref.target?.id)).toEqual([tasks[0].id]);
    const messages = await db.query(Filter.type(Message.Message)).run();
    expect(messages.filter((message) => DraftMessage.instanceOf(message))).toHaveLength(0);
  });

  test('a failed research stage skips the responder and still makes a task', async ({ expect }) => {
    const [entry] = CORPUS.filter((message) => message.fault === 'research');
    const { inputs, stages } = await run([entry]);

    expect(finalStages(stages, inputs[0].message.id)).toEqual({
      ingest: 'success',
      entities: 'success',
      facts: 'success',
      research: 'failed',
      triage: 'success',
    });
    expect((await db.query(Filter.type(Task.Task)).run()).map((task) => task.title)).toEqual([entry.text]);
  });

  test('senders are matched against the people and organizations in the space', async ({ expect }) => {
    // Ada and her organization are seeded; Ben joins the seeded organization; Chen and his are new.
    await run([CORPUS[0], CORPUS[1], CORPUS[2], CORPUS[3]]);

    const people = await db.query(Filter.type(Person.Person)).run();
    expect(people.map((person) => person.fullName).sort()).toEqual(['Ada Okafor', 'Ben Ruiz', 'Chen Wei']);
    const organizations = await db.query(Filter.type(Organization.Organization)).run();
    expect(organizations.map((organization) => organization.name).sort()).toEqual(['Lumen Labs', 'Northwind']);
    const ben = people.find((person) => person.fullName === 'Ben Ruiz');
    expect(ben?.organization?.target?.name).toBe('Lumen Labs');
  });

  test('the whole corpus produces its expected drafts and tasks', async ({ expect }) => {
    const { envelopes } = await run(CORPUS);

    expect(
      envelopes.map(({ outcomes }) =>
        outcomes.map(({ decision }) =>
          decision.kind === 'draft'
            ? { kind: 'draft', document: decision.citations[0].title }
            : { kind: 'task', reason: decision.reason },
        ),
      ),
    ).toEqual(CORPUS.map((entry) => entry.expected));
  });
});
