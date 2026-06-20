//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Database, Ref, DXN } from '@dxos/echo';
import { trim } from '@dxos/util';

import * as Score from './Score';

/**
 * Read a Score and return its lead-sheet text representation. The lead sheet is
 * the canonical multi-track text format defined in `util/lead-sheet.ts` — each
 * track becomes a `[index:name]` section followed by `bar.beat[.frac] pitch/dur`
 * events. Round-trips exactly with {@link Write}.
 */
export const Read = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.sequencer.read'),
    name: 'Read score',
    icon: 'ph--music-notes--regular',
    description: trim`
      Reads a Score and returns its lead-sheet text. The lead-sheet format lists
      every track as a [index:name] section followed by events of the form
      bar.beat[.frac] <pitch>[/<denom>] (or <drum>[/<denom>] for drum tracks).
    `,
  },
  input: Schema.Struct({
    score: Ref.Ref(Score.Score).annotations({
      description: 'The Score to read.',
    }),
  }),
  output: Schema.Struct({
    text: Schema.String.annotations({
      description: 'Lead-sheet text representation of the Score.',
    }),
  }),
  services: [Database.Service],
});

/**
 * Replace a Score's tracks and sequences from a lead-sheet text payload.
 * Tracks are matched by 1-based section index — existing tracks at that index
 * keep their id / color / instrument; tracks not referenced by the document are
 * removed. Other Score fields (name, tempo, timeSignature, loop range) are left
 * intact.
 */
export const Write = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.sequencer.write'),
    name: 'Write score',
    icon: 'ph--music-notes--regular',
    description: trim`
      Replaces a Score's tracks and sequences from a lead-sheet text payload.
      The Score's tempo, time signature, name, and loop range are preserved.
      Use Read first to inspect the current state in the same format.
    `,
  },
  input: Schema.Struct({
    score: Ref.Ref(Score.Score).annotations({
      description: 'The Score to write to.',
    }),
    text: Schema.String.annotations({
      description: 'Lead-sheet text to apply. Same format produced by Read.',
    }),
  }),
  output: Schema.Struct({
    tracks: Schema.Number.annotations({
      description: 'Number of tracks in the resulting Score.',
    }),
    notes: Schema.Number.annotations({
      description: 'Total number of notes across all sequences.',
    }),
  }),
  services: [Database.Service],
});
