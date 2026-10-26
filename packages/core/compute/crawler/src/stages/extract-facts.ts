//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { Stage } from '@dxos/pipeline';
import { DEFAULT_INDEX_BATCH_SIZE, type FactStore, type RDF, indexFactsBatch } from '@dxos/pipeline-rdf';

import * as AgentRegistry from '../AgentRegistry.ts';
import { type StateError } from '../errors.ts';
import * as StateStore from '../StateStore.ts';
import type * as Type from '../types.ts';

export type ExtractFactsOptions = {
  /** Source namespace used to build each message's fact `source` DXN (default 'discord'). */
  readonly sourceNamespace?: string;
  /** Extra extraction rules appended to the pipeline defaults (domain-specific LLM guidance). */
  readonly rules?: readonly string[];
  /**
   * Messages extracted together in one model request (default 25, one Discord page). `1` extracts each message on
   * its own, as a single-document request.
   */
  readonly batchSize?: number;
};

type MessageEvent = Extract<Type.Event, { readonly _tag: 'Message' }>;

const isExtractable = (event: Type.Event): event is MessageEvent =>
  event._tag === 'Message' && event.message.text.trim().length > 0;

/**
 * Batched stage: groups up to `batchSize` extractable messages (other events ride along, in order), resolves each
 * message's author to a canonical agent, and extracts the batch's facts in one pipeline-rdf request per transcript.
 * Each fact's `source` is its message's DXN and `author` the agent's canonical token. Every event passes through
 * unchanged and in order, and only after its batch is extracted, so the commit sink advances each target's cursor
 * per message as before. A failed batch is recorded on every target it touched and its events still pass. The
 * pipeline's per-source hash cursor makes re-ingest idempotent: an unchanged message never reaches the model again.
 */
export const extractFactsStage = (
  options?: ExtractFactsOptions,
): Stage.Stage<
  Type.Event,
  Type.Event,
  StateError,
  AgentRegistry.AgentRegistry | FactStore | AiService.AiService | StateStore.StateStore
> => {
  const namespace = options?.sourceNamespace ?? 'discord';
  const extractOptions = options?.rules ? { rules: options.rules } : {};
  const extract = Effect.fnUntraced(function* (events: readonly MessageEvent[]) {
    const docs: RDF.ExtractDocument[] = [];
    for (const event of events) {
      const agent = yield* AgentRegistry.resolve(
        AgentRegistry.identifiersForUser(event.message.author),
        AgentRegistry.labelForUser(event.message.author),
      );
      docs.push({
        text: event.message.text,
        source: `${namespace}:${event.message.id}`,
        author: agent.id,
        date: event.message.createdAt,
      });
    }
    yield* indexFactsBatch(docs, extractOptions);
  });

  return Stage.batch(
    'extract-facts',
    {
      size: options?.batchSize ?? DEFAULT_INDEX_BATCH_SIZE,
      weight: (event: Type.Event) => (isExtractable(event) ? 1 : 0),
    },
    (events: readonly Type.Event[]) => {
      const messages = events.filter(isExtractable);
      return (messages.length === 0 ? Effect.void : extract(messages)).pipe(
        Effect.catch((error) =>
          Effect.forEach(
            // One record per target the batch touched, so the failure is visible wherever its messages came from.
            [...new Map(messages.map(({ target }) => [target.id, target])).values()],
            (target) =>
              StateStore.setStatus(
                target.id,
                target.status,
                `extract-facts: ${error instanceof Error ? error.message : String(error)}`,
              ),
            { discard: true },
          ),
        ),
        Effect.as(events),
      );
    },
  );
};
