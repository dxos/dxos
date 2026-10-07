//
// Copyright 2025 DXOS.org
//

import { FeedProtocol } from '@dxos/protocols';

import type { ForeignKey } from './foreign-key.ts';

/** Property name for meta when object is serialized to JSON. Matches @dxos/echo/internal ATTR_META. */
const ATTR_META = '@meta';

/** Meta keys a store stamps on decode and strips on encode: they describe the block, not the object. */
const FEED_KEY_SOURCES: readonly string[] = [FeedProtocol.KEY_QUEUE_POSITION, FeedProtocol.KEY_FEED_BLOCK];

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
};

/**
 * Codec for ECHO objects in feed block payload: JSON object ↔ UTF-8 bytes.
 * Encodes with the block's own keys stripped; decodes with them stamped into `@meta`.
 */
export class EchoFeedCodec {
  static readonly #encoder = new TextEncoder();
  static readonly #decoder = new TextDecoder();

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
    const decoded = JSON.parse(EchoFeedCodec.#decoder.decode(data));
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
    if (typeof decoded === 'object' && decoded !== null) {
      EchoFeedCodec.#setKey(decoded, FeedProtocol.KEY_FEED_BLOCK, EchoFeedCodec.blockId(block.actorId, block.sequence));
    }
    return decoded;
  }

  /**
   * The id stamped for a block. The sequence comes first: it is always digits, so the first separator
   * splits the id even when the actor id contains one.
   */
  static blockId(actorId: string, sequence: number): string {
    return `${sequence}@${actorId}`;
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

const parseBlockId = (id: string): FeedBlockRef => {
  const separator = id.indexOf('@');
  const sequence = Number(id.slice(0, separator));
  return separator > 0 && Number.isInteger(sequence) ? { sequence, actorId: id.slice(separator + 1) } : {};
};

/**
 * Foreign-key source for the global position a feed block was assigned.
 * Re-exported so `@dxos/echo` can read it without depending on `@dxos/protocols`.
 */
export const KEY_QUEUE_POSITION = FeedProtocol.KEY_QUEUE_POSITION;
