//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Relation, Type } from '@dxos/echo';
import { Connection } from '@dxos/plugin-connector';

/**
 * Record of an ECHO object published to an atproto repo. Source = the {@link Connection} that
 * authenticated the write; target = the local object that was published. Its presence marks the
 * object as published; `publishedHash` compared against a fresh `hash(encode(object))` tells whether
 * the published record is out of date.
 */
export class AtprotoPublication extends Type.makeRelation<AtprotoPublication>(
  DXN.make('org.dxos.type.atprotoPublication', '0.1.0'),
)({
  source: Connection.Connection,
  target: Obj.Unknown,
})(
  Schema.Struct({
    id: Obj.ID,
    /** AT-URI of the created record, e.g. `at://did:plc:…/buzz.bookhive.book/<rkey>`. */
    uri: Schema.String,
    /** Content id returned by the PDS. */
    cid: Schema.String,
    /** Lexicon NSID of the record. */
    collection: Schema.String,
    /** Record key. */
    rkey: Schema.String,
    /** Hash of the last-published encoded record; drives the out-of-date check. */
    publishedHash: Schema.String,
    /**
     * Display value of each Published leaf field at publish time, keyed by JSONPath. Lets the companion
     * flag which individual Published fields have since diverged (older publications lack it — the
     * companion then shows no per-field Published divergence).
     */
    publishedValues: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
    /** ISO timestamp of the last publish. */
    publishedAt: Schema.String,
  }),
) {}

export const instanceOf = (value: unknown): value is AtprotoPublication =>
  Relation.instanceOf(AtprotoPublication, value);

export type MakeProps = Relation.MakeProps<typeof AtprotoPublication>;

export const make = (props: MakeProps) => Relation.make(AtprotoPublication, props);
