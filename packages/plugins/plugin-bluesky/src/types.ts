//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Obj, Type } from '@dxos/echo';

import { DEFAULT_MAX_PAGES, MAX_PAGES_HARD_CAP } from './constants';

/**
 * Config object for a read-only ATProto-backed channel. Referenced from
 * `Channel.backend.config`; identifies the public author feed to display.
 */
export class BlueskyChannel extends Type.makeObject<BlueskyChannel>(DXN.make('org.dxos.type.bluesky.channel', '0.1.0'))(
  Schema.Struct({
    /** ATProto handle or DID whose public author feed is shown (e.g. `bsky.app`). */
    handle: Schema.String,
  }),
) {}

/** Creates a Bluesky channel config object for the given public handle. */
export const makeBlueskyChannel = (handle: string): BlueskyChannel => Obj.make(BlueskyChannel, { handle });

/**
 * Per-target sync options exposed to the user via the connector's
 * `optionsSchema`. Stored under `Cursor.spec.options` (free-form record).
 */
export const BlueskyTargetOptions = Schema.Struct({
  /**
   * Maximum number of XRPC pages walked per sync for this target.
   *
   * Self-targets (your own posts / likes / bookmarks) are chronological
   * and stop early when `target.cursor` is reached — leave unset to use
   * the default {@link DEFAULT_MAX_PAGES.SELF}.
   *
   * Custom feed generators are algorithmic and have no reliable end
   * marker; without a cap they would page indefinitely. Defaults to
   * {@link DEFAULT_MAX_PAGES.FEED}; bump for slow/quiet feeds.
   *
   * Capped at {@link MAX_PAGES_HARD_CAP} regardless of value.
   */
  maxPages: Schema.Number.pipe(
    Schema.annotations({
      title: 'Max pages per sync',
      description:
        'How many XRPC pages to walk per sync. Higher = more history per pass; bounded by an internal safety cap.',
    }),
    Schema.optional,
  ),
});

export interface BlueskyTargetOptions extends Schema.Schema.Type<typeof BlueskyTargetOptions> {}
