//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { Index } from 'usearch';

import { Message } from '@dxos/types';

import { embedBatch, embedText } from './embeddings';

export type Snippet = {
  readonly text: string;
  readonly source: string;
  readonly score: number;
};

export interface VectorStoreApi {
  readonly search: (query: string, limit: number) => Promise<Snippet[]>;
  readonly size: number;
}

/** A semantic-similarity index over message text, injected into the RAG skill's retrieve tool. */
export class VectorStore extends Context.Tag('@dxos/stories-brain/VectorStore')<VectorStore, VectorStoreApi>() {}

// The embedded document per message: sender + subject + body, so both "from <sender>" and topical
// queries retrieve. Truncated to keep embedding inputs bounded.
// Bounded to stay under nomic-embed-text's context window (~2048 tokens); the sender + subject +
// lead of the body is enough signal for retrieval, and long HTML newsletters otherwise 500.
const EMBED_CHAR_BUDGET = 2000;

const messageDocument = (message: Message.Message): string => {
  const from = `${message.sender.name ?? ''} <${message.sender.email ?? ''}>`.trim();
  const subject = String(message.properties?.subject ?? '');
  return `From: ${from}\nSubject: ${subject}\n\n${Message.extractText(message)}`.slice(0, EMBED_CHAR_BUDGET).trim();
};

const messageSource = (message: Message.Message): string => String(message.properties?.messageId ?? message.id);

/** Embeds every message (via Ollama) and builds a USearch cosine index over the corpus. */
export const buildVectorStore = async (messages: readonly Message.Message[]): Promise<VectorStoreApi> => {
  const entries = messages.map((message) => ({ text: messageDocument(message), source: messageSource(message) }));
  const vectors = await embedBatch(entries.map((entry) => entry.text));
  const dimensions = vectors[0]?.length ?? 768;
  // Number-form constructor defaults metric to cosine (MetricKind.Cos) and scalar to F32.
  const index = new Index(dimensions);
  vectors.forEach((vector, position) => index.add(BigInt(position), new Float32Array(vector)));

  return {
    size: entries.length,
    search: async (query, limit) => {
      if (entries.length === 0) {
        return [];
      }
      const queryVector = new Float32Array(await embedText(query));
      const result = index.search(queryVector, Math.min(limit, entries.length), 0);
      const keys = [...result.keys];
      const distances = [...result.distances];
      // USearch cosine returns a distance in [0, 2]; similarity ≈ 1 − distance.
      return keys.map((key, rank) => ({
        text: entries[Number(key)].text.slice(0, 600),
        source: entries[Number(key)].source,
        score: Math.round((1 - distances[rank]) * 1000) / 1000,
      }));
    },
  };
};

/** A `VectorStore` layer built from the message corpus — injected via `extraServices`. */
export const vectorStoreLayer = (messages: readonly Message.Message[]): Layer.Layer<VectorStore> =>
  Layer.effect(
    VectorStore,
    Effect.promise(() => buildVectorStore(messages)),
  );
