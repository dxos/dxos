//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as HttpClient from 'effect/http/HttpClient';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';
import { type Server, createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { AiModelResolver, AiService } from '@dxos/ai';
import { TypeSafeResolver } from '@dxos/ai/resolvers';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { EdgeAiHttpClient, EdgeHttpClient, createEphemeralEdgeIdentity } from '@dxos/edge-client';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';

import { CodeIndexClient } from '#client';
import { Iri } from '#graph';
import { CodeGraph } from '#types';

import { SAMPLE_GRAPH } from '../testing.ts';
import * as CodeIndexMiddleware from '../vite-plugin/CodeIndexMiddleware.ts';
import * as Command from './Command.ts';
import * as Grounding from './Grounding.ts';

//
// Headless end-to-end runs of the command loop: the real index of this repository (through the same dev-server
// middleware the app uses), the command model over the Anthropic API, and System One as the judge.
//
// Live and billed, so opt-in:
//   bun tools/code-index/bin/code-index.ts index     # once, and with no other code-index process running
//   DX_RUN_MANUAL_TESTS=1 moon run plugin-code-graph:test -- src/command/Command.e2e.test.ts
// Needs DX_ANTHROPIC_API_KEY, or DX_AI_PRESET=edge-remote to use EDGE preview. Under edge-remote the judge is Clef, the
// app's default decision model, through EDGE preview on a throwaway identity; otherwise TYPESAFE_API_KEY adds jev as
// the judge (without either a command stops after one good turn).
//

const ROOT = fileURLToPath(new URL('../../../../..', import.meta.url));

/** A command should feel immediate; this bounds the whole loop, judge included. */
const LATENCY_MS = 30_000;

/** `direct` reads DX_ANTHROPIC_API_KEY; `edge-remote` goes through the EDGE preview AI service instead. */
const PRESET = process.env.DX_AI_PRESET === 'edge-remote' ? 'edge-remote' : 'direct';

const EDGE_URL = 'https://preview.dxos.network';

/** One signed EDGE client for the suite, as the app keeps one per session; signing in again per command would be timed. */
let edgeClient: Promise<EdgeHttpClient> | undefined;
const getEdgeClient = () =>
  (edgeClient ??= createEphemeralEdgeIdentity().then((identity) => {
    const client = new EdgeHttpClient(EDGE_URL);
    client.setIdentity(identity);
    return client;
  }));

/** Clef on Workers AI through EDGE, as the app resolves `Model.defaultDecisionModel`; EDGE wants a signed identity. */
const clefResolver = Layer.unwrap(
  Effect.promise(getEdgeClient).pipe(
    Effect.map((edge) =>
      TypeSafeResolver.make({
        workersAi: {
          apiKey: Effect.succeed(undefined),
          endpoint: () => 'http://workers-ai.edge.internal/v1/systemone',
        },
      }).pipe(
        Layer.provide(
          Layer.succeed(
            HttpClient.HttpClient,
            EdgeAiHttpClient.make(() => edge, { service: 'workers-ai/typesafe' }),
          ),
        ),
      ),
    ),
  ),
);

/** jev on TypeSafe's own API, with a key from the environment. */
const jevResolver = TypeSafeResolver.make({
  typesafe: { apiKey: Effect.succeed(Redacted.make(process.env.TYPESAFE_API_KEY ?? '')) },
}).pipe(Layer.provide(FetchHttpClient.layer));

const JUDGE = PRESET === 'edge-remote' ? clefResolver : process.env.TYPESAFE_API_KEY ? jevResolver : undefined;

/** Language models from the preset and the judge's decision model, as one service. */
const aiService = Layer.effect(
  AiService.AiService,
  Effect.gen(function* () {
    const language = yield* AiService.tag.pipe(Effect.provide(AiServiceTestingPreset(PRESET)));
    if (!JUDGE) {
      return AiService.make({ languageModel: language.languageModel });
    }
    const decision = yield* AiService.tag.pipe(
      Effect.provide(AiModelResolver.buildAiService.pipe(Layer.provide(JUDGE))),
    );
    return AiService.make({ languageModel: language.languageModel, decisionModel: decision.decisionModel });
  }),
);

describe.runIf(process.env.DX_ANTHROPIC_API_KEY || PRESET === 'edge-remote')(
  'Command (live)',
  { tags: ['manual'], timeout: 120_000 },
  () => {
    let server: Server;
    let middleware: CodeIndexMiddleware.Middleware;
    let baseUrl: string;

    beforeAll(async () => {
      middleware = CodeIndexMiddleware.make({ root: ROOT });
      server = createServer((req, res) =>
        middleware(req, res, () => {
          res.statusCode = 404;
          res.end();
        }),
      );
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const address = server.address();
      baseUrl = typeof address === 'object' && address ? `http://127.0.0.1:${address.port}` : '';
      // As the article does on mount: the first query starts the index process and loads the package catalog.
      await EffectEx.runPromise(
        Grounding.packages.pipe(Effect.provide(Layer.succeed(CodeIndexClient.BaseUrl, baseUrl))),
      );
    }, 60_000);

    afterAll(() => {
      middleware?.close();
      server?.close();
    });

    const run = async (graph: CodeGraph.CodeGraph, command: string) => {
      const started = performance.now();
      const result = await EffectEx.runPromise(
        Command.runWithAiService(graph, command).pipe(
          Effect.provide(Layer.mergeAll(aiService, Layer.succeed(CodeIndexClient.BaseUrl, baseUrl))),
        ),
      );
      const elapsedMs = Math.round(performance.now() - started);
      log.info('command', {
        command,
        elapsedMs,
        stop: result.stop,
        turns: result.turns.map(({ step, results, done }) => ({
          actions: step.actions,
          errors: results.flatMap(({ error }) => (error ? [error] : [])),
          done,
        })),
        nodes: graph.nodes.length,
        trailer: result.trailer?.text,
      });
      return { result, elapsedMs };
    };

    test('clear the graph', async ({ expect }) => {
      const graph = CodeGraph.make({ nodes: SAMPLE_GRAPH.nodes, edges: SAMPLE_GRAPH.edges });
      const { result, elapsedMs } = await run(graph, 'clear the graph');
      expect(graph.nodes).toHaveLength(0);
      expect(graph.edges).toHaveLength(0);
      expect(result.turns).toHaveLength(1);
      expect(elapsedMs).toBeLessThan(LATENCY_MS);
    });

    test('show me the ECHO package exports', async ({ expect }) => {
      // Starts from unrelated packages (plugin-markdown, app-framework): "show me" replaces what is there.
      const unrelated = SAMPLE_GRAPH.nodes.slice(0, 2);
      const graph = CodeGraph.make({ nodes: unrelated, edges: [] });
      const { elapsedMs } = await run(graph, 'show me the ECHO package exports');
      const exports = graph.nodes.filter(({ kind }) => kind !== 'package');
      expect(exports.length).toBeGreaterThanOrEqual(5);
      expect(exports.every(({ id }) => id.startsWith(`${Iri.FILE}packages/core/echo/echo/`))).toBe(true);
      expect(graph.nodes.some(({ id }) => unrelated.some((node) => node.id === id))).toBe(false);
      expect(elapsedMs).toBeLessThan(LATENCY_MS);
    });

    test('what depends on identity service in halo', async ({ expect }) => {
      const graph = CodeGraph.make();
      const { elapsedMs } = await run(graph, 'What depends on identity service in halo');
      const services = graph.nodes.filter(({ id }) => id.includes('/packages/core/halo/') && /identity/i.test(id));
      expect(services.length).toBeGreaterThan(0);
      const dependents = graph.edges.filter(({ to }) => services.some(({ id }) => id === to));
      expect(dependents.length).toBeGreaterThan(0);
      expect(elapsedMs).toBeLessThan(LATENCY_MS);
    });

    test('a follow-up command keeps the graph it starts from', async ({ expect }) => {
      const graph = CodeGraph.make({ nodes: SAMPLE_GRAPH.nodes.slice(0, 1), edges: [] });
      await run(graph, 'add the packages plugin-markdown depends on');
      expect(graph.nodes[0].id).toBe(SAMPLE_GRAPH.nodes[0].id);
      expect(graph.edges.filter(({ from }) => from === SAMPLE_GRAPH.nodes[0].id).length).toBeGreaterThan(3);
    });

    test('which plugins use a package', async ({ expect }) => {
      const graph = CodeGraph.make();
      const { elapsedMs } = await run(graph, 'which plugins use @dxos/plugin-space');
      const target = `${Iri.PACKAGE}@dxos/plugin-space`;
      const users = graph.edges.filter(({ to }) => to === target).map(({ from }) => from);
      expect(users.length).toBeGreaterThanOrEqual(5);
      expect(users.every((iri) => iri.startsWith(`${Iri.PACKAGE}@dxos/plugin-`))).toBe(true);
      expect(elapsedMs).toBeLessThan(LATENCY_MS);
    });

    test('what a symbol depends on', async ({ expect }) => {
      const graph = CodeGraph.make();
      const { elapsedMs } = await run(graph, 'show what Obj.update depends on');
      const source = `${Iri.FILE}packages/core/echo/echo/src/Obj.ts#update`;
      expect(graph.edges.filter(({ from }) => from === source).length).toBeGreaterThan(0);
      expect(elapsedMs).toBeLessThan(LATENCY_MS);
    });

    test("a package's files and their imports", async ({ expect }) => {
      const graph = CodeGraph.make();
      const { elapsedMs } = await run(graph, 'show the files in @dxos/log and how they import each other');
      const files = graph.nodes.filter(({ kind }) => kind === 'file');
      expect(files.length).toBeGreaterThanOrEqual(3);
      expect(files.every(({ id }) => id.startsWith(`${Iri.FILE}packages/common/log/`))).toBe(true);
      const fileIds = new Set(files.map(({ id }) => id));
      expect(graph.edges.filter(({ from, to }) => fileIds.has(from) && fileIds.has(to)).length).toBeGreaterThanOrEqual(
        3,
      );
      expect(elapsedMs).toBeLessThan(LATENCY_MS);
    });
  },
);
