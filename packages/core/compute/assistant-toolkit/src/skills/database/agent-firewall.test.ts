//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Skill } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Query } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AgentService } from '@dxos/functions-runtime';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { EntityId, PublicKey } from '@dxos/keys';
import { Message, Organization } from '@dxos/types';

import { DatabaseHandlers } from './operations';
import DatabaseSkill from './skill';

// Agent firewall: a space-resident (T0) agent is confined to the space hosting it. These tests put a
// second ("foreign") space in the SAME in-process Hypergraph as the agent and assert the agent cannot
// read it (query / load) and cannot write into it. The confinement mechanism itself is unit-tested in
// echo-client/src/hypergraph.test.ts; here we verify it end-to-end through a real agent turn.
// See docs/design/agent-firewall.md.

EntityId.dangerouslyDisableRandomness();

// Fixed key → deterministic foreign spaceId, so the foreign object URI embedded in prompts is stable
// across runs (required for memoized conversations). Distinct from the harness home space key.
const FOREIGN_SPACE_KEY = PublicKey.from('feedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedfacefeedface');
const FOREIGN_ORG_NAME = 'Cyberdyne Systems';

// Captured when the layer builds (onPeerReady): a fully-qualified URI (`echo://<foreignSpace>/<id>`)
// to an object only present in the foreign space, and a counter that queries the foreign space
// directly (used to assert the agent never wrote into it).
let foreignOrgUri: string;
let countInForeignSpace: (name: string) => Promise<number>;

const baseOptions = {
  operationHandlers: DatabaseHandlers,
  types: [Organization.Organization, Skill.Skill, Feed.Feed],
  skills: [DatabaseSkill.make()],
  aiServicePreset: 'edge-remote',
  // Create a sibling space on the agent's peer (shared Hypergraph) and seed an object only it holds.
  onPeerReady: (peer) =>
    Effect.promise(async () => {
      const foreignDb = await peer.createDatabase(FOREIGN_SPACE_KEY);
      const org = foreignDb.add(Obj.make(Organization.Organization, { name: FOREIGN_ORG_NAME }));
      await foreignDb.flush();
      foreignOrgUri = Obj.getURI(org);
      countInForeignSpace = async (name) =>
        (await foreignDb.query(Query.type(Organization.Organization, { name })).run()).length;
    }),
} satisfies Parameters<typeof AssistantTestLayer>[0];

// Tier-0 (default): the agent reads only its home space.
const TestLayer = AssistantTestLayer(baseOptions);

// Tier-1: the agent reads across its in-process membership (home + the foreign space).
const MultiSpaceTestLayer = AssistantTestLayer({ ...baseOptions, agent: { readScope: 'membership' } });

const conversationText = Effect.fn(function* (feed: Feed.Feed) {
  const messages = yield* Feed.runQuery(feed, Filter.type(Message.Message));
  return messages.map(Message.extractText).join('\n');
});

describe('Agent firewall (cross-space)', () => {
  // Negative (query): the agent's query tool is bound to its own space, so a foreign-space object is
  // never returned — only the home-space object is.
  it.effect(
    'agent query does not return objects from another space',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({ skills: [DatabaseSkill.make()] });
        yield* Database.add(Obj.make(Organization.Organization, { name: 'Acme Corp' }));
        yield* agent.submitPrompt('Search for all organizations and list every name you find.');
        yield* agent.waitForCompletion();

        const text = yield* conversationText(agent.feed);
        expect(text).toContain('Acme');
        expect(text).not.toContain('Cyberdyne');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  // Negative (load): handed a fully-qualified URI into another space (as untrusted data would carry),
  // the agent's load tool is denied by the firewall, so it cannot retrieve the foreign object.
  it.effect(
    'agent cannot load an object from another space',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({ skills: [DatabaseSkill.make()] });
        yield* agent.submitPrompt(
          `Load the full details of the object with URI ${foreignOrgUri} and tell me the organization's name. ` +
            'If you cannot load it, say "could not load".',
        );
        yield* agent.waitForCompletion();

        const text = yield* conversationText(agent.feed);
        // The foreign object's contents must never surface.
        expect(text).not.toContain(FOREIGN_ORG_NAME);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  // Write confinement: the agent has no handle to any space but its own, so a created object lands in
  // the home space and never in the foreign space.
  it.effect(
    'agent writes land in its own space, not another',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({ skills: [DatabaseSkill.make()] });
        yield* agent.submitPrompt('Create a new organization called "Home Widget Co".');
        yield* agent.waitForCompletion();

        // Present in the home space (the test's Database.Service).
        const home = yield* Database.query(Query.type(Organization.Organization, { name: 'Home Widget Co' })).run;
        expect(home).toHaveLength(1);

        // Absent from the foreign space.
        const foreignCount = yield* Effect.promise(() => countInForeignSpace('Home Widget Co'));
        expect(foreignCount).toBe(0);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  // Positive (tier-1): an agent granted cross-space read access (allowlist = its membership) reads
  // across every allowed space — here both its home space and the foreign space.
  it.effect(
    'agent with cross-space read access queries across multiple spaces',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({ skills: [DatabaseSkill.make()] });
        yield* Database.add(Obj.make(Organization.Organization, { name: 'Acme Corp' }));
        yield* agent.submitPrompt('Search for all organizations and list every name you find.');
        yield* agent.waitForCompletion();

        const text = yield* conversationText(agent.feed);
        expect(text).toContain('Acme'); // home space
        expect(text).toContain('Cyberdyne'); // foreign space — now within the allowlist
      },
      Effect.provide(MultiSpaceTestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );
});
