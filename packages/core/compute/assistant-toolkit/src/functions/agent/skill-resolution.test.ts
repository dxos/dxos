//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';

import { AiContext } from '@dxos/assistant';
import { Skill, Instructions } from '@dxos/compute';
import { Database, Feed, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { Text } from '@dxos/schema';

import { WebSearchSkill } from '../../skills';

// Regression coverage for the CRM-instructions failure: skills live only in the registry
// (referenced via `Ref.fromURI(Skill.registryURI(key))`), never forked into the space DB.
//
// `AiContext.Binder.bind` persists each bound skill ref to the conversation feed. A later
// turn (or spawned process) re-reads that ref with an empty in-memory cache and must resolve it
// on its own. If the instructions's registry skill is bound by its registry DXN ref, resolution
// stays in the registry and succeeds. If it is re-wrapped with `Ref.make` first (minting an
// EID ref to an object that only exists in the registry, never in the DB), the persisted ref
// dangles — in production the DB query blocks for its full 30s timeout; with a fresh binder here
// it simply resolves to nothing.

const TestLayer = AssistantTestLayer({
  types: [Text.Text],
});

const skillKey = 'org.dxos.skill.webSearch';

describe('Skill binding resolution (registry refs)', () => {
  it.effect(
    'a registry skill bound by its registry ref survives a feed round-trip',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db } = yield* Database.Service;

        // Register the web-search skill in the db registry (the resolver's registry),
        // the same way `plugin-instructions/RegistrySync` does in production.
        db.registry.add([WebSearchSkill.make()]);

        // Create a instructions referencing the skill purely by registry URI. Once added to the
        // DB its skill ref is a resolver-backed registry ref — exactly the ref `prompt.ts`
        // binds.
        const instructions = yield* Database.add(
          Instructions.make({
            name: 'resolution-test',
            text: 'noop',
            skills: [Ref.fromURI(Skill.registryURI(skillKey))],
          }),
        );
        yield* Database.flush();
        const registryRef = instructions.skills[0];

        const feed = yield* Database.add(Feed.make());
        yield* Database.flush();
        const runtime = yield* Effect.runtime<Database.Service>();

        // Bind the instructions's own registry ref (the fix) and persist it to the feed.
        const writer = new AiContext.Binder({ feed, runtime });
        yield* Effect.promise(() => writer.open());
        yield* Effect.promise(() => writer.bind({ skills: [registryRef], objects: [] }));

        // A fresh binder on the same feed models the next agent turn / spawned process: no
        // in-memory cache, so the persisted binding ref must resolve on its own.
        const reader = new AiContext.Binder({ feed, runtime });
        yield* Effect.promise(() => reader.open()).pipe(
          Effect.timeoutFail({
            duration: Duration.seconds(3),
            onTimeout: () => new Error('TIMED OUT resolving bound skill on feed re-read'),
          }),
        );

        const resolved = reader.getSkills();
        expect(resolved.map((bp) => Skill.getKey(bp))).toContain(skillKey);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 20_000 },
  );

  it.effect(
    'a registry skill re-wrapped with Ref.make (EID ref) dangles on feed re-read',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db } = yield* Database.Service;
        db.registry.add([WebSearchSkill.make()]);

        const instructions = yield* Database.add(
          Instructions.make({
            name: 'resolution-test',
            text: 'noop',
            skills: [Ref.fromURI(Skill.registryURI(skillKey))],
          }),
        );
        yield* Database.flush();
        const skill = yield* Database.load(instructions.skills[0]);

        const feed = yield* Database.add(Feed.make());
        yield* Database.flush();
        const runtime = yield* Effect.runtime<Database.Service>();

        // The pre-fix behaviour: re-wrap the resolved skill with `Ref.make`, minting an
        // EID ref that addresses a skill which only exists in the registry.
        const writer = new AiContext.Binder({ feed, runtime });
        yield* Effect.promise(() => writer.open());
        yield* Effect.promise(() => writer.bind({ skills: [Ref.make(skill)], objects: [] }));

        const reader = new AiContext.Binder({ feed, runtime });
        yield* Effect.promise(() => reader.open()).pipe(
          Effect.timeoutFail({
            duration: Duration.seconds(3),
            onTimeout: () => new Error('TIMED OUT resolving bound skill on feed re-read'),
          }),
        );

        // The EID ref cannot be recovered from the registry, so the fresh binder resolves nothing.
        const resolved = reader.getSkills();
        expect(resolved.map((bp) => Skill.getKey(bp))).not.toContain(skillKey);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 20_000 },
  );
});
