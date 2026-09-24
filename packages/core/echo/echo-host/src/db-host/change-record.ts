//
// Copyright 2026 DXOS.org
//

import type * as A from '@automerge/automerge';
import type * as Schema from 'effect/Schema';

import { type Change } from '@dxos/echo';

export type ChangeRecord = Schema.Schema.Type<typeof Change.Change>;

/** A document change as `Filter.changes` reports it, or `null` for one made without a clock (time 0). */
export const toChangeRecord = (meta: A.ChangeMetadata): ChangeRecord | null =>
  meta.time > 0
    ? {
        key: meta.hash,
        source: 'document',
        time: meta.time * 1000,
        actor: meta.actor,
        seq: meta.seq,
        ops: meta.maxOp - meta.startOp + 1,
      }
    : null;
