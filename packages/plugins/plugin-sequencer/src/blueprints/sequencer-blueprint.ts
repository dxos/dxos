//
// Copyright 2026 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { Score, ScoreOperation } from '#types';

const make = () =>
  Blueprint.make({
    key: Score.BLUEPRINT_KEY,
    name: 'Sequencer',
    description: 'Read and write music sequencer Scores using a compact lead-sheet text format.',
    tools: Blueprint.toolDefinitions({
      operations: [ScoreOperation.Read, ScoreOperation.Write],
    }),
    instructions: Template.make({
      source: trim`
        {{! Sequencer }}

        You can read and write Score objects (multi-track music sequences).

        A Score is serialized as a lead-sheet text. Each track is a section
        introduced by a header of the form [<index>:<name>] (e.g. "[1:Piano]"),
        optionally followed by an "instrument:" line. Subsequent lines are
        note events of the form:

          <bar>.<beat>[.<frac>] <pitch>[/<denom>]

        Where:
        - bar / beat are 1-based; frac is an optional subdivision of a beat
          (e.g. 1.1.1 = first 16th of bar 1).
        - pitch uses scientific notation (e.g. C4, F#3, Bb5). Drum tracks use
          drum names (kick, snare, hat, openhat, clap, crash, ride, tomLo,
          tomMid, tomHi) in place of pitch.
        - /denom is the note duration as a fraction of a whole note (4 = quarter,
          8 = eighth, 16 = sixteenth). Omit /denom for the default sixteenth.

        Multiple events may appear on the same line separated by whitespace.
        Blank lines and lines beginning with # are ignored.

        Read returns the current Score in this format; Write replaces the
        Score's tracks/sequences from the supplied text. Tempo, time
        signature, and loop range are preserved across Write.

        Always call Read before Write to inspect the current state, unless the
        user explicitly asks for a fresh score.
      `,
    }),
  });

const blueprint: Blueprint.Definition = {
  key: Score.BLUEPRINT_KEY,
  make,
};

export default blueprint;
