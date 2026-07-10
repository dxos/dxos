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
import { AgentService } from '@dxos/functions-runtime';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { DXN } from '@dxos/keys';
import { type RDF } from '@dxos/pipeline-rdf';
import { BrainSkill } from '@dxos/plugin-brain';
import { BrainOperationHandlerSet } from '@dxos/plugin-brain/plugin';
import { Message } from '@dxos/types';

import { BrainV2Skill } from './brainV2Skill';
import { factStoreLayer } from './factStore';
import { type ModelVariant } from './models';
import { RagOperationHandlerSet, RagSkill } from './ragSkill';
import { vectorStoreLayer } from './vector';

/**
 * The skill configuration under test:
 * - `database` — baseline: only the Database skill (queries the ECHO space + feed).
 * - `brain`    — Database + Brain skill (stock fact-store QueryFacts/SummarizeSubject tools).
 * - `brain-v2` — Database + a more directive variant of the Brain skill (same tools, stronger prompt).
 * - `rag`      — Database + RAG skill (vector-index snippet retrieval).
 */
export type SkillMode = 'database' | 'brain' | 'brain-v2' | 'rag';

const usesFactStore = (mode: SkillMode): boolean => mode === 'brain' || mode === 'brain-v2';

export type AgentEvalConfig = {
  readonly variant: ModelVariant;
  readonly mode: SkillMode;
  /** Facts injected into a `FactStore` for the Brain skill (used only when mode = 'brain'). */
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
    ...(config.mode === 'brain' ? [BrainSkill.make()] : []),
    ...(config.mode === 'brain-v2' ? [BrainV2Skill.make()] : []),
    ...(config.mode === 'rag' ? [RagSkill.make()] : []),
  ];
  const operationHandlers = [
    DatabaseHandlers,
    ...(usesFactStore(config.mode) ? [BrainOperationHandlerSet] : []),
    ...(config.mode === 'rag' ? [RagOperationHandlerSet] : []),
  ];
  const extraServices = usesFactStore(config.mode)
    ? factStoreLayer(config.facts)
    : config.mode === 'rag'
      ? vectorStoreLayer(config.messages)
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

    // The conversation (prompt + tool calls + assistant replies) lands on the session feed.
    const transcript = yield* Feed.query(agent.feed, Filter.type(Message.Message)).run;
    const response = transcript.map(Message.extractText).filter(Boolean).join('\n\n');
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
