//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { HiddenAnnotation } from '@dxos/echo/Annotation';
import { Format } from '@dxos/echo/Format';

/**
 * Tracks progress consuming data from (or exchanging data with) a source — the durable position a
 * pipeline resumes from across runs, independent of any one integration. Not sync-specific: a sync
 * binding, an importer, or any source-driven pipeline can reference one.
 *
 * `value` is opaque and provider-defined (a timestamp high-water mark, a provider change token, an
 * offset, …); `lastRunAt` / `lastError` record the outcome of the most recent run.
 */
export class Cursor extends Type.makeObject<Cursor>(DXN.make('org.dxos.type.cursor', '0.1.0'))(
  Schema.Struct({
    value: Schema.String.annotations({
      title: 'Value',
      description: 'Opaque, provider-defined high-water mark identifying the last consumed position.',
    }).pipe(Schema.optional),
    lastRunAt: Format.DateTime.pipe(Schema.annotations({ title: 'Last run' }), Schema.optional),
    lastError: Schema.String.pipe(Schema.annotations({ title: 'Last error' }), Schema.optional),
  }).pipe(
    Annotation.IconAnnotation.set({ icon: 'ph--map-pin--regular', hue: 'amber' }),
    HiddenAnnotation.set(true),
    Schema.annotations({ description: 'Durable progress cursor for a source-driven pipeline.' }),
  ),
) {}

export const make = (props: Obj.MakeProps<typeof Cursor> = {}): Cursor => Obj.make(Cursor, props);

/**
 * Encodes a monotonic integer high-water mark into the opaque `value` string — the common convention
 * for a cursor that tracks an incrementing position (epoch timestamp, sequence number, offset).
 * Returns `0` for an absent or unparseable value.
 */
export const parseKey = (value: string | undefined): number => {
  if (!value) {
    return 0;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/** Serializes a monotonic integer high-water mark for storage in {@link Cursor.value}. */
export const formatKey = (key: number): string => String(key);
