//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { type Stage } from '@dxos/pipeline';
import { FactPipeline, type FactStore } from '@dxos/pipeline-rdf';

import { AgentRegistry, identifiersForUser, labelForUser } from '../AgentRegistry';
import { type StateError } from '../errors';
import { tapStage } from '../Stage';
import { type StateStore } from '../StateStore';
import type * as Type from '../types';

export type ExtractFactsOptions = {
  /** Source namespace used to build each message's fact `source` DXN (default 'discord'). */
  readonly sourceNamespace?: string;
  /** Extra extraction rules appended to the pipeline defaults (domain-specific LLM guidance). */
  readonly rules?: readonly string[];
};

/**
 * Per-message stage: resolve the author to a canonical agent, then run the message through the
 * pipeline-rdf pipeline. The fact `source` is the message DXN and `author` is the agent's canonical
 * token, so every extracted fact is attributed to the resolved sender (not a raw name). The
 * pipeline's own per-source hash cursor makes re-ingest idempotent.
 */
export const extractFactsStage = (
  options?: ExtractFactsOptions,
): Stage.Stage<Type.Event, Type.Event, StateError, AgentRegistry | FactStore | AiService.AiService | StateStore> => {
  const namespace = options?.sourceNamespace ?? 'discord';
  const extractOptions = options?.rules ? { rules: options.rules } : undefined;
  return tapStage('extract-facts', ['Message'], (event) =>
    event._tag !== 'Message' || event.message.text.trim().length === 0
      ? Effect.void
      : Effect.gen(function* () {
          const registry = yield* AgentRegistry;
          const agent = yield* registry.resolve(
            identifiersForUser(event.message.author),
            labelForUser(event.message.author),
          );
          yield* FactPipeline.run(
            [
              {
                text: event.message.text,
                source: `${namespace}:${event.message.id}`,
                author: agent.id,
                date: event.message.createdAt,
              },
            ],
            extractOptions,
          );
        }),
  );
};
