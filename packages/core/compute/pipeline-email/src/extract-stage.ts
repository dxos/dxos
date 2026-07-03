//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Stage } from '@dxos/pipeline';
import { type Type } from '@dxos/semantic-index';
import { Message } from '@dxos/types';

// Extract + persist one message's facts, returning them. The store/AI-bound work is a Promise closure
// so the stage's Effect stays R = never (Pipeline.run carries no requirements channel).
export type FactIndexer = (message: Message.Message) => Promise<Type.Fact[]>;

// Message-layer stage: index each message into the fact substrate, passing the Message through
// unchanged. Extraction degrades to no facts on failure (advisory layer — a failed extraction must
// not fail the run), mirroring the summarize stage's graceful degradation.
export const extractFactsStage = <Ctx extends { readonly indexFacts: FactIndexer }>(): Stage.Stage<
  Message.Message,
  Message.Message,
  Ctx,
  never
> =>
  Stage.map('extract-facts', (message, ctx) =>
    Effect.tryPromise(() => ctx.indexFacts(message)).pipe(
      Effect.orElse(() => Effect.succeed<Type.Fact[]>([])),
      Effect.as(message),
    ),
  );
