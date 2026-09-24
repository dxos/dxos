//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Scope from 'effect/Scope';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { asyncTimeout, sleep } from '@dxos/async';
import { type Client, Config } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { createEdgeIdentity } from '@dxos/client/edge';
import { FeedTraceSink } from '@dxos/compute-runtime';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import type * as Skill from '@dxos/compute/Skill';
import { createDidFromIdentityKey } from '@dxos/credentials';
import { Database, Tag, type Type } from '@dxos/echo';
import { isEdgePeerId } from '@dxos/echo-protocol';
import { EffectEx } from '@dxos/effect';
import { DXN, type SpaceId } from '@dxos/keys';
import * as LocalUpload from '@dxos/mcp-server/LocalUpload';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import * as StagedUpload from '@dxos/plugin-file/StagedUpload';
import * as InboxPlugin from '@dxos/plugin-inbox/InboxPlugin';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import * as SpacePlugin from '@dxos/plugin-space/SpacePlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { requirePublicKey } from '@dxos/protocols/buf';
import {
  EdgeStatus_ConnectionState,
  type Identity,
  QueryAgentStatusResponse_AgentStatus,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { EdgeReplicationSetting } from '@dxos/protocols/buf/dxos/echo/metadata_pb';
import { ClaudeAgent, type Turn } from '@dxos/test-utils/claude-agent';

import { registerSkills, startMcpHost } from './mcp-host.ts';
import * as McpAuth from './McpAuth.ts';
import * as McpLatency from './McpLatency.ts';
import * as McpTarget from './McpTarget.ts';
import * as Observe from './Observe.ts';
import * as Scorer from './Scorer.ts';
import * as Usage from './Usage.ts';

/** How the server is named to the agent, and therefore the prefix of every tool it exposes. */
export const SERVER = 'dx-dev';

/** Fully-qualified name of one of the server's tools, as the agent sees it. */
export const tool = (name: string): string => `mcp__${SERVER}__${name}`;

/**
 * The credential the eval runs on. Deliberately not `ANTHROPIC_API_KEY`: that variable, or an
 * interactive login, is whatever the developer happens to have, and the eval would then charge an
 * account nobody chose.
 */
const API_KEY = process.env.DX_ANTHROPIC_API_KEY ?? '';

/** An alias, not a pinned revision: the eval scores the agent's effects, not a model version. */
const DEFAULT_MODEL = process.env.DX_EVAL_CLAUDE_MODEL ?? 'sonnet';

/** One turn's ceiling. A turn here is several MCP round trips, so it is well above a chat turn's. */
const DEFAULT_TURN_TIMEOUT = 240_000;

export type ClaudeHarnessOptions = {
  /** Skill definitions served over MCP; each must carry the `operations` behind its tool ids. */
  skills: readonly Skill.Definition[];
  /** Plugins beyond the client and space ones every scenario gets. */
  plugins?: Plugin.Plugin[];
  /** ECHO types the seed and queries touch, registered with the harness client. */
  types?: Type.AnyEntity[];
  /** Tools the agent may use. Defaults to the server's own and nothing else. */
  allowedTools?: string[];
  model?: string;
  turnTimeout?: number;
  /**
   * Which MCP surface to drive: the in-process host, or one of the deployed `mcp-space-service`
   * workers (see {@link McpTarget}). Defaults to `DX_EVAL_MCP_TARGET`, and to `local` without it.
   */
  target?: McpTarget.Target;
  /**
   * Serve `createUpload` from the in-process host, staging uploads on a loopback listener the way
   * `dx mcp serve` does, and answer `file.createFromUpload` from that stage. Ignored for a deployed
   * target, which has its own. The scenario must not also load FilePlugin, whose handler for the
   * same operation adopts from EDGE instead.
   */
  localUploads?: boolean;
  /** Fills the space before the agent starts. */
  seed?: (context: {
    spaceId: SpaceId;
  }) => Effect.Effect<void, unknown, Database.Service | Capabilities.ProcessManagerRuntimeServices>;
};

/** What a scenario drives and reads inside {@link runClaudeEval}. */
export type ClaudeHarness = {
  readonly spaceId: SpaceId;
  /**
   * The agent's working directory — a throwaway tree, and the only one its file tools may touch.
   *
   * Exposed so a scenario can plant a fixture the agent will act on from disk rather than from the
   * prompt, which is the only way to exercise a flow whose whole point is that the bytes never
   * enter the conversation.
   */
  readonly workdir: string;
  /** The surface this run is driving. */
  readonly target: McpTarget.Target;
  /** Endpoint the agent dials — the in-process listener's, or the deployed worker's. */
  readonly url: string;
  /**
   * Times the surface from the outside, over its own client connection.
   *
   * Separate from the agent's turns on purpose: what a turn's wall clock measures is dominated by
   * the model, so a tool-latency figure has to come from calls nothing else is in front of.
   */
  readonly latency: (
    probes: readonly McpLatency.Probe[],
    options?: { iterations?: number; warmup?: number },
  ) => Promise<McpLatency.Report>;
  /** Sends one user message to the agent and resolves when that turn ends. */
  readonly send: (prompt: string) => Promise<Turn>;
  /**
   * Runs a query against the space, in the harness's own runtime.
   *
   * The separation is the whole point of the scenario: an agent reporting "I marked the task done"
   * is the model narrating its own tool call, and only a query run outside the agent proves the
   * write reached the database — run between turns, it also proves it reached the database at the
   * stage the eval claims.
   */
  readonly query: <D>(
    effect: Effect.Effect<D, unknown, Database.Service | Capabilities.ProcessManagerRuntimeServices>,
  ) => Promise<D>;
  /**
   * Scores the run against the still-open space (see {@link Scorer}), with the wall clock the turns
   * took. A scenario whose stages are only true mid-run lifts those facts into scorers of their own;
   * everything else asks the database its own question here.
   */
  readonly score: (scorers: readonly Scorer.Any[]) => Promise<Scorer.Scores>;
};

/**
 * The space a deployed run names.
 *
 * Never the harness's own `defaultSpace`: that space exists only in this process, and a deployed
 * worker rejects it as not in the session's context — a failure that reads as a broken surface
 * rather than as missing configuration.
 */
const remoteSpaceId = (): SpaceId => {
  const spaceId = McpTarget.spaceId();
  if (spaceId == null) {
    throw new Error(
      'DX_EVAL_SPACE_ID is required for a deployed MCP target reached with DX_EVAL_MCP_TOKEN; ' +
        'the worker serves its own data plane and cannot see the space the harness created.',
    );
  }
  return spaceId;
};

/**
 * A client against a real EDGE, configured as `dx`'s dev profile is: replication on, so the space
 * this process seeds is the space the deployed worker serves.
 */
const edgeConfig = (url: string): Config =>
  new Config({
    version: 1,
    runtime: {
      services: { edge: { url } },
      client: { edgeFeatures: { subductionReplicator: true, feedReplicator: true, signaling: true, agents: true } },
    },
  });

/** How long a space may take to converge with EDGE before the run is declared stuck. */
const SYNC_TIMEOUT = 90_000;

/** How long to wait for the client's first EDGE status before declaring the connection unavailable. */
const EDGE_STATUS_TIMEOUT = 30_000;

/**
 * Fails unless the client is actually connected to EDGE.
 *
 * Checked before anything depends on replication, because every downstream symptom of an absent
 * connection is misleading: an unreplicated space reads as an empty one at the worker, so the run
 * would score a real surface against data that never arrived and report the gap as a defect in the
 * server.
 */
const assertEdgeConnected = async (client: Client): Promise<void> => {
  const service = client.services.services.EdgeAgentService;
  if (service == null) {
    throw new Error('The harness client exposes no EdgeAgentService; `runtime.client.edgeFeatures` is not configured.');
  }
  // Waited for rather than sampled: the first status is the connection attempt made before the
  // account bind, which EDGE refused, and the reconnect that follows the bind is what counts.
  const status = service.queryEdgeStatus();
  const connected = new Promise<void>((resolve, reject) => {
    status.subscribe(
      (response) => {
        if (response.status?.state === EdgeStatus_ConnectionState.CONNECTED) {
          resolve();
        }
      },
      (error) => (error ? reject(error) : undefined),
    );
  });
  try {
    await asyncTimeout(
      connected,
      EDGE_STATUS_TIMEOUT,
      new Error(
        'The harness client is not connected to EDGE, so the space it seeds cannot reach the deployed worker. ' +
          'The usual cause is not the transport but authorization: the WebSocket upgrade route admits a ' +
          'chained HALO identity only when it is bound to an account on that EDGE, so an identity this run ' +
          'just created is refused with `identity_not_associated_with_account` (hub-protocol `edgeAuth`; the ' +
          'waiver is for ephemeral bootstrap presentations, which this is not). Provision the identity, or ' +
          'point the eval at an existing session with DX_EVAL_MCP_TOKEN and DX_EVAL_SPACE_ID.',
      ),
    );
  } finally {
    await status.close();
  }
};

/** How long the account bind may take to become readable by EDGE's agent service. */
const ACCOUNT_VISIBILITY_TIMEOUT = 90_000;

/** How long the agent may take to report itself active once created. */
const AGENT_ACTIVE_TIMEOUT = 60_000;

/**
 * Registers the identity's EDGE agent, which is what the deployed worker serves through: it resolves
 * a token's HALO space and spaces from the agent registry, so an identity without one is refused.
 *
 * The bind writes the account through hub and the agent service reads it back through another
 * worker, so the first attempt can still miss with `not associated with an account`. Retrying that
 * one condition is waiting for a write already known to have succeeded; anything else propagates.
 */
const createEdgeAgent = async (client: Client): Promise<void> => {
  const service = client.services.services.EdgeAgentService;
  if (service == null) {
    throw new Error('The harness client exposes no EdgeAgentService; `runtime.client.edgeFeatures` is not configured.');
  }
  const deadline = Date.now() + ACCOUNT_VISIBILITY_TIMEOUT;
  for (let attempt = 1; ; attempt++) {
    try {
      await service.createAgent(undefined, { timeout: 30_000 });
      break;
    } catch (err) {
      const unbound = err instanceof Error && /not associated with an account/i.test(err.message);
      if (!unbound || Date.now() > deadline) {
        throw err;
      }
      await sleep(2_000);
    }
  }
  const status = service.queryAgentStatus();
  const active = new Promise<void>((resolve, reject) => {
    status.subscribe(
      (response) => {
        if (response.status === QueryAgentStatusResponse_AgentStatus.ACTIVE) {
          resolve();
        }
      },
      (error) => (error ? reject(error) : undefined),
    );
  });
  try {
    await asyncTimeout(
      active,
      AGENT_ACTIVE_TIMEOUT,
      new Error(`The identity's EDGE agent did not report active within ${AGENT_ACTIVE_TIMEOUT}ms.`),
    );
  } finally {
    await status.close();
  }
};

/** Whether this process and the EDGE peer hold the same documents at the same heads. */
const inSyncWithEdge = async (space: Space): Promise<boolean> => {
  const { peers } = await space.db.getAutomergeSyncState();
  const edge = peers?.find((peer) => isEdgePeerId(peer.peerId, space.id));
  return edge != null && edge.missingOnLocal === 0 && edge.missingOnRemote === 0 && edge.differentDocuments === 0;
};

/**
 * Blocks until the space has converged with EDGE.
 *
 * Two consecutive in-sync readings a beat apart, not one: a write the worker committed a moment ago
 * is still announcing itself when the first reading is taken, and a single reading would let a query
 * grade the space before the agent's work has arrived in it.
 */
const waitForEdge = async (space: Space): Promise<void> => {
  const deadline = Date.now() + SYNC_TIMEOUT;
  let streak = 0;
  while (streak < 2) {
    if (Date.now() > deadline) {
      throw new Error(`Space ${space.id} did not converge with EDGE within ${SYNC_TIMEOUT}ms.`);
    }
    streak = (await inSyncWithEdge(space)) ? streak + 1 : 0;
    await EffectEx.runPromise(Effect.sleep('500 millis'));
  }
};

/**
 * Binds a Hub account to the identity this run created, through the `test+*@dxos.org` hatch.
 *
 * `edgeAuth` admits a chained HALO identity on the WebSocket upgrade route only when an account is
 * bound to it, so a freshly minted eval identity is refused with
 * `identity_not_associated_with_account` and its space never replicates. This hatch is the
 * sanctioned way for an ephemeral test identity to get one — open on local, test, dev and preview,
 * closed on staging and production — and is what the edge repo's own e2e harness uses, so the run
 * exercises the real auth path rather than stepping around it.
 *
 * A fresh address per run: the hatch rebinds an email to the newest identity, so a shared one would
 * have concurrent runs taking each other's account.
 */
const bindTestAccount = async (edgeUrl: string, identity: Identity): Promise<void> => {
  const identityKey = requirePublicKey(identity.identityKey);
  const response = await fetch(new URL('/hub/account/login', edgeUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `test+mcp-eval-${identityKey.toHex().slice(0, 12)}@dxos.org`,
      identityDid: await createDidFromIdentityKey(identityKey),
      identityKey: identityKey.toHex(),
    }),
  });
  if (!response.ok) {
    throw new Error(`Binding a test account for the run's identity failed: ${response.status} at ${edgeUrl}.`);
  }
  // The response shape is uniform so the route cannot be used to enumerate accounts; `admitted` is
  // the only signal that the hatch ran rather than the waitlist flow.
  const body = (await response.json()) as { admitted?: boolean };
  if (body.admitted !== true) {
    throw new Error(
      `The test-account hatch is closed on ${edgeUrl}, so the run's identity cannot be bound to an ` +
        'account and its space cannot replicate. It is closed on staging and production by design.',
    );
  }
};

/** Puts the harness's space on EDGE, where the deployed worker reads it. */
const replicateToEdge = async (
  client: Client,
  edgeUrl: string,
  identity: Identity,
  spaceId: SpaceId,
): Promise<Space> => {
  await bindTestAccount(edgeUrl, identity);
  await assertEdgeConnected(client);
  await createEdgeAgent(client);
  const space = client.spaces.get(spaceId);
  if (space == null) {
    throw new Error(`Space ${spaceId} is not open in the harness client.`);
  }
  await space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);
  return space;
};

/**
 * Mints the identity's API token, the bearer the deployed worker accepts in place of an OAuth grant.
 * The worker serves the spaces the identity's agent holds, so the space this run replicated is in
 * scope by replication alone; nothing here names it.
 */
const provisionToken = (edgeUrl: string, client: Client, identity: Identity): Promise<string> =>
  McpAuth.mintApiToken({
    edgeUrl,
    identity: createEdgeIdentity(client),
    label: `mcp-eval ${requirePublicKey(identity.identityKey).toHex().slice(0, 12)}`,
  });

const count = (value: unknown): number => (typeof value === 'number' ? value : 0);

/**
 * The turn's model calls: one per `assistant` event, each fed the transcript before it. The CLI
 * reports no per-message timing, so every call spans the turn.
 */
const turnCalls = (prompt: string, turn: Turn): Usage.Call[] => {
  const transcript: unknown[] = [{ role: 'user', content: prompt }];
  const calls: Usage.Call[] = [];
  for (const event of turn.events) {
    if (event.type === 'assistant') {
      const { message } = event;
      calls.push({
        model: typeof message.model === 'string' ? message.model : 'claude',
        provider: 'anthropic',
        spanName: 'claude-code',
        input: [...transcript],
        output: message.content,
        inputTokens: count(message.usage?.input_tokens),
        outputTokens: count(message.usage?.output_tokens),
        cacheReadTokens: count(message.usage?.cache_read_input_tokens),
        cacheWriteTokens: count(message.usage?.cache_creation_input_tokens),
        start: turn.start,
        end: turn.end,
      });
      transcript.push({ role: 'assistant', content: message.content });
    } else if (event.type === 'user') {
      transcript.push({ role: 'user', content: event.message.content });
    }
  }
  return calls;
};

const stagedUploadMeta = Plugin.makeMeta({ key: DXN.make('org.dxos.test.stagedUpload'), name: 'Staged upload' });

/** Contributes `file.createFromUpload` over a loopback stage, in place of FilePlugin's EDGE adoption. */
const stagedUploadPlugin = (uploads: LocalUpload.Stage): Plugin.Plugin =>
  Plugin.make(
    Plugin.define(stagedUploadMeta).pipe(
      Plugin.addModule({
        id: 'staged-upload-handler',
        activatesOn: ActivationEvents.Startup,
        provides: [Capabilities.OperationHandler],
        activate: () =>
          Effect.succeed([
            Capability.contribute(
              Capabilities.OperationHandler,
              OperationHandlerSet.make(StagedUpload.createFromUploadHandler((uploadId) => uploads.take(uploadId))),
            ),
          ]),
      }),
    ),
  )();

const aiServiceMiddleware = (): Promise<(_upstream: AiService.Service) => AiService.Service> =>
  AiService.tag.pipe(
    Effect.provide(AiServiceTestingPreset('direct')),
    Effect.map((service) => (_upstream: AiService.Service) => service),
    EffectEx.runAndForwardErrors,
  );

/**
 * Runs a scenario against a real Claude Code subprocess talking to this repo's MCP surface, hosted
 * in this process against a Composer test harness.
 *
 * This is the CLI end-to-end test's eval counterpart (`packages/devtools/cli/src/commands/mcp/
 * agent-e2e.test.ts`), and it differs from it in exactly one place: the server is not `dx mcp serve`
 * in a second process but {@link startMcpHost} in this one, so there is no CLI binary to build, no
 * profile to bootstrap, and one database — the space the agent writes to is the space
 * {@link ClaudeHarness.query} reads.
 *
 * The agent is a real `claude` subprocess rather than the in-process assistant, which is what makes
 * the run evidence about the server's own surface: what reaches the model is what any MCP client
 * would get from it, and no in-process toolkit is in the picture to answer a prompt the server
 * could not.
 */
export const runClaudeEval = async <T>(
  options: ClaudeHarnessOptions,
  body: (harness: ClaudeHarness) => Promise<T>,
): Promise<T> => {
  const target = options.target ?? McpTarget.fromEnv();
  // The endpoint doubles as the switch: a target with one is dialed, and only the in-process host
  // has none until its listener is bound.
  const remoteUrl = McpTarget.url(target);
  const mode = McpTarget.mode(target);
  // A provisioned run replaces this with the grant it mints once its identity exists.
  let headers = McpTarget.headers(target);
  const edgeUrl = mode === 'provisioned' ? McpTarget.edgeUrl(target) : undefined;
  if (API_KEY.length === 0) {
    throw new Error('DX_ANTHROPIC_API_KEY is not set; the MCP eval spends real tokens and cannot run without it.');
  }

  // A throwaway tree, so a prompt that goes wrong cannot touch the checkout the eval runs from.
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'dx-mcp-eval-'));
  const uploads = options.localUploads && remoteUrl == null ? new LocalUpload.Stage() : undefined;
  const app = await createComposerTestApp({
    plugins: [
      ClientPlugin.make({
        types: [Tag.Tag, ...(options.types ?? [])],
        ...(edgeUrl != null ? { config: edgeConfig(edgeUrl) } : {}),
      }),
      // The assistant plugin is here for the operations, not for a model: plugins that contribute
      // the verbs this server projects (`plugin-projects`) declare it, and without it their
      // operation handlers never register. The agent itself is the `claude` subprocess below.
      AssistantPlugin.make({ aiServiceMiddleware: await aiServiceMiddleware() }),
      RoutinePlugin.make(),
      InboxPlugin.make(),
      SpacePlugin.make({}),
      ...(uploads ? [stagedUploadPlugin(uploads)] : []),
      ...(options.plugins ?? []),
    ],
  });

  let agent: ClaudeAgent | undefined;
  const experiment = Observe.experiment();
  const run = Observe.start(experiment);
  const link: Usage.Link = { traceId: run.traceId, experimentId: experiment.id, experimentName: experiment.name };
  try {
    const client = app.get(ClientCapabilities.Client);
    const { identity, defaultSpace } = await EffectEx.runAndForwardErrors(initializeIdentity(client));
    // A deployed worker serves its own data plane: a provisioned run replicates the space it just
    // created there, and a token run has to be pointed at one that already exists.
    const spaceId = mode === 'token' ? remoteSpaceId() : defaultSpace.id;
    const edgeSpace =
      mode === 'provisioned' && edgeUrl != null ? await replicateToEdge(client, edgeUrl, identity, spaceId) : undefined;

    // Against EDGE the agent's writes arrive by replication, so a query first waits for the space to
    // catch up — otherwise it grades the space as it was before the turn.
    const query = async <D>(
      effect: Effect.Effect<D, unknown, Database.Service | Capabilities.ProcessManagerRuntimeServices>,
    ): Promise<D> => {
      if (edgeSpace != null) {
        await waitForEdge(edgeSpace);
      }
      return app.runPromise(effect.pipe(Effect.provide(ServiceResolver.provide({ space: spaceId }, Database.Service))));
    };

    // The turns only, summed: the scaffold before them, the queries between them and the scoring
    // after are the harness's time, not the agent's.
    let durationMillis = 0;
    const score = (scorers: readonly Scorer.Any[]): Promise<Scorer.Scores> =>
      app.runPromise(
        Scorer.sessionServices({ durationMillis })(Scorer.runAll(scorers)).pipe(
          Effect.provide(ServiceResolver.provide({ space: spaceId }, Database.Service, FeedTraceSink.FeedTraceSink)),
        ),
      );

    const registry = app.get(ClientCapabilities.Client).graph.registry;
    registerSkills(registry, options.skills);
    // The space's database is captured alongside the runtime services, because a reference argument
    // reaches the server as a wire envelope and is decoded against the operation's schema there: a
    // `Ref` decoded with no database in context carries no resolver, and the handler then dies on
    // its first `Ref` load.
    const context = await app.runPromise(
      Effect.context<Capabilities.ProcessManagerRuntimeServices>().pipe(
        Effect.provide(ServiceResolver.provide({ space: spaceId }, Database.Service)),
      ),
    );

    // Scoped to this function rather than to a fiber: the listener has to outlive every turn and go
    // when the scenario does, and the agent below dials it by URL. Opened inside the `try`, because
    // a host that dies after binding the listener has still registered its finalizer on the scope.
    const scope = await EffectEx.runPromise(Scope.make());
    try {
      const { url } =
        remoteUrl != null
          ? { url: remoteUrl }
          : await EffectEx.runPromise(
              startMcpHost({
                skills: options.skills,
                spaceIds: [spaceId],
                context: () => context,
                registry: () => registry,
                uploads,
              }).pipe(Scope.provide(scope)),
            );

      // Seeding a token run's space from here would write to the harness's own database instead — a
      // different space than the agent is about to read, which is worse than no seed.
      if (options.seed && mode !== 'token') {
        await query(options.seed({ spaceId }));
        await query(Database.flush());
      }
      if (edgeSpace != null && edgeUrl != null) {
        // The seed has to be on EDGE before the agent's first read, and so does the space itself: the
        // worker resolves the token's spaces from the agent, which holds only what has replicated.
        await waitForEdge(edgeSpace);
        headers = McpTarget.headers(target, await provisionToken(edgeUrl, client, identity));
      }

      agent = ClaudeAgent.start({
        cwd: workdir,
        // Streamable HTTP, so the agent dials the listener this process owns rather than spawning a
        // server of its own — the difference between measuring this surface and measuring a CLI.
        mcpServers: { [SERVER]: { type: 'http', url, ...(headers ? { headers } : {}) } },
        apiKey: API_KEY,
        model: options.model ?? DEFAULT_MODEL,
        allowedTools: options.allowedTools ?? [tool('queryOperations'), tool('invokeOperation'), tool('loadSkill')],
        timeout: options.turnTimeout ?? DEFAULT_TURN_TIMEOUT,
      });
      const claudeAgent = agent;

      return await body({
        spaceId,
        target,
        workdir,
        url,
        query,
        score,
        latency: (probes, probeOptions) => McpLatency.probe({ target, url, headers, probes, ...probeOptions }),
        send: async (prompt) => {
          const turn = await claudeAgent.send(prompt);
          durationMillis += turn.end - turn.start;
          const calls = turnCalls(prompt, turn);
          calls.forEach(run.generation);
          Usage.report(calls, link);
          return turn;
        },
      });
    } finally {
      await EffectEx.runPromise(Scope.close(scope, Exit.void));
    }
  } finally {
    await agent?.close();
    await uploads?.close();
    await app.dispose();
    fs.rmSync(workdir, { recursive: true, force: true });
    await run.finish();
  }
};
