//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Stage } from '@dxos/pipeline';
import { FactCommit, type RDF } from '@dxos/pipeline-rdf';
import { Message } from '@dxos/types';

import { messageSource } from './facts';

// Extract one message's facts WITHOUT persisting them. Distinct from `FactIndexer`, whose closure
// also writes to the store: here persistence is the sink's responsibility, so a page of facts can
// commit atomically with the cursor advance. Same signature, different contract.
export type FactExtractor = (message: Message.Message) => Promise<RDF.Fact[]>;

// Facts-returning variant of `extractFactsStage`: returns the extracted facts as a `FactUnit`
// instead of persisting them in-stage, so the sink can write a page atomically with the cursor
// advance. Extraction degrades to no facts on failure (advisory layer) but logs first, matching
// `extractFactsStage`'s degradation, so the loss stays observable.
// `concurrency` bounds in-flight extractions; >1 runs the (independent, network-bound) per-message
// LLM calls in parallel. Facts are order-independent — the sink commits by max cursor key — so the
// reordering `mapEffect` may introduce is harmless here.
export const extractFactsUnitStage = (
  extract: FactExtractor,
  concurrency = 1,
): Stage.Stage<Message.Message, FactCommit.FactUnit> =>
  Stage.map(
    'extract-facts-unit',
    (message) =>
      Effect.tryPromise(() => extract(message)).pipe(
        Effect.tapError((error) => Effect.logWarning('extract-facts-unit failed; degrading to no facts', error)),
        Effect.orElse(() => Effect.succeed<RDF.Fact[]>([])),
        Effect.map((facts): FactCommit.FactUnit => ({ facts, foreignId: messageSource(message), key: keyOf(message) })),
      ),
    { concurrency },
  );

// NOTE(workaround): `message.created` is the incremental cursor key because ECHO's native feed
// cursor is unimplemented (`Feed.cursor` is stubbed). Replace with the native queue sequence when
// available.
const keyOf = (message: Message.Message): number => Date.parse(message.created);
