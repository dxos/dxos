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
import type * as Capabilities from '@dxos/app-framework/Capabilities';
import type * as Plugin from '@dxos/app-framework/Plugin';
import { FeedTraceSink } from '@dxos/compute-runtime';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import type * as Skill from '@dxos/compute/Skill';
import { Database, Tag, type Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import type { SpaceId } from '@dxos/keys';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import * as InboxPlugin from '@dxos/plugin-inbox/InboxPlugin';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import * as SpacePlugin from '@dxos/plugin-space/SpacePlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { ClaudeAgent, type Turn } from '@dxos/test-utils/claude-agent';

import { registerSkills, startMcpHost } from './mcp-host.ts';
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
  /** Fills the space before the agent starts. */
  seed?: (context: {
    spaceId: SpaceId;
  }) => Effect.Effect<void, unknown, Database.Service | Capabilities.ProcessManagerRuntimeServices>;
};

/** What a scenario drives and reads inside {@link runClaudeEval}. */
export type ClaudeHarness = {
  readonly spaceId: SpaceId;
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

const count = (value: unknown): number => (typeof value === 'number' ? value : 0);

/**
 * The turn's model calls: one per `assistant` event, each fed the transcript before it. The CLI
 * reports no per-message timing, so every call spans the turn.
 */
const turnCalls = (prompt: string, turn: Turn): Usage.Call[] => {
  const transcript: unknown[] = [{ role: 'user', content: prompt }];
  const calls: Usage.Call[] = [];
  for (const event of turn.events) {
    const message = event?.message;
    if (event?.type === 'assistant' && message) {
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
    } else if (event?.type === 'user' && message) {
      transcript.push({ role: 'user', content: message.content });
    }
  }
  return calls;
};

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
  const headers = McpTarget.headers(target);
  if (API_KEY.length === 0) {
    throw new Error('DX_ANTHROPIC_API_KEY is not set; the MCP eval spends real tokens and cannot run without it.');
  }

  // A throwaway tree, so a prompt that goes wrong cannot touch the checkout the eval runs from.
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'dx-mcp-eval-'));
  const app = await createComposerTestApp({
    plugins: [
      ClientPlugin.make({ types: [Tag.Tag, ...(options.types ?? [])] }),
      // The assistant plugin is here for the operations, not for a model: plugins that contribute
      // the verbs this server projects (`plugin-projects`) declare it, and without it their
      // operation handlers never register. The agent itself is the `claude` subprocess below.
      AssistantPlugin.make({ aiServiceMiddleware: await aiServiceMiddleware() }),
      RoutinePlugin.make(),
      InboxPlugin.make(),
      SpacePlugin.make({}),
      ...(options.plugins ?? []),
    ],
  });

  let agent: ClaudeAgent | undefined;
  const experiment = Observe.experiment();
  const run = Observe.start(experiment);
  const link: Usage.Link = { traceId: run.traceId, experimentId: experiment.id, experimentName: experiment.name };
  try {
    const { defaultSpace } = await EffectEx.runAndForwardErrors(initializeIdentity(app.get(ClientCapabilities.Client)));
    // A deployed worker serves its own data plane, so the space the harness just created does not
    // exist there and the scenario has to be pointed at one that does.
    const spaceId = remoteUrl != null ? (McpTarget.spaceId() ?? defaultSpace.id) : defaultSpace.id;

    const query = <D>(
      effect: Effect.Effect<D, unknown, Database.Service | Capabilities.ProcessManagerRuntimeServices>,
    ): Promise<D> =>
      app.runPromise(effect.pipe(Effect.provide(ServiceResolver.provide({ space: spaceId }, Database.Service))));

    // The turns only, summed: the scaffold before them, the queries between them and the scoring
    // after are the harness's time, not the agent's.
    let durationMillis = 0;
    const score = (scorers: readonly Scorer.Any[]): Promise<Scorer.Scores> =>
      app.runPromise(
        Scorer.runAll(scorers, { durationMillis }).pipe(
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
              }).pipe(Scope.provide(scope)),
            );

      // Seeding a deployed worker's space from here would write to the harness's own database
      // instead — a different space than the agent is about to read, which is worse than no seed.
      if (options.seed && remoteUrl == null) {
        await query(options.seed({ spaceId }));
        await query(Database.flush());
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
    await app.dispose();
    fs.rmSync(workdir, { recursive: true, force: true });
    await run.finish();
  }
};
