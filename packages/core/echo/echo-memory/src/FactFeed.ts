//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { EntityId, type SpaceId } from '@dxos/keys';

import * as RdfStore from './RdfStore.ts';

//
// A space's fact feed: the log a memory's shared part is written to before it is applied, replicated like any feed so
// every replica of the space's memory (each device's, EDGE's) applies the same batches in the same order. It is the
// only feed of facts; each block is one `RdfStore.Batch`.
//

/** The feed namespace a space's fact feed lives in (`FeedProtocol.WellKnownNamespaces.facts`). */
export const NAMESPACE = 'facts';

/** Seed of the id of a space's fact feed, which every replica derives the same way so the feed replicates as one. */
const FEED_SEED = 'org.dxos.memory.facts';

/** The id of a space's fact feed. */
export const feedId = (spaceId: SpaceId): EntityId => EntityId.deterministic(FEED_SEED, spaceId);

const encodeBatch = Schema.encodeSync(RdfStore.Batch);
const decodeBatch = Schema.decodeUnknownSync(RdfStore.Batch);
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/** A batch as a block payload: the UTF-8 JSON of the encoded batch. */
export const encodeBlock = (batch: RdfStore.Batch): Uint8Array =>
  textEncoder.encode(JSON.stringify(encodeBatch(batch)));

/** Inverse of {@link encodeBlock}. */
export const decodeBlock = (data: Uint8Array): RdfStore.Batch => decodeBatch(JSON.parse(textDecoder.decode(data)));
