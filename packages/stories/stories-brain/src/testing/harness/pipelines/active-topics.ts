//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { EffectEx } from '@dxos/effect';
import { EMAIL_EXTRACT_OPTIONS, deriveThreadId, messageToDocument } from '@dxos/pipeline-email';
import { type RDF, extractDocFacts } from '@dxos/pipeline-rdf';
import { trim } from '@dxos/util';

import { type ActiveTopicsDeps, type TopicContext } from '../internal/active-topics';
import { generateText, parseJsonArray, parseJsonObject } from '../llm';
import { type ModelPolicy, resolveModel } from '../model-policy';
import { type ModelVariant } from '../models';
import { draftReply } from './draft';

// Model-backed `ActiveTopicsDeps` for the driver: wires the injected LLM steps (confidence / status /
// tasks / facts / drafts) to the harness pipelines + `generateText`, each run under its stage's model
// (via the model policy). Kept out of the pure orchestrator so `runActiveTopics` stays stub-testable.

const run = <A>(variant: ModelVariant, effect: Effect.Effect<A, never, AiService.AiService>): Promise<A> =>
  EffectEx.runPromise(effect.pipe(Effect.provide(AiServiceTestingPreset(variant.preset))));

const term = (value: { readonly entity?: string; readonly literal?: string }): string =>
  value.entity ?? value.literal ?? '?';

const renderFact = (fact: RDF.Fact): string =>
  `${term(fact.assertion.subject)} ${fact.assertion.predicate} ${term(fact.assertion.object)}`;

const threadDigest = (context: TopicContext): string =>
  context.threads
    .map((thread) => `- ${thread.subject} [${thread.state}] (${thread.participants.join(', ')})\n  ${thread.summary}`)
    .join('\n');

/** Builds the model-backed deps for {@link runActiveTopics}; each stage's model comes from the policy. */
export const makeActiveTopicsDeps = (policy?: ModelPolicy): ActiveTopicsDeps => {
  const confidenceVariant = resolveModel('summarize-topic', policy);
  const statusVariant = resolveModel('summarize-thread', policy);
  const tasksVariant = resolveModel('summarize-thread', policy);
  const factsVariant = resolveModel('extract-facts', policy);
  const draftVariant = resolveModel('draft', policy);

  return {
    confidence: async (context) => {
      const prompt = trim`
        You are triaging a mailbox. Decide whether this is an ACTIVE topic that needs the owner's
        attention now (awaiting their reply, an open decision, an approaching deadline) rather than
        background noise. Consider recency, whether the owner still owes a reply, and open items.
        Topic: ${context.draft.label}
        Summary: ${context.draft.summary}
        Threads:
        ${threadDigest(context)}
        Respond with ONLY JSON: {"confidence": <number 0..1>, "rationale": "<short reason>"}.
      `;
      const raw = await run(
        confidenceVariant,
        generateText(confidenceVariant.model, confidenceVariant.provider, prompt),
      );
      const parsed = parseJsonObject<{ confidence?: number; rationale?: string }>(raw, {});
      return {
        confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
        rationale: String(parsed.rationale ?? '').trim(),
      };
    },

    status: async (context) => {
      const prompt = trim`
        Summarize the CURRENT STATUS of this email topic in 1-2 sentences: what has happened and what
        is still outstanding. No preamble, no "the email".
        Topic: ${context.draft.label}
        Threads:
        ${threadDigest(context)}
      `;
      return (await run(statusVariant, generateText(statusVariant.model, statusVariant.provider, prompt))).trim();
    },

    tasks: async (context) => {
      const prompt = trim`
        List the concrete ACTION ITEMS the owner should do for this topic — short imperative phrases.
        If there are none, return []. Respond with ONLY a JSON array of strings.
        Topic: ${context.draft.label}
        Threads:
        ${threadDigest(context)}
      `;
      const raw = await run(tasksVariant, generateText(tasksVariant.model, tasksVariant.provider, prompt));
      return parseJsonArray<string>(raw)
        .map((task) => String(task).trim())
        .filter((task) => task.length > 0);
    },

    facts: async (context) =>
      run(
        factsVariant,
        Effect.gen(function* () {
          const collected: string[] = [];
          for (const message of context.messages) {
            const document = messageToDocument(message);
            const extracted = yield* extractDocFacts(document, {
              ...EMAIL_EXTRACT_OPTIONS,
              model: factsVariant.model,
              provider: factsVariant.provider,
              strict: factsVariant.strict,
            }).pipe(
              Effect.timeout('120 seconds'),
              Effect.orElse(() => Effect.succeed([] as RDF.Fact[])),
            );
            collected.push(...extracted.map(renderFact));
          }
          return [...new Set(collected)];
        }),
      ),

    draft: async (context) => {
      const results: Array<{ threadId: string; draft: string }> = [];
      for (const thread of context.threads) {
        // Draft to the latest message in the thread; `draftReply` skips bulk/automated mail itself.
        const latest = context.messages
          .filter((message) => deriveThreadId(message) === thread.threadId)
          .sort((left, right) => right.created.localeCompare(left.created))[0];
        if (!latest) {
          continue;
        }
        const result = await run(draftVariant, draftReply(latest, draftVariant));
        if (!result.skipped && result.draft.trim().length > 0) {
          results.push({ threadId: thread.threadId, draft: result.draft.trim() });
        }
      }
      return results;
    },
  };
};
