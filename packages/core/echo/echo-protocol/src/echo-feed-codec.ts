//
// Copyright 2025 DXOS.org
//

import { FeedProtocol } from '@dxos/protocols';

import type { ForeignKey } from './foreign-key.ts';

/** Property name for meta when object is serialized to JSON. Matches @dxos/echo/internal ATTR_META. */
const ATTR_META = '@meta';

/**
 * Meta keys a store stamps on decode and strips on encode: they describe the block, not the object.
 * The branch keys are also how a writer asks for a branch, which the store reads before it strips them.
 */
const FEED_KEY_SOURCES: readonly string[] = [
  FeedProtocol.KEY_QUEUE_POSITION,
  FeedProtocol.KEY_FEED_BLOCK,
  FeedProtocol.KEY_FEED_BRANCH,
  FeedProtocol.KEY_FEED_FORK,
  FeedProtocol.KEY_FEED_PREV,
  FeedProtocol.KEY_FEED_FORK_AT,
];

/** The branch keys a store stamps from the block, replacing any the payload carries. */
const BRANCH_KEY_SOURCES: readonly string[] = [
  FeedProtocol.KEY_FEED_BRANCH,
  FeedProtocol.KEY_FEED_FORK,
  FeedProtocol.KEY_FEED_PREV,
  FeedProtocol.KEY_FEED_FORK_AT,
];

/**
 * Identity and order of the feed block an object was decoded from, as stamped into its `@meta`.
 * `actorId` and `sequence` name the block within its feed from the moment it is written;
 * `position` is set once a position authority orders it.
 */
export type FeedBlockRef = {
  actorId?: string;
  sequence?: number;
  position?: number;
};

/** The stored fields {@link EchoFeedCodec.decodeBlock} reads. */
export type FeedBlockData = {
  data: Uint8Array;
  actorId: string;
  sequence: number;
  position: number | null;
  prevActorId?: string | null;
  prevSequence?: number | null;
  fork?: boolean;
  /** The branch the store inferred; `null` on the root branch, absent from a store that does not infer it. */
  branch?: string | null;
};

/** What a writer asks of the store for an object it appends: a fork, or the branch it continues. */
export type FeedWriteIntent =
  | {
      /** The block id the new branch forks at; the block is the base of the branch. */
      forkAt: string;
      branch?: never;
    }
  | {
      /** The branch the block continues; absent for the root branch. */
      branch?: string;
      forkAt?: never;
    };

/**
 * Codec for ECHO objects in feed block payload: JSON object ↔ UTF-8 bytes.
 * Encodes with the block's own keys stripped; decodes with them stamped into `@meta`.
 */
export class EchoFeedCodec {
  static readonly #encoder = new TextEncoder();

  /**
   * Feed blocks are always whole-object snapshots; the index collapses entries by id to the latest
   * block. TODO(wittjosiah): Follow-up — a partial-object update block format with field-level
   * last-write-wins merge at the index (see EntityMetaIndex.update).
   */
  static encode(value: Record<string, unknown>): Uint8Array {
    return EchoFeedCodec.#encoder.encode(JSON.stringify(EchoFeedCodec.stripFeedKeys(value)));
  }

  /**
   * Decodes feed block bytes to a JSON value.
   * If position is provided, injects queue position into the decoded object's metadata.
   */
  static decode(data: Uint8Array, position?: number): Record<string, unknown> {
    // A decoder per block, not one per worker: Safari 18's WebKit makes a decoder that has decoded 2 GiB in total
    // throw `RangeError: Bad value` on every later call.
    const decoded = JSON.parse(new TextDecoder().decode(data));
    if (position !== undefined && typeof decoded === 'object' && decoded !== null) {
      EchoFeedCodec.#setKey(decoded, FeedProtocol.KEY_QUEUE_POSITION, position.toString());
    }
    return decoded;
  }

  /**
   * Decodes a stored block, stamping its identity (and position, once it has one) into `@meta` so a
   * reader can tell blocks apart and order them without comparing their content.
   */
  static decodeBlock(block: FeedBlockData): Record<string, unknown> {
    const decoded = EchoFeedCodec.decode(block.data, block.position ?? undefined);
    if (typeof decoded !== 'object' || decoded === null) {
      return decoded;
    }
    EchoFeedCodec.#setKey(decoded, FeedProtocol.KEY_FEED_BLOCK, EchoFeedCodec.blockId(block.actorId, block.sequence));
    // The store is the authority on the branch of a block, so its word replaces whatever the payload says.
    if (block.branch !== undefined) {
      EchoFeedCodec.#removeKeys(decoded, BRANCH_KEY_SOURCES);
      const prev =
        block.prevActorId != null && block.prevSequence != null
          ? EchoFeedCodec.blockId(block.prevActorId, block.prevSequence)
          : undefined;
      if (block.branch !== null) {
        EchoFeedCodec.#setKey(decoded, FeedProtocol.KEY_FEED_BRANCH, block.branch);
      }
      if (prev !== undefined) {
        EchoFeedCodec.#setKey(decoded, FeedProtocol.KEY_FEED_PREV, prev);
        if (block.fork === true) {
          EchoFeedCodec.#setKey(decoded, FeedProtocol.KEY_FEED_FORK, prev);
        }
      }
    }
    return decoded;
  }

  /**
   * The id stamped for a block. The sequence comes first: it is always digits, so the first separator
   * splits the id even when the actor id contains one.
   */
  static blockId(actorId: string, sequence: number): string {
    return FeedProtocol.formatBlockId(actorId, sequence);
  }

  /** Reads the block reference {@link decodeBlock} (or {@link decode} with a position) stamped. */
  static blockOf(value: Record<string, unknown>): FeedBlockRef {
    return EchoFeedCodec.blockOfKeys(metaKeysOf(value));
  }

  /** Reads the block reference from an object's foreign keys. */
  static blockOfKeys(keys: readonly ForeignKey[]): FeedBlockRef {
    const ref: FeedBlockRef = {};
    for (const key of keys) {
      if (key.source === FeedProtocol.KEY_QUEUE_POSITION) {
        const position = Number(key.id);
        if (Number.isFinite(position)) {
          ref.position = position;
        }
      } else if (key.source === FeedProtocol.KEY_FEED_BLOCK) {
        Object.assign(ref, parseBlockId(key.id));
      }
    }
    return ref;
  }

  /**
   * Returns `value` without the keys a store stamps on decode, so re-appending a decoded object does
   * not carry its old block's identity into the new block. Copies only the containers it changes.
   */
  static stripFeedKeys(value: Record<string, unknown>): Record<string, unknown> {
    const meta = value[ATTR_META];
    const keys = metaKeysOf(value);
    if (typeof meta !== 'object' || meta === null || !keys.some((key) => FEED_KEY_SOURCES.includes(key.source))) {
      return value;
    }
    return {
      ...value,
      [ATTR_META]: { ...meta, keys: keys.filter((key) => !FEED_KEY_SOURCES.includes(key.source)) },
    };
  }

  /** The branch a decoded item belongs to, or `undefined` for the root branch. */
  static branchOf(value: Record<string, unknown>): string | undefined {
    return metaKeysOf(value).find((key) => key.source === FeedProtocol.KEY_FEED_BRANCH)?.id;
  }

  /** Reads what a writer asks of the store for an object it appends, before {@link encode} strips it. */
  static writeIntentOf(value: Record<string, unknown>): FeedWriteIntent {
    const keys = metaKeysOf(value);
    const forkAt = keys.find((key) => key.source === FeedProtocol.KEY_FEED_FORK_AT)?.id;
    if (forkAt !== undefined) {
      return { forkAt };
    }
    const branch = keys.find((key) => key.source === FeedProtocol.KEY_FEED_BRANCH)?.id;
    return branch !== undefined ? { branch } : {};
  }

  /** Returns `value` with a request to the store to make its block the base of a branch that forks at `at`. */
  static withForkAt(value: Record<string, unknown>, at: string): Record<string, unknown> {
    const copy = { ...value };
    EchoFeedCodec.#removeKeys(copy, [FeedProtocol.KEY_FEED_BRANCH]);
    EchoFeedCodec.#setKey(copy, FeedProtocol.KEY_FEED_FORK_AT, at);
    return copy;
  }

  static #removeKeys(obj: Record<string, unknown>, sources: readonly string[]): void {
    const meta = obj[ATTR_META];
    if (typeof meta === 'object' && meta !== null) {
      obj[ATTR_META] = { ...meta, keys: metaKeysOf(obj).filter((key) => !sources.includes(key.source)) };
    }
  }

  static #setKey(obj: Record<string, unknown>, source: string, id: string): void {
    const meta = obj[ATTR_META];
    obj[ATTR_META] = {
      ...(typeof meta === 'object' && meta !== null ? meta : {}),
      keys: [...metaKeysOf(obj).filter((key) => key.source !== source), { source, id }],
    };
  }
}

const metaKeysOf = (value: Record<string, unknown>): ForeignKey[] => {
  const meta = value[ATTR_META];
  const keys = typeof meta === 'object' && meta !== null && 'keys' in meta ? meta.keys : undefined;
  return Array.isArray(keys) ? keys : [];
};

const parseBlockId = (id: string): FeedBlockRef => FeedProtocol.parseBlockId(id) ?? {};

/**
 * Foreign-key source for the global position a feed block was assigned.
 * Re-exported so `@dxos/echo` can read it without depending on `@dxos/protocols`.
 */
export const KEY_QUEUE_POSITION = FeedProtocol.KEY_QUEUE_POSITION;

/** Foreign-key source for the branch of an item; re-exported for `@dxos/echo`. */
export const KEY_FEED_BRANCH = FeedProtocol.KEY_FEED_BRANCH;

/** Foreign-key source for the fork flag and fork point of a base block; re-exported for `@dxos/echo`. */
export const KEY_FEED_FORK = FeedProtocol.KEY_FEED_FORK;

/** Foreign-key source for the predecessor of a block; re-exported for `@dxos/echo`. */
export const KEY_FEED_PREV = FeedProtocol.KEY_FEED_PREV;

/** Foreign-key source for the block id of an item; re-exported for `@dxos/echo`. */
export const KEY_FEED_BLOCK = FeedProtocol.KEY_FEED_BLOCK;
