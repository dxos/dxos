//
// Copyright 2026 DXOS.org
//

/* eslint-disable no-console */

import * as Effect from 'effect/Effect';
import { assert, describe, expect, test } from 'vitest';

import { AgentService as AgentSessions } from '@dxos/agent-runtime';
import { TrajectoryStore } from '@dxos/assistant';
import { Config } from '@dxos/client';
import * as AgentService from '@dxos/compute/AgentService';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import { Database, Filter, Registry } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { DXN, type SpaceId } from '@dxos/keys';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import * as SpacePlugin from '@dxos/plugin-space/SpacePlugin';
import * as Harness from '@dxos/plugin-testing/Harness';
import { Message } from '@dxos/types';

import { replicateToEdge } from './claude-harness.ts';
import { getDefaultSkills } from './skills.ts';

/**
 * The Composer chat flow against a deployed EDGE, headless: a fresh identity and space, a session whose agent
 * process runs on EDGE (`location: 'edge'`), one prompt, and the reply read back off the trajectory feed.
 *
 * It exists because that path has two halves that are deployed separately — EDGE's own services and the `@dxos/*`
 * build they bundle — so it breaks on a version skew no test inside either repo can see. The failure it was written
 * for is `fork: the fork point has no block yet; flush it first`, thrown by `AiSession.createRequest` when the
 * EDGE-hosted runtime drops the block ids EDGE reports for an insert.
 *
 * Manual: it spends real tokens against a shared environment and needs an EDGE that serves the model.
 *
 *   DX_RUN_MANUAL_TESTS=1 moon run assistant-evals:test -- edge-agent-session.manual.test.ts
 *
 * `DX_EDGE_BASE_URL` picks the environment (dev by default).
 */
const EDGE_URL = process.env.DX_EDGE_BASE_URL ?? 'https://dev.dxos.network/';

const MODEL = DXN.make('com.anthropic.model.claude-sonnet-5.default');

/** The provider that serves the model from EDGE, as the app selects it for a chat. */
const PROVIDER = DXN.make('org.dxos.provider.edge');

/** By type URI: plugin-presenter is not a dependency here, and only EDGE needs its bundle. */
const PRESENTATION_TYPE = DXN.make('org.dxos.type.presentation');

const TIMEOUT = 180_000;

/** The harness, a fresh identity, and its default space; disposed by the caller. */
const setup = async () => {
  const harness = await Harness.createComposerTestApp({
    plugins: [
      ClientPlugin.make({
        // The app's own EDGE features (`composer-app/dx.yml`): EDGE admits the space and runs its
        // agents only for a client that registered for them, and the chat feed needs the replicator.
        config: new Config({
          runtime: {
            client: {
              edgeFeatures: { signaling: true, subductionReplicator: true, feedReplicator: true, agents: true },
            },
            services: { edge: { url: EDGE_URL } },
          },
        }),
      }),
      AssistantPlugin.make(),
      // Contributes `Registry.Service`, which the session's layer stack resolves (see its `layer-specs`).
      RoutinePlugin.make(),
      SpacePlugin.make({}),
    ],
  });
  const client = harness.get(ClientCapabilities.Client);
  const { identity, defaultSpace } = await EffectEx.runAndForwardErrors(initializeIdentity(client));
  // Without this EDGE answers the spawn `403 Not a member of the space`: the account bind, the agent and
  // the replication preference are what make the space one EDGE will run a process in.
  await replicateToEdge(client, EDGE_URL, identity, defaultSpace.id);
  console.log('identity created and replicated', { edge: EDGE_URL, spaceId: defaultSpace.id });
  return { harness, client, spaceId: defaultSpace.id };
};

/** Submits one prompt to an EDGE-hosted agent and returns its assistant text. */
const runPrompt = async (harness: Awaited<ReturnType<typeof setup>>['harness'], spaceId: SpaceId, prompt: string) =>
  harness.runPromise(
    Effect.gen(function* () {
      // Without the skill manager the agent has no tools at all and answers a deck request in prose,
      // which is what a chat in the app would never do: its skills are how operations reach the agent.
      const skills = yield* Effect.forEach(getDefaultSkills(), (skill) => Database.load(skill));
      const session = yield* AgentSessions.createSession({
        skills,
        model: MODEL,
        provider: PROVIDER,
        location: 'edge',
      });
      // The chat and its feed are read by the process on EDGE, which only sees what the replicator sent.
      yield* Database.flush();
      // One handle for both calls, as `ChatModel.request` does: re-reading the session without these
      // options resolves a `local` one instead, leaving the EDGE process with nothing hosting it.
      yield* session.submitPrompt(prompt);
      yield* session.waitForCompletion();
      const messages = yield* TrajectoryStore.messages(session.feed);
      return messages
        .filter((message) => message.sender.role === 'assistant')
        .map(Message.extractText)
        .filter((text) => text.length > 0)
        .join('\n\n');
    }).pipe(
      Effect.provide(
        ServiceResolver.provide({ space: spaceId }, Database.Service, AgentService.AgentService, Registry.Service),
      ),
    ),
  );

describe.skipIf(process.env.DX_RUN_MANUAL_TESTS !== '1')('agent session on EDGE', { timeout: TIMEOUT }, () => {
  test('a prompt completes a turn', async () => {
    const { harness, spaceId } = await setup();
    try {
      const reply = await runPrompt(harness, spaceId, 'Reply with exactly: ready');
      console.log('agent replied', { reply });
      expect(reply.length).toBeGreaterThan(0);
    } finally {
      await harness.dispose();
    }
  });

  test('the agent creates a presentation', async () => {
    const { harness, client, spaceId } = await setup();
    try {
      const reply = await runPrompt(
        harness,
        spaceId,
        'Create a presentation named "EDGE smoke" with two slides about DXOS, then stop.',
      );
      console.log('agent replied', { reply });
      const space = client.spaces.get(spaceId);
      assert(space, 'the default space');
      // Polled: the bundle writes the presentation on EDGE, so it reaches this client only once the
      // replicator has pushed it down, which is after the turn the agent reports as finished.
      await expect
        .poll(async () => (await space.db.query(Filter.type(PRESENTATION_TYPE)).run()).length, { timeout: 30_000 })
        .toBeGreaterThan(0);
    } finally {
      await harness.dispose();
    }
  });
});
