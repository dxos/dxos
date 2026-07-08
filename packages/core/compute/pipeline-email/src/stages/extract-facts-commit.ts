//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Stage } from '@dxos/pipeline';
import { type RDF } from '@dxos/pipeline-rdf';
import { Message } from '@dxos/types';

import { messageSource } from './facts';

// Extract one message's facts WITHOUT persisting them. Distinct from `FactIndexer`, whose closure
// also writes to the store: here persistence is the sink's responsibility, so a page of facts can
// commit atomically with the cursor advance. Same signature, different contract.
export type FactExtractor = (message: Message.Message) => Promise<RDF.Fact[]>;

// Terminal unit for the cursored fact pipeline: extracted facts plus the keys the sink needs to
// dedup and advance the cursor.
export type FactUnit = {
  readonly facts: RDF.Fact[];
  /** Stable per-message id (`messageSource`); the dedup foreign id. */
  readonly foreignId: string;
  /** Monotonic cursor key. */
  readonly key: number;
};

// Facts-returning variant of `extractFactsStage`: returns the extracted facts as a `FactUnit`
// instead of persisting them in-stage, so the sink can write a page atomically with the cursor
// advance. Extraction degrades to no facts on failure (advisory layer) but logs first, matching
// `extractFactsStage`'s degradation, so the loss stays observable.
export const extractFactsUnitStage = (extract: FactExtractor): Stage.Stage<Message.Message, FactUnit> =>
  Stage.map('extract-facts-unit', (message) =>
    Effect.tryPromise(() => extract(message)).pipe(
      Effect.tapError((error) => Effect.logWarning('extract-facts-unit failed; degrading to no facts', error)),
      Effect.orElse(() => Effect.succeed<RDF.Fact[]>([])),
      Effect.map((facts): FactUnit => ({ facts, foreignId: messageSource(message), key: keyOf(message) })),
    ),
  );

// NOTE(workaround): `message.created` is the incremental cursor key because ECHO's native feed
// cursor is unimplemented (`Feed.cursor` is stubbed). Replace with the native queue sequence when
// available.
const keyOf = (message: Message.Message): number => {
  // Guard against an unparseable/missing `created`: NaN breaks monotonic comparisons (`NaN > key` is
  // always false), which would silently skip or reprocess messages. Fall back to 0.
  const key = Date.parse(message.created);
  return Number.isNaN(key) ? 0 : key;
};
