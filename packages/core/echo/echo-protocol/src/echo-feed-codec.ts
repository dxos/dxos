//
// Copyright 2025 DXOS.org
//

import { FeedProtocol } from '@dxos/protocols';

import type { ForeignKey } from './foreign-key';

/** Property name for meta when object is serialized to JSON. Matches @dxos/echo/internal ATTR_META. */
const ATTR_META = '@meta';

/**
 * Codec for ECHO objects in feed block payload: JSON object ↔ UTF-8 bytes.
 * Encodes with queue position stripped; decodes with optional position injection.
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
    const prepared = EchoFeedCodec.stripQueuePosition(value);
    return EchoFeedCodec.#encoder.encode(JSON.stringify(prepared));
  }

  /**
   * Decodes feed block bytes to a JSON value.
   * If position is provided, injects queue position into the decoded object's metadata.
   */
  static decode(data: Uint8Array, position?: number): Record<string, unknown> {
    const decoded = JSON.parse(EchoFeedCodec.#decoder.decode(data));
    if (position !== undefined && typeof decoded === 'object' && decoded !== null) {
      EchoFeedCodec.#setQueuePosition(decoded, position);
    }
    return decoded;
  }

  /**
   * Strips the queue-position foreign key from an object's metadata, producing a canonical form
   * comparable across a local snapshot and an inbound feed block (positions differ per-append).
   */
  static stripQueuePosition(value: Record<string, unknown>): Record<string, unknown> {
    if (typeof value !== 'object' || value === null) {
      return value;
    }
    const obj = structuredClone(value);
    const meta = obj[ATTR_META] as { keys?: ForeignKey[] } | undefined;
    if (meta?.keys?.some((key: ForeignKey) => key.source === FeedProtocol.KEY_QUEUE_POSITION)) {
      meta.keys = meta.keys.filter((key: ForeignKey) => key.source !== FeedProtocol.KEY_QUEUE_POSITION);
    }
    return obj;
  }

  static #setQueuePosition(obj: Record<string, any>, position: number): void {
    obj[ATTR_META] ??= { keys: [] };
    obj[ATTR_META]!.keys ??= [];
    const keys = obj[ATTR_META]!.keys!;
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].source === FeedProtocol.KEY_QUEUE_POSITION) {
        keys.splice(i, 1);
        i--;
      }
    }
    keys.push({
      source: FeedProtocol.KEY_QUEUE_POSITION,
      id: position.toString(),
    });
  }
}
