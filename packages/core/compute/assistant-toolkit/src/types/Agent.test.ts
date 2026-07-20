//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { Skill } from '@dxos/compute';
import { Database, Feed, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';

import { Agent, Chat, Plan } from '../types';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  types: [Agent.Agent, Plan.Plan, Chat.Chat, Chat.CompanionTo, Skill.Skill, Feed.Feed, Text.Text],
});

const makeAgent = Effect.fnUntraced(function* () {
  return yield* Agent.makeInitialized(
    { name: 'Test', instructions: '' },
    Skill.make({ key: 'org.dxos.test.skill', name: 'Test' }),
  );
});

describe('Agent.addArtifact', () => {
  // The id forms a tool may hand back: a bare entity id, or a fully-qualified ECHO URI. LLMs commonly
  // strip a returned URI down to the bare id, so both must resolve.
  it.scoped(
    'adds a freshly-created object by bare entity id',
    Effect.fnUntraced(
      function* ({ expect }) {
        const agent = yield* makeAgent();
        const doc = yield* Database.add(Text.make({ content: 'hello' }));

        yield* Agent.addArtifact(agent, { name: 'Doc', id: doc.id });

        expect(agent.artifacts).toHaveLength(1);
        expect(agent.artifacts[0]!.name).toBe('Doc');
        const loaded = yield* Database.load(agent.artifacts[0]!.data);
        expect(loaded.id).toBe(doc.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.scoped(
    'adds an object by fully-qualified ECHO URI',
    Effect.fnUntraced(
      function* ({ expect }) {
        const agent = yield* makeAgent();
        const doc = yield* Database.add(Text.make({ content: 'world' }));

        yield* Agent.addArtifact(agent, { name: 'Doc', id: Obj.getURI(doc) });

        expect(agent.artifacts).toHaveLength(1);
        const loaded = yield* Database.load(agent.artifacts[0]!.data);
        expect(loaded.id).toBe(doc.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  // Best-effort: the reference is stored without resolving (the artifact may be created by a separate
  // invocation and not yet visible); resolution happens lazily when the artifact is later read.
  it.scoped(
    'stores a reference without resolving it (resolves lazily)',
    Effect.fnUntraced(
      function* ({ expect }) {
        const agent = yield* makeAgent();
        const doc = yield* Database.add(Text.make({ content: 'later' }));
        const bareId = doc.id;

        // Add by bare id; the helper must not require the artifact to be resolvable at add time.
        yield* Agent.addArtifact(agent, { name: 'Doc', id: bareId });
        expect(agent.artifacts).toHaveLength(1);

        // The stored ref still resolves to the object.
        const loaded = yield* Database.load(agent.artifacts[0]!.data);
        expect(loaded.id).toBe(doc.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
