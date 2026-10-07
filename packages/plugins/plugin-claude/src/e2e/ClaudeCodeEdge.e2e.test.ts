//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { expect } from 'vitest';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiAssistantError } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as AgentService from '@dxos/compute/AgentService';
import * as Process from '@dxos/compute/Process';
import * as Project from '@dxos/compute/Project';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { EdgeHttpClient } from '@dxos/edge-client';
import { EdgeProcessControl } from '@dxos/edge-compute';
import { TestHelpers } from '@dxos/effect/testing';
import { AccessToken } from '@dxos/link';
import * as EdgeAgent from '@dxos/plugin-code/EdgeAgent';
import { Message, Outline, Repo, TaskSet } from '@dxos/types';

import { anthropicCredential } from '../capabilities/claude-code-edge-agent.ts';
import { CLAUDE_CODE_EDGE_AGENT, CLAUDE_CODE_TOKEN_SOURCE } from '../constants.ts';
import { OAUTH_TOKEN, TURN_TIMEOUT, turn } from './harness.ts';

/**
 * End to end, remote: a chat on Claude Code (cloud) runs its turns on an EDGE stack started locally
 * (`wrangler dev`, with the sandbox's container on local Docker), through `EdgeAgent` and EDGE's
 * process routes, exactly as the app does. Each turn lends the space's subscription token, which EDGE
 * holds and proxies; the container never receives it.
 *
 * `DX_E2E_EDGE_URL` names the stack, as the container reaches it (on Docker, `http://172.17.0.1:8787`):
 * the process hands the container its own origin to call back on. With `DX_E2E_EDGE_FAKE_AGENT=1` the
 * container runs a fake agent that echoes each prompt, which checks the plumbing without a model.
 */

const EDGE_URL = process.env.DX_E2E_EDGE_URL ?? '';
const FAKE_AGENT = process.env.DX_E2E_EDGE_FAKE_AGENT === '1';

/** The process routes of the local stack, with no identity: it runs with `functions.noAuth`. */
const control = EdgeAgent.fromRemoteControl(EdgeProcessControl.make(() => new EdgeHttpClient(EDGE_URL)));

const options: EdgeAgent.Options = {
  definition: {
    id: CLAUDE_CODE_EDGE_AGENT,
    label: 'Claude Code (cloud)',
    icon: 'px--anthropic--regular',
    credential: anthropicCredential,
    gitCredential: EdgeAgent.githubCredential,
  },
  control: () => control,
};

const TestLayer = AssistantTestLayer({
  types: [
    Feed.Feed,
    Message.Message,
    AccessToken.AccessToken,
    Project.Project,
    Repo.Repo,
    TaskSet.TaskSet,
    Outline.Outline,
  ],
  // As plugin-assistant routes a chat whose harness is Claude Code (cloud) to its agent's turns.
  agent: {
    makeTurnProducer: ({ chat, feed }) =>
      Effect.succeed({
        getSkills: () => [],
        runTurn: (request) =>
          EdgeAgent.runTurn(options, { chat, feed }, request).pipe(
            Effect.mapError((cause) => new AiAssistantError({ message: cause.message, cause })),
          ),
      }),
  },
});

const setup = Effect.fnUntraced(function* () {
  if (OAUTH_TOKEN.length > 0) {
    // As a person connects their subscription through the Claude Code connector.
    yield* Database.add(Obj.make(AccessToken.AccessToken, { source: CLAUDE_CODE_TOKEN_SOURCE, token: OAUTH_TOKEN }));
  }
  const feed = yield* Database.add(Feed.make());
  const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed), session: { harness: CLAUDE_CODE_EDGE_AGENT } }));
  const session = yield* AgentService.getSession(chat);
  return { chat, session };
});

/** The EDGE process the chat recorded, and its control RPCs. */
const processOf = Effect.fnUntraced(function* (chat: Chat.Chat) {
  const [key] = Obj.getKeys(chat, EdgeAgent.processKeySource(CLAUDE_CODE_EDGE_AGENT));
  const spaceId = Obj.getDatabase(chat)?.spaceId;
  if (!key || !spaceId) {
    return yield* Effect.die(new Error('the chat recorded no EDGE process'));
  }
  const pid = Process.ID.make(key.id);
  return { spaceId, pid, rpc: yield* control.rpc({ spaceId, pid }) };
});

describe.skipIf(!EDGE_URL || (!FAKE_AGENT && !OAUTH_TOKEN))(
  'Claude Code (cloud), end to end',
  { tags: ['manual'] },
  () => {
    it.live(
      'runs a chat on Claude Code in an EDGE sandbox, on the subscription token lent from the space',
      Effect.fnUntraced(
        function* (_) {
          const { chat, session } = yield* setup();
          const reply = yield* turn(session, 'Reply with exactly the single word "pong" and nothing else.');
          expect(reply.toLowerCase()).toContain('pong');

          const { rpc } = yield* processOf(chat);
          const state = yield* rpc.getState();
          expect(state.status).toBe('ready');
          // Lent for the turn and held by EDGE, which proxies the agent's calls with it.
          expect(state.hasCredential).toBe(OAUTH_TOKEN.length > 0);
        },
        Effect.scoped,
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
      { timeout: TURN_TIMEOUT + 60_000 },
    );

    it.live.skipIf(FAKE_AGENT)(
      'keeps the conversation in the sandbox between turns',
      Effect.fnUntraced(
        function* (_) {
          const { chat, session } = yield* setup();
          yield* turn(session, 'Remember the code word ORCHID. Reply with exactly "noted" and nothing else.');
          const { pid } = yield* processOf(chat);
          const reply = yield* turn(session, 'What code word did I ask you to remember? Answer with the word only.');
          expect(reply.toUpperCase()).toContain('ORCHID');
          // The follow-up ran on the same EDGE process.
          expect((yield* processOf(chat)).pid).toBe(pid);
        },
        Effect.scoped,
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
      { timeout: 2 * TURN_TIMEOUT + 60_000 },
    );

    it.live.skipIf(FAKE_AGENT)(
      'works in the sandbox: a file the agent writes is there on the next turn',
      Effect.fnUntraced(
        function* (_) {
          const { session } = yield* setup();
          yield* turn(
            session,
            'Create a file named note.txt in the current directory containing exactly the text: lighthouse',
          );
          const reply = yield* turn(
            session,
            'Print the contents of note.txt in the current directory, and nothing else.',
          );
          expect(reply).toContain('lighthouse');
        },
        Effect.scoped,
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
      { timeout: 2 * TURN_TIMEOUT + 60_000 },
    );

    it.live.skipIf(FAKE_AGENT)(
      "works in the project's repositories, checked out in the sandbox through EDGE's git proxy",
      Effect.fnUntraced(
        function* (_) {
          const repo = yield* Database.add(Repo.make({ owner: 'octocat', name: 'Hello-World' }));
          const project = yield* Database.add(Project.make({ repositories: [Ref.make(repo)] }));
          const { chat, session } = yield* setup();
          Obj.setParent(chat, project);
          const reply = yield* turn(
            session,
            'Print the first line of Hello-World/README in the current directory, and nothing else.',
          );
          expect(reply).toContain('Hello World');
        },
        Effect.scoped,
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
      { timeout: TURN_TIMEOUT + 120_000 },
    );
  },
);
