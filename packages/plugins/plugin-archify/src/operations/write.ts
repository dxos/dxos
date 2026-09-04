//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { Validate } from '#model';
import { DiagramOperation } from '#types';

/**
 * Archify's delivery rule: checking happens before the target is replaced, and only a passing
 * artifact replaces it. A rejected write leaves the previous diagram intact and hands back the
 * diagnostics that describe the repair.
 */
const handler: Operation.WithHandler<typeof DiagramOperation.Write> = DiagramOperation.Write.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ diagram, source }) {
      const { ok, diagnostics, document } = Validate.validate(source);
      if (!ok || !document) {
        return { ok, diagnostics, written: false };
      }
      const object = yield* Database.load(diagram);
      // The decoded document is stored, never the raw input: decoding is what strips unknown keys.
      object.source = document;
      return { ok, diagnostics, written: true };
    }),
  ),
);

export default handler;
