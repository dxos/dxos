//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Stage } from '@dxos/pipeline';
import { type Type } from '@dxos/semantic-index';
import { Message } from '@dxos/types';

// Extract + persist one message's facts, returning them. The store/AI-bound work is a Promise closure
// so the stage's Effect stays R = never (a failed extraction must not fail the pipeline run).
export type FactIndexer = (message: Message.Message) => Promise<Type.Fact[]>;

// Message-layer stage: index each message into the fact substrate, passing the Message through
// unchanged. Extraction degrades to no facts on failure (advisory layer). A factory over `indexFacts`
// (like the pipeline's `logStage(label)`) keeps the module decoupled from any test-level Context.
export const extractFactsStage = (indexFacts: FactIndexer): Stage.Stage<Message.Message, Message.Message> =>
  Stage.map('extract-facts', (message) =>
    Effect.tryPromise(() => indexFacts(message)).pipe(
      Effect.orElse(() => Effect.succeed<Type.Fact[]>([])),
      Effect.as(message),
    ),
  );
