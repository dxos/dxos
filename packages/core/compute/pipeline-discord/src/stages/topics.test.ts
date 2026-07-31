//
// Copyright 2026 DXOS.org
//

// ECHO integration for phase 3: the pipeline produces Topic objects per drained target and Person
// objects for question askers, both keyed by foreign key so re-runs upsert instead of duplicate.

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { AgentRegistry, type Type } from '@dxos/crawler';
import { Database, Filter, Obj, Query } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Pipeline } from '@dxos/pipeline';
import { Person } from '@dxos/types';

import { DiscordPipeline } from '../pipeline';
import { replayStream } from '../replay';
import { THREADED_FIXTURE, deterministicAiService, fixtureSourceLayer, storesLayer } from '../testing';
import { Topic } from '../types';
import { topicsStage } from './topics';

const CONFIG: Type.Config = { channels: ['chan-1'], descendThreads: true };

describe('topics + persons over ECHO', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('pipeline persists Topics per target and Persons for askers, idempotently', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Topic.Topic, Person.Person] });
    const db = await peer.createDatabase();

    const layer = Layer.mergeAll(
      storesLayer(SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.orDie)),
      fixtureSourceLayer(THREADED_FIXTURE),
      deterministicAiService(),
    );

    const result = await EffectEx.runPromise(
      Effect.gen(function* () {
        yield* DiscordPipeline.run(CONFIG, { db });

        // Replay the topics stage twice more over the stored working set: upserts, no duplicates.
        const replayTopics = replayStream().pipe(topicsStage({ db }), Pipeline.run({ sink: () => Effect.void }));
        yield* replayTopics;
        yield* replayTopics;

        const registry = yield* AgentRegistry;
        const agents = yield* registry.list();

        const topics = yield* Database.query(Query.select(Filter.type(Topic.Topic))).run.pipe(
          Effect.provide(Database.layer(db)),
        );
        const persons = yield* Database.query(Query.select(Filter.type(Person.Person))).run.pipe(
          Effect.provide(Database.layer(db)),
        );
        return { agents, topics, persons };
      }).pipe(Effect.provide(layer)),
    );

    // Fixture channel: Alice + Bob post unrelated statements (two topics); the thread is one topic.
    expect(result.topics.length).toBe(3);
    const threadTopic = result.topics.find((topic) => topic.threadId === 'thread-1');
    expect(threadTopic).toBeDefined();
    expect(threadTopic?.participantLabels?.slice().sort()).toEqual(['Alice', 'Carol']);
    expect(threadTopic?.startMessageId).toBe('2000');
    expect(threadTopic?.endMessageId).toBe('2001');
    expect(threadTopic?.name?.length).toBeGreaterThan(0);
    expect(threadTopic?.summary?.length).toBeGreaterThan(0);

    const channelTopics = result.topics.filter((topic) => topic.threadId === 'chan-1');
    expect(channelTopics.length).toBe(2);
    expect(channelTopics.map((topic) => topic.startMessageId).sort()).toEqual(['1000', '1001']);

    // Only Alice asked a question ("Should Composer use OPFS…?") → exactly one Person, linked
    // from her agent profile by DXN.
    expect(result.persons.length).toBe(1);
    expect(result.persons[0].fullName).toBe('Alice');
    expect(Obj.getKeys(result.persons[0], 'discord.com')[0]?.id).toBe('Alice');
    const alice = result.agents.find((agent) => agent.label === 'Alice');
    // The linkage is the Person's canonical ECHO URI (`echo://…`; historical profiles may carry DXNs).
    expect(alice?.ref).toMatch(/^(echo:|dxn:)/);
  });
});
