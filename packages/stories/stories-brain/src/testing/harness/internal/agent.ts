//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { type TestContext } from 'vitest';

import { DatabaseHandlers, DatabaseSkill } from '@dxos/assistant-toolkit';
import { Database, Feed, Filter } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { TestContextService } from '@dxos/effect/testing';
import { AgentService } from '@dxos/agent-runtime';
import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { DXN } from '@dxos/keys';
import { type RDF } from '@dxos/pipeline-rdf';
import { BrainSkill } from '@dxos/plugin-brain';
import { BrainOperationHandlerSet } from '@dxos/plugin-brain/plugin';
import { Message } from '@dxos/types';

import { type ModelVariant } from '../models';
import { HybridOperationHandlerSet, HybridSkill } from '../skills/hybrid-skill';
import { RagOperationHandlerSet, RagSkill } from '../skills/rag-skill';
import { factStoreLayer } from './fact-store';
import { subjectIndexLayer } from './subject-index';
import { vectorStoreLayer } from './vector';

/**
 * The skill configuration under test (each arm adds a retrieval layer on top of the source arm):
 * - `source` — baseline: only the Database skill (reads the ECHO space + feed).
 * - `facts`  — source + Brain skill (fact-store QueryFacts/SummarizeSubject tools).
 * - `rag`    — source + RAG skill (vector-index snippet retrieval).
 * - `hybrid` — source + fact→source bridge: facts index into the actual source messages.
 */
export type SkillMode = 'source' | 'facts' | 'rag' | 'hybrid';

const usesFactStore = (mode: SkillMode): boolean => mode === 'facts';

export type AgentEvalConfig = {
  readonly variant: ModelVariant;
  readonly mode: SkillMode;
  /** Facts injected into a `FactStore` for the Brain skill (used only when mode = 'facts'). */
  readonly facts: readonly RDF.Fact[];
  /** Messages seeded onto the feed (Database skill) and embedded into the vector index (RAG skill). */
  readonly messages: readonly Message.Message[];
  readonly prompt: string;
};

export type AgentEvalResult = {
  readonly model: string;
  readonly mode: SkillMode;
  readonly prompt: string;
  readonly response: string;
  readonly responseChars: number;
  readonly durationMs: number;
};

/**
 * The reusable agent harness: configures a client (an ECHO space seeded with the message feed),
 * injects the retrieval backend the mode needs (a pre-computed `FactStore` for `brain`, a
 * vector-index `VectorStore` for `rag`), wires the AI service to the variant's model, enables the
 * chosen skills, submits the prompt, and returns the agent's response. Run the same prompt across
 * modes to isolate each skill's contribution.
 */
export const runAgentEval = async (config: AgentEvalConfig, testContext: TestContext): Promise<AgentEvalResult> => {
  const skills = [
    DatabaseSkill.make(),
    ...(config.mode === 'facts' ? [BrainSkill.make()] : []),
    ...(config.mode === 'rag' ? [RagSkill.make()] : []),
    ...(config.mode === 'hybrid' ? [HybridSkill.make()] : []),
  ];
  const operationHandlers = [
    DatabaseHandlers,
    ...(usesFactStore(config.mode) ? [BrainOperationHandlerSet] : []),
    ...(config.mode === 'rag' ? [RagOperationHandlerSet] : []),
    ...(config.mode === 'hybrid' ? [HybridOperationHandlerSet] : []),
  ];
  const extraServices = usesFactStore(config.mode)
    ? factStoreLayer(config.facts)
    : config.mode === 'rag'
      ? vectorStoreLayer(config.messages)
      : config.mode === 'hybrid'
        ? subjectIndexLayer(config.facts, config.messages)
        : Layer.empty;

  const TestLayer = AssistantTestLayer({
    aiServicePreset: config.variant.preset,
    model: DXN.make(config.variant.model),
    provider: config.variant.provider,
    skills,
    operationHandlers,
    types: [Message.Message, Feed.Feed],
    extraServices,
    disableLlmMemoization: true,
    tracing: 'noop',
  });

  const program = Effect.gen(function* () {
    // Seed the feed the agent reads via the Database skill (Query with includeQueues).
    const feed = Feed.make();
    yield* Database.add(feed);
    yield* Feed.append(feed, [...config.messages]);
    yield* Database.flush();

    const agent = yield* AgentService.createSession({ skills });
    const start = performance.now();
    yield* agent.submitPrompt(config.prompt);
    yield* agent.waitForCompletion();
    const durationMs = Math.round(performance.now() - start);

    // The conversation (prompt + tool calls + assistant replies) lands on the session feed. Omit the
    // user's prompt turn so the response is just the agent's answer.
    const transcript = yield* Feed.query(agent.feed, Filter.type(Message.Message)).run;
    const response = transcript
      .filter((message) => message.sender.role !== 'user')
      .map(Message.extractText)
      .filter((text) => text.length > 0 && text.trim() !== config.prompt.trim())
      .join('\n\n');
    return { response, durationMs };
  });

  const { response, durationMs } = await EffectEx.runPromise(
    program.pipe(Effect.provide(TestLayer), Effect.provideService(TestContextService, testContext)),
  );

  return {
    model: config.variant.name,
    mode: config.mode,
    prompt: config.prompt,
    response,
    responseChars: response.length,
    durationMs,
  };
};
