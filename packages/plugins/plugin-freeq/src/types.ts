//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Obj, Type } from '@dxos/echo';

/** Fields of a live freeq-backed channel config, named so `makeFreeqChannel` can derive its
 * parameter type from a single source of truth instead of a hand-written duplicate. */
const FreeqChannelFields = Schema.Struct({
  /** freeq WebSocket URL (e.g. `wss://freeq.example`). */
  serverUrl: Schema.String,
  /** IRC channel name including the sigil (e.g. `#general`). */
  channel: Schema.String,
  /** ATProto handle or DID used for SASL auth; unset for a guest (read-only) connection. */
  handle: Schema.optional(Schema.String),
});

/**
 * Config object for a live freeq-backed channel. Referenced from
 * `Channel.backend.config`; identifies the freeq server, IRC channel, and the
 * ATProto handle used to authenticate.
 */
export class FreeqChannel extends Type.makeObject<FreeqChannel>(DXN.make('org.dxos.type.freeq.channel', '0.1.0'))(
  FreeqChannelFields,
) {}

/** Creates a freeq channel config object. */
export const makeFreeqChannel = (
  config: Pick<Schema.Schema.Type<typeof FreeqChannelFields>, 'serverUrl' | 'channel' | 'handle'>,
): FreeqChannel => Obj.make(FreeqChannel, config);
