//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { FactPipeline } from '@dxos/pipeline-rdf';

import { AgentRegistry, identifiersForUser, labelForUser } from '../AgentRegistry';
import { StageError } from '../errors';
import { type Stage } from '../Stage';

export type ExtractFactsOptions = {
  /** Source namespace used to build each message's fact `source` DXN (default 'discord'). */
  readonly sourceNamespace?: string;
  /** Extra extraction rules appended to the pipeline defaults (domain-specific LLM guidance). */
  readonly rules?: readonly string[];
};

/**
 * Per-message stage: resolve the author to a canonical agent, then run the message through the
 * pipeline-rdf pipeline. The fact `source` is the message DXN and `author` is the agent's
 * canonical token, so every extracted fact is attributed to the resolved sender (not a raw name).
 * The pipeline's own per-source hash cursor makes re-ingest idempotent.
 */
export const makeExtractFactsStage = (options?: ExtractFactsOptions): Stage => {
  const namespace = options?.sourceNamespace ?? 'discord';
  const extractOptions = options?.rules ? { rules: options.rules } : undefined;
  return {
    name: 'extract-facts',
    handles: ['Message'],
    apply: (event) =>
      event._tag !== 'Message'
        ? Effect.void
        : Effect.gen(function* () {
            const { message } = event;
            if (message.text.trim().length === 0) {
              return;
            }
            const registry = yield* AgentRegistry;
            const agent = yield* registry.resolve(identifiersForUser(message.author), labelForUser(message.author));
            yield* FactPipeline.run(
              [
                {
                  text: message.text,
                  source: `${namespace}:${message.id}`,
                  author: agent.id,
                  date: message.createdAt,
                },
              ],
              extractOptions,
            );
          }).pipe(Effect.mapError((cause) => new StageError({ message: 'Failed to extract facts', cause }))),
  };
};
