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

import { credentials } from '../capabilities/claude-code-edge-agent.ts';
import { CLAUDE_CODE_EDGE_AGENT, CLAUDE_CODE_TOKEN_SOURCE } from '../constants.ts';
import { OAUTH_TOKEN, TURN_TIMEOUT, turn } from './harness.ts';

/**
 * End to end, remote: a chat on Claude Code (cloud) runs its turns on an EDGE stack started locally
 * (`wrangler dev`, with the sandbox's container on local Docker), through `EdgeAgent` and EDGE's
 * process routes, exactly as the app does. Each turn lends the space's subscription token, and its GitHub
 * token where a test connects one, as the environment the agent runs with in the container.
 *
 * `DX_E2E_EDGE_URL` names the stack, as the container reaches it (on Docker, `http://172.17.0.1:8787`):
 * the process hands the container its own origin to call back on. With `DX_E2E_EDGE_FAKE_AGENT=1` the
 * container runs a fake agent that echoes each prompt, which checks the plumbing without a model.
 */

const EDGE_URL = process.env.DX_E2E_EDGE_URL ?? '';
const FAKE_AGENT = process.env.DX_E2E_EDGE_FAKE_AGENT === '1';
/** A GitHub token that can push to and open pull requests on dxos/dxos and dxos/edge. */
const GITHUB_TOKEN = process.env.DX_E2E_GITHUB_TOKEN ?? '';

/** The process routes of the local stack, with no identity: it runs with `functions.noAuth`. */
const control = EdgeAgent.fromRemoteControl(EdgeProcessControl.make(() => new EdgeHttpClient(EDGE_URL)));

const options: EdgeAgent.Options = {
  definition: {
    id: CLAUDE_CODE_EDGE_AGENT,
    label: 'Claude Code (cloud)',
    icon: 'px--anthropic--regular',
    credentials,
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
          // Lent for the turn as the environment the agent runs with; EDGE reports only the names it holds.
          expect(state.credentials).toEqual(OAUTH_TOKEN.length > 0 ? ['CLAUDE_CODE_OAUTH_TOKEN'] : []);
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
      "works in the project's repositories, checked out in the sandbox",
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

    it.live.skipIf(FAKE_AGENT || !GITHUB_TOKEN)(
      "clones a public and a private repository with the space's GitHub token, and opens a pull request in each",
      Effect.fnUntraced(
        function* (_) {
          // As a person connects GitHub and lists the repositories on the project.
          yield* Database.add(Obj.make(AccessToken.AccessToken, { source: 'github.com', token: GITHUB_TOKEN }));
          const repos = yield* Effect.forEach(PR_REPOS, (name) => Database.add(Repo.make({ owner: 'dxos', name })));
          const project = yield* Database.add(Project.make({ repositories: repos.map((repo) => Ref.make(repo)) }));
          const { chat, session } = yield* setup();
          Obj.setParent(chat, project);

          const branch = `e2e/coding-agent-${Date.now()}`;
          yield* Effect.addFinalizer(() => closePullRequests(branch));
          const reply = yield* turn(
            session,
            [
              `In each of the directories ${PR_REPOS.map((name) => `\`${name}\``).join(' and ')} under the current directory:`,
              `create a branch named \`${branch}\` from the checked-out branch;`,
              'add a file `.e2e/coding-agent.md` containing the single line `Written by the coding-agent e2e test.`;',
              'commit it, push the branch to `origin`,',
              `and open a draft pull request for it with \`gh pr create --draft --title "[e2e] coding agent" --body "Opened by the coding-agent e2e test; closed by it." --head ${branch}\`.`,
              'Reply with the URL of each pull request, one per line, and nothing else.',
            ].join(' '),
            PR_TURN_TIMEOUT,
          );

          for (const name of PR_REPOS) {
            const pulls = yield* github(`/repos/dxos/${name}/pulls?state=open&head=dxos:${branch}`);
            expect(pulls, `dxos/${name} has the pull request`).toHaveLength(1);
            expect(pulls[0]).toMatchObject({ draft: true, title: '[e2e] coding agent' });
            expect(reply).toContain(pulls[0].html_url);
          }
        },
        Effect.scoped,
        Effect.provide(TestLayer),
        TestHelpers.provideTestContext,
      ),
      { timeout: PR_TURN_TIMEOUT + 120_000 },
    );
  },
);

/** dxos/dxos is public and dxos/edge private, so the run covers an anonymous-readable and a token-only clone. */
const PR_REPOS = ['dxos', 'edge'];

/** Cloning dxos/dxos and working in two repositories takes well beyond an ordinary turn. */
const PR_TURN_TIMEOUT = 15 * 60_000;

type PullRequest = { number: number; html_url: string; draft: boolean; title: string };

/** The GitHub REST API, as the test's own check on what the agent did. */
const github = (path: string, init: RequestInit = {}): Effect.Effect<PullRequest[]> =>
  Effect.promise(async () => {
    const response = await fetch(`https://api.github.com${path}`, {
      ...init,
      headers: { authorization: `Bearer ${GITHUB_TOKEN}`, accept: 'application/vnd.github+json', ...init.headers },
    });
    if (!response.ok && response.status !== 422 && response.status !== 404) {
      throw new Error(`GitHub ${init.method ?? 'GET'} ${path}: ${response.status}`);
    }
    return response.status === 204 || init.method ? [] : response.json();
  });

/** Closes whatever the agent opened on the branch and deletes the branch, so a run leaves nothing behind. */
const closePullRequests = (branch: string): Effect.Effect<void> =>
  Effect.forEach(
    PR_REPOS,
    (name) =>
      Effect.gen(function* () {
        const pulls = yield* github(`/repos/dxos/${name}/pulls?state=open&head=dxos:${branch}`);
        yield* Effect.forEach(pulls, (pull) =>
          github(`/repos/dxos/${name}/pulls/${pull.number}`, {
            method: 'PATCH',
            body: JSON.stringify({ state: 'closed' }),
          }),
        );
        yield* github(`/repos/dxos/${name}/git/refs/heads/${branch}`, { method: 'DELETE' });
      }),
    { discard: true },
  ).pipe(Effect.orDie);
