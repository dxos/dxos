//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as RpcTest from 'effect/rpc/RpcTest';

import { AiContext, Chat } from '@dxos/assistant';
import { type RemoteProcessManager } from '@dxos/compute-runtime';
import * as Credential from '@dxos/compute/Credential';
import * as Process from '@dxos/compute/Process';
import * as Project from '@dxos/compute/Project';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { AccessToken } from '@dxos/link';
import { MANAGED_ACCESS_TOKEN } from '@dxos/protocols';
import { type ContentBlock, Message, Outline, Repo, TaskSet } from '@dxos/types';

import { AgentError } from '../errors.ts';
import * as ClaudeChoices from './ClaudeChoices.ts';
import * as EdgeAgent from './EdgeAgent.ts';
import * as EdgeProtocol from './EdgeProtocol.ts';

type Script = (turnId: string) => EdgeProtocol.Output[];

/** EDGE's process routes for one coding-agent process, answering each prompt with a script. */
class FakeEdge implements EdgeAgent.ProcessControl {
  readonly spawned: RemoteProcessManager.SpawnRequest[] = [];
  readonly inputs: unknown[] = [];
  readonly lent: EdgeProtocol.Credentials[] = [];
  readonly answers: { requestId: string; optionId: string | null }[] = [];
  /** When set, EDGE refuses every lent map with this reason. */
  refusal: string | undefined;
  readonly #events: RemoteProcessManager.Event[] = [];

  constructor(readonly script: Script) {}

  spawn = (request: RemoteProcessManager.SpawnRequest) =>
    Effect.sync(() => {
      this.spawned.push(request);
      return snapshot();
    });

  submitInput = ({ input }: RemoteProcessManager.ProcessTarget & { readonly input: unknown }) =>
    Effect.sync(() => {
      this.inputs.push(input);
      if (
        typeof input === 'object' &&
        input !== null &&
        '_tag' in input &&
        input._tag === 'prompt' &&
        'turnId' in input
      ) {
        this.emit(...this.script(String(input.turnId)));
      }
    });

  readEvents = ({ cursor }: RemoteProcessManager.ProcessTarget & { readonly cursor: number }) =>
    Effect.sync((): RemoteProcessManager.EventPage => ({
      events: this.#events.filter((event) => event.seq >= cursor),
      cursor: this.#events.length,
      truncated: false,
      snapshot: snapshot(),
    }));

  rpc = () =>
    RpcTest.makeClient(EdgeProtocol.Control).pipe(
      Effect.provide(
        EdgeProtocol.Control.toLayer({
          provideCredentials: (credentials) =>
            this.refusal === undefined
              ? Effect.sync(() => {
                  this.lent.push(credentials);
                })
              : Effect.fail(new EdgeProtocol.InvalidCredentials({ message: this.refusal })),
          respondPermission: (answer) =>
            Effect.sync(() => {
              this.answers.push(answer);
              return { answered: true };
            }),
          getState: () =>
            Effect.succeed({
              status: 'ready' as const,
              sessionId: null,
              turnId: null,
              restarts: 0,
              credentials: this.lent.flatMap(({ env }) => Object.keys(env)),
            }),
        }),
      ),
    );

  emit(...outputs: EdgeProtocol.Output[]) {
    for (const data of outputs) {
      this.#events.push({ _tag: 'output', seq: this.#events.length, data });
    }
  }
}

const snapshot = (): RemoteProcessManager.Snapshot => ({
  pid: Process.ID.make('process-1'),
  parentPid: null,
  key: EdgeProtocol.PROCESS_KEY,
  params: { name: null, annotations: {} },
  environment: {},
  state: Process.State.HYBERNATING,
  error: null,
  startedAt: 0,
  completedAt: Option.none(),
  metrics: { wallTime: 0, inputCount: 0, outputCount: 0 },
  alarmDueAt: null,
});

const text = (turnId: string, value: string): EdgeProtocol.Output => ({
  _tag: 'update',
  turnId,
  update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: value } },
});

const ENV = { ANTHROPIC_API_KEY: 'sk-ant-test' };

const setup = Effect.fn(function* (script: Script, mode?: string) {
  const feed = yield* Database.add(Feed.make());
  const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed), session: { harness: 'edge' } }));
  const edge = new FakeEdge(script);
  const options: EdgeAgent.Options = {
    definition: {
      id: 'edge',
      label: 'Edge agent',
      icon: 'icon',
      credentials: Effect.succeed(ENV),
      ...(mode !== undefined && { mode: () => mode }),
    },
    control: () => edge,
  };
  return { feed, chat, edge, options };
});

const transcript = (feed: Feed.Feed) =>
  Feed.query(feed, Filter.type(Message.Message)).run.pipe(
    Effect.map((messages) => messages.map((message) => [message.sender.role, ...message.blocks.map(summarize)])),
  );

const summarize = (block: ContentBlock.Any): string => {
  switch (block._tag) {
    case 'text':
      return `text:${block.text}`;
    case 'request':
      return `request:${block.title}:${block.resolution?.optionId ?? block.resolution?.outcome ?? 'open'}`;
    default:
      return block._tag;
  }
};

describe('EdgeAgent', () => {
  const TestLayer = Layer.mergeAll(
    TestDatabaseLayer({
      types: [
        Feed.Feed,
        Message.Message,
        AiContext.Binding,
        Chat.Chat,
        Project.Project,
        Repo.Repo,
        TaskSet.TaskSet,
        Outline.Outline,
        AccessToken.AccessToken,
      ],
    }),
    Layer.succeed(Trace.TraceService, { write: () => {} }),
  );

  it.live('spawns the chat its process once, lends the credential, and folds the turn into the chat', () =>
    Effect.gen(function* () {
      const { feed, chat, edge, options } = yield* setup(
        (turnId) => [
          { _tag: 'status', status: 'ready' },
          text(turnId, 'hello '),
          text(turnId, 'world'),
          { _tag: 'turn-end', turnId, stopReason: 'end_turn' },
        ],
        'bypassPermissions',
      );
      yield* EdgeAgent.runTurn(options, { chat, feed }, { prompt: 'say hello' });
      yield* EdgeAgent.runTurn(options, { chat, feed }, { prompt: 'again' });

      expect(yield* transcript(feed)).toEqual([
        ['user', 'text:say hello'],
        ['assistant', 'text:hello world'],
        ['assistant', 'stats'],
        ['user', 'text:again'],
        ['assistant', 'text:hello world'],
        ['assistant', 'stats'],
      ]);
      expect(edge.spawned).toHaveLength(1);
      expect(edge.spawned[0]).toMatchObject({
        key: EdgeProtocol.PROCESS_KEY,
        annotations: {
          [EdgeProtocol.Annotation.unattended]: true,
          [EdgeProtocol.Annotation.mode]: 'bypassPermissions',
        },
      });
      expect(Obj.getKeys(chat, EdgeAgent.processKeySource('edge')).map(({ id }) => id)).toEqual(['process-1']);
      expect(edge.lent).toEqual([{ env: ENV }, { env: ENV }]);
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.live("spawns the process with the chat's own permission mode and agent options", () =>
    Effect.gen(function* () {
      const { feed, chat, edge, options } = yield* setup((turnId) => [
        { _tag: 'turn-end', turnId, stopReason: 'end_turn' },
      ]);
      Obj.update(chat, (chat) => {
        chat.session = { ...chat.session, agentModel: 'opus', agentEffort: 'max', agentMode: 'acceptEdits' };
      });
      const chosen: EdgeAgent.Options = {
        ...options,
        definition: {
          ...options.definition,
          mode: (chat) => ClaudeChoices.permissionMode(chat.session, undefined),
          sessionMeta: (chat) => ({ claudeCode: { options: ClaudeChoices.sdkOptions(chat.session) } }),
        },
      };
      yield* EdgeAgent.runTurn(chosen, { chat, feed }, { prompt: 'go' });

      expect(edge.spawned[0]).toMatchObject({
        annotations: {
          [EdgeProtocol.Annotation.mode]: 'acceptEdits',
          [EdgeProtocol.Annotation.meta]: { claudeCode: { options: { model: 'opus', effort: 'max' } } },
        },
      });
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.live('lends the Composer MCP token beside the agent credential, so the agent can reach the space', () =>
    Effect.gen(function* () {
      const { feed, chat, edge, options } = yield* setup((turnId) => [
        { _tag: 'turn-end', turnId, stopReason: 'end_turn' },
      ]);
      const minter = new FakeMinter();
      const withMcp: EdgeAgent.Options = {
        ...options,
        // A space credential under the reserved name must not replace the identity's own token.
        definition: {
          ...options.definition,
          credentials: Effect.succeed({ ...ENV, [EdgeProtocol.COMPOSER_MCP_TOKEN_ENV]: 'from-space' }),
        },
        composerMcp: EdgeAgent.composerMcpCredentials(() => minter),
      };
      yield* EdgeAgent.runTurn(withMcp, { chat, feed }, { prompt: 'which spaces do I have?' });
      yield* EdgeAgent.runTurn(withMcp, { chat, feed }, { prompt: 'again' });
      expect(edge.lent).toEqual([
        { env: { ...ENV, [EdgeProtocol.COMPOSER_MCP_TOKEN_ENV]: 'dx-token-1' } },
        { env: { ...ENV, [EdgeProtocol.COMPOSER_MCP_TOKEN_ENV]: 'dx-token-1' } },
      ]);
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.live('fails the turn with the reason EDGE refused the credentials, before prompting', () =>
    Effect.gen(function* () {
      const { feed, chat, edge, options } = yield* setup(() => []);
      edge.refusal = 'ANTHROPIC_API_KEY has an unprintable value';
      const error = yield* EdgeAgent.runTurn(options, { chat, feed }, { prompt: 'hello' }).pipe(Effect.flip);
      expect(error).toBeInstanceOf(AgentError);
      expect(error.message).toContain('ANTHROPIC_API_KEY has an unprintable value');
      expect(edge.inputs).toEqual([]);
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.live('shows a permission EDGE already denied as an answered card', () =>
    Effect.gen(function* () {
      const { feed, chat, options } = yield* setup((turnId) => [
        {
          _tag: 'permission',
          turnId,
          requestId: 'permission-1',
          request: {
            toolCall: { toolCallId: 'call-1', title: 'Delete files' },
            options: [{ optionId: 'reject', name: 'Reject', kind: 'reject_once' }],
          },
          resolution: { optionId: 'reject' },
        },
        { _tag: 'turn-end', turnId, stopReason: 'end_turn' },
      ]);
      yield* EdgeAgent.runTurn(options, { chat, feed }, { prompt: 'clean up' });
      expect(yield* transcript(feed)).toContainEqual(['assistant', 'request:Delete files:reject']);
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.live('ignores what another turn produced', () =>
    Effect.gen(function* () {
      const { feed, chat, options } = yield* setup((turnId) => [
        text('some-other-turn', 'stale'),
        text(turnId, 'fresh'),
        { _tag: 'turn-end', turnId, stopReason: 'end_turn' },
      ]);
      yield* EdgeAgent.runTurn(options, { chat, feed }, { prompt: 'go' });
      expect(yield* transcript(feed)).toContainEqual(['assistant', 'text:fresh']);
      expect(yield* transcript(feed)).not.toContainEqual(['assistant', 'text:stale']);
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.live('picks up a turn a closed client left running, without prompting again or repeating what it showed', () =>
    Effect.gen(function* () {
      const permission = (turnId: string): EdgeProtocol.Output => ({
        _tag: 'permission',
        turnId,
        requestId: 'permission-1',
        request: {
          toolCall: { toolCallId: 'call-1', title: 'Run sleep 60' },
          options: [{ optionId: 'allow', name: 'Allow', kind: 'allow_once' }],
        },
        resolution: { optionId: 'allow' },
      });
      // The turn's first output; the rest arrives on EDGE once the first client is gone.
      const { feed, chat, edge, options } = yield* setup((turnId) => [text(turnId, 'sleeping'), permission(turnId)]);
      const first = yield* EdgeAgent.runTurn(options, { chat, feed }, { prompt: 'sleep, then write' }).pipe(
        Effect.forkChild,
      );
      const recorded = yield* Effect.gen(function* () {
        while (true) {
          const [key] = Obj.getKeys(chat, EdgeAgent.turnKeySource('edge'));
          if (key && key.id.endsWith(':2')) {
            return { source: key.source, id: key.id };
          }
          yield* Effect.sleep('20 millis');
        }
      });
      const [prompt] = edge.inputs;
      const turnId = recorded.id.split(':')[0];

      // Composer closing runs no finalizer: the record stays, and nothing cancels the turn on EDGE.
      yield* Fiber.interrupt(first);
      Obj.update(chat, (chat) => {
        Obj.getMeta(chat).keys.push(recorded);
      });
      edge.inputs.length = 0;
      edge.emit(text(turnId, 'wrote slow.txt'), { _tag: 'turn-end', turnId, stopReason: 'end_turn' });

      // The redelivered prompt picks the same turn up.
      yield* EdgeAgent.runTurn(options, { chat, feed }, { prompt: 'sleep, then write' });
      expect(yield* transcript(feed)).toEqual([
        ['user', 'text:sleep, then write'],
        ['assistant', 'text:sleeping'],
        ['assistant', 'request:Run sleep 60:allow'],
        ['assistant', 'text:wrote slow.txt'],
        ['assistant', 'stats'],
      ]);
      // Sent again under the same key, which EDGE drops as a repeat, and no new turn.
      expect(edge.inputs).toEqual([prompt]);
      expect(Obj.getKeys(chat, EdgeAgent.turnKeySource('edge'))).toEqual([]);
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.live("checks out the project's repositories in the sandbox", () =>
    Effect.gen(function* () {
      const { feed, chat, edge, options } = yield* setup((turnId) => [
        { _tag: 'turn-end', turnId, stopReason: 'end_turn' },
      ]);
      const dxos = yield* Database.add(Repo.make({ owner: 'dxos', name: 'dxos', defaultBranch: 'main' }));
      const edgeRepo = yield* Database.add(Repo.make({ owner: 'dxos', name: 'edge' }));
      const fork = yield* Database.add(Repo.make({ owner: 'someone', name: 'edge' }));
      const project = yield* Database.add(
        Project.make({ repo: Ref.make(dxos), repositories: [Ref.make(edgeRepo), Ref.make(dxos), Ref.make(fork)] }),
      );
      Obj.setParent(chat, project);
      yield* EdgeAgent.runTurn(options, { chat, feed }, { prompt: 'build it' });

      expect(edge.spawned[0]).toMatchObject({
        annotations: {
          [EdgeProtocol.Annotation.repositories]: [
            { name: 'dxos', url: 'https://github.com/dxos/dxos.git', branch: 'main' },
            { name: 'edge', url: 'https://github.com/dxos/edge.git' },
            { name: 'someone-edge', url: 'https://github.com/someone/edge.git' },
          ],
        },
      });
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.live('checks out the repositories bound to a chat outside a project, leaving EDGE-hosted ones out', () =>
    Effect.gen(function* () {
      const { feed, chat, edge, options } = yield* setup((turnId) => [
        { _tag: 'turn-end', turnId, stopReason: 'end_turn' },
      ]);
      const dxos = yield* Database.add(Repo.make({ owner: 'dxos', name: 'dxos', defaultBranch: 'main' }));
      const removed = yield* Database.add(Repo.make({ owner: 'dxos', name: 'edge' }));
      const hosted = yield* Database.add(Repo.makeEdge({ spaceId: 'space', name: 'scratch' }));
      const outline = yield* Database.add(Outline.make({ name: 'notes' }));
      const bind = (added: Obj.Unknown[], removedObjects: Obj.Unknown[] = []) =>
        Obj.make(AiContext.Binding, {
          skills: { added: [], removed: [] },
          objects: {
            added: added.map((object) => Ref.make(object)),
            removed: removedObjects.map((object) => Ref.make(object)),
          },
        });
      yield* Feed.append(feed, [bind([dxos, removed, hosted, outline])]);
      yield* Feed.append(feed, [bind([], [removed])]);
      yield* EdgeAgent.runTurn(options, { chat, feed }, { prompt: 'build it' });

      expect(edge.spawned[0]).toMatchObject({
        annotations: {
          [EdgeProtocol.Annotation.repositories]: [
            { name: 'dxos', url: 'https://github.com/dxos/dxos.git', branch: 'main' },
          ],
        },
      });
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.live("lends the space's GitHub token as GITHUB_TOKEN and GH_TOKEN, resolving one EDGE custodies", () =>
    Effect.gen(function* () {
      const resolved: string[] = [];
      const resolver = Layer.succeed(Credential.AccessTokenResolver, {
        resolve: async ({ accessTokenId }) => {
          resolved.push(accessTokenId);
          return 'ghs-live';
        },
      });
      const credential = EdgeAgent.githubCredentials.pipe(Effect.provide(resolver));
      expect(yield* credential).toEqual({});

      yield* Database.add(Obj.make(AccessToken.AccessToken, { source: 'anthropic.com', token: 'sk-ant' }));
      const github = yield* Database.add(
        Obj.make(AccessToken.AccessToken, { source: 'github.com', token: MANAGED_ACCESS_TOKEN }),
      );
      expect(yield* credential).toEqual({ GITHUB_TOKEN: 'ghs-live', GH_TOKEN: 'ghs-live' });
      expect(resolved).toEqual([github.id]);

      // One EDGE cannot resolve leaves the checkout to public repositories rather than failing the turn.
      const unresolved = EdgeAgent.githubCredentials.pipe(Effect.provide(Credential.AccessTokenResolver.notAvailable));
      expect(yield* unresolved).toEqual({});
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );

  it.live('fails the turn EDGE gave up on', () =>
    Effect.gen(function* () {
      const { feed, chat, options } = yield* setup((turnId) => [
        { _tag: 'status', status: 'restarting', detail: 'the agent stopped' },
        { _tag: 'turn-end', turnId, stopReason: 'error', error: 'Gave up after 4 attempts.' },
      ]);
      const error = yield* EdgeAgent.runTurn(options, { chat, feed }, { prompt: 'go' }).pipe(Effect.flip);
      expect(error).toBeInstanceOf(AgentError);
      expect(error.message).toBe('Gave up after 4 attempts.');
    }).pipe(Effect.scoped, Effect.provide(TestLayer)),
  );
});

describe('composerMcpCredentials', () => {
  const HOUR = 60 * 60 * 1000;

  it.effect('mints one token per identity and replaces it as it nears expiry', () =>
    Effect.gen(function* () {
      let now = 0;
      const minter = new FakeMinter();
      const credentials = EdgeAgent.composerMcpCredentials(
        () => minter,
        () => now,
      );
      expect(yield* credentials).toEqual({ [EdgeProtocol.COMPOSER_MCP_TOKEN_ENV]: 'dx-token-1' });
      now = 20 * HOUR;
      expect(yield* credentials).toEqual({ [EdgeProtocol.COMPOSER_MCP_TOKEN_ENV]: 'dx-token-1' });
      now = 23.5 * HOUR;
      expect(yield* credentials).toEqual({ [EdgeProtocol.COMPOSER_MCP_TOKEN_ENV]: 'dx-token-2' });
      expect(minter.minted.map(({ expiresAt }) => expiresAt)).toEqual([24 * HOUR, 47.5 * HOUR]);

      // Another identity signed in on the same service never inherits the previous one's token.
      minter.did = 'did:halo:bob';
      expect(yield* credentials).toEqual({ [EdgeProtocol.COMPOSER_MCP_TOKEN_ENV]: 'dx-token-3' });
      // Switching back reuses the first identity's token rather than minting another.
      minter.did = 'did:halo:alice';
      expect(yield* credentials).toEqual({ [EdgeProtocol.COMPOSER_MCP_TOKEN_ENV]: 'dx-token-2' });
      expect(minter.minted).toHaveLength(3);
    }),
  );

  it.effect('shares one mint between concurrent turns', () =>
    Effect.gen(function* () {
      const minter = new FakeMinter();
      const gate = yield* Deferred.make<void>();
      minter.during = Deferred.await(gate);
      const credentials = EdgeAgent.composerMcpCredentials(() => minter);
      const turns = yield* Effect.all([credentials, credentials], { concurrency: 'unbounded' }).pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* Deferred.succeed(gate, undefined);
      const env = { [EdgeProtocol.COMPOSER_MCP_TOKEN_ENV]: 'dx-token-1' };
      expect(yield* Fiber.join(turns)).toEqual([env, env]);
      expect(minter.minted).toHaveLength(1);
    }),
  );

  it.effect('does not lend a token to an identity service that replaced the minting one', () =>
    Effect.gen(function* () {
      const first = new FakeMinter('first');
      const second = new FakeMinter('second', 'did:halo:bob');
      let current: EdgeAgent.ApiTokenMinter = first;
      first.during = Effect.sync(() => {
        current = second;
      });
      const credentials = EdgeAgent.composerMcpCredentials(() => current);
      expect(yield* credentials).toEqual({});
      expect(yield* credentials).toEqual({ [EdgeProtocol.COMPOSER_MCP_TOKEN_ENV]: 'second-1' });
    }),
  );

  it.effect('keeps sharing the mint when one waiting turn is interrupted', () =>
    Effect.gen(function* () {
      const minter = new FakeMinter();
      const gate = yield* Deferred.make<void>();
      minter.during = Deferred.await(gate);
      const credentials = EdgeAgent.composerMcpCredentials(() => minter);
      const interrupted = yield* Effect.forkChild(credentials);
      const waiting = yield* Effect.forkChild(credentials);
      yield* Effect.yieldNow;
      yield* Fiber.interrupt(interrupted);
      const later = yield* Effect.forkChild(credentials);
      yield* Effect.yieldNow;
      yield* Deferred.succeed(gate, undefined);
      const env = { [EdgeProtocol.COMPOSER_MCP_TOKEN_ENV]: 'dx-token-1' };
      expect(yield* Fiber.join(waiting)).toEqual(env);
      expect(yield* Fiber.join(later)).toEqual(env);
      expect(minter.minted).toHaveLength(1);
    }),
  );

  it.effect('drops a token whose identity signed out while it was minted', () =>
    Effect.gen(function* () {
      const minter = new FakeMinter();
      minter.during = Effect.sync(() => {
        minter.did = 'did:halo:bob';
      });
      const credentials = EdgeAgent.composerMcpCredentials(() => minter);
      expect(yield* credentials).toEqual({});
      minter.during = Effect.void;
      expect(yield* credentials).toEqual({ [EdgeProtocol.COMPOSER_MCP_TOKEN_ENV]: 'dx-token-2' });
    }),
  );

  it.effect('lends nothing without an identity, or when minting fails', () =>
    Effect.gen(function* () {
      expect(yield* EdgeAgent.composerMcpCredentials(() => undefined)).toEqual({});
      const signedOut = new FakeMinter();
      signedOut.did = undefined;
      expect(yield* EdgeAgent.composerMcpCredentials(() => signedOut)).toEqual({});
      const failing: EdgeAgent.ApiTokenMinter = {
        getEdgeIdentity: () => Option.some({ identityDid: 'did:halo:alice' }),
        createApiToken: () => Effect.fail(new AgentError({ message: 'no account' })),
      };
      expect(yield* EdgeAgent.composerMcpCredentials(() => failing)).toEqual({});
    }),
  );
});

/** Mints numbered tokens for the identity signed in at the time, and records what it was asked for. */
class FakeMinter implements EdgeAgent.ApiTokenMinter {
  readonly minted: { label: string; expiresAt?: number }[] = [];
  /** Runs while a mint is in flight, before it completes. */
  during: Effect.Effect<void> = Effect.void;

  constructor(
    readonly prefix = 'dx-token',
    public did: string | undefined = 'did:halo:alice',
  ) {}

  getEdgeIdentity = () => Option.fromUndefinedOr(this.did).pipe(Option.map((identityDid) => ({ identityDid })));

  createApiToken = (options: { label: string; expiresAt?: number }) =>
    Effect.sync(() => {
      this.minted.push(options);
      return { token: `${this.prefix}-${this.minted.length}` };
    }).pipe(Effect.tap(() => this.during));
}
