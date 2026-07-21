//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { Stage } from '@dxos/pipeline';

import { type SemanticIndexError } from '../errors';
import { hashText } from '../internal/stages/reconcile';
import { FactStore } from '../store';
import { type ExtractDocument, type ExtractOptions } from '../types';
import { type DocumentFacts, extractDocFacts } from './extract-facts';

/**
 * Indexing stage: extract → link (slug) → persist into the {@link FactStore}, building the fact
 * database subsequent stages can query from context. Incremental: a document whose content hash
 * matches the stored cursor is skipped entirely (no LLM call, no duplicate facts) and dropped from
 * the stream. A CHANGED source currently appends new competing facts (append-only model) and
 * advances the cursor; deleting/superseding the prior facts from that source is deferred (v1).
 */
export const indexFactsStage = (
  options?: ExtractOptions,
): Stage.Stage<ExtractDocument, DocumentFacts, SemanticIndexError, FactStore | AiService.AiService> =>
  Stage.map('index-facts', (doc: ExtractDocument) =>
    Effect.gen(function* () {
      const store = yield* FactStore;
      const hash = hashText(doc.text);
      const prev = yield* store.cursor(doc.source);
      if (prev === hash) {
        // Source is unchanged — skip extraction to avoid LLM work and duplicate facts.
        return undefined;
      }
      const facts = yield* extractDocFacts(doc, options);
      yield* store.putFacts(facts);
      yield* store.setCursor(doc.source, hash);
      return { doc, facts };
    }),
  );
