//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Architecture from '@dxos/plugin-canvas/Architecture';

import compiled from './diagrams/compiled.json?raw';
import flightsSource from './diagrams/flights.dx?raw';
import pollSource from './diagrams/poll.dx?raw';

export type DiagramKey = 'poll' | 'flights';

/** Each drawing's `.dx` source; `diagrams.test.ts` keeps `compiled.json` in step with them. */
export const DIAGRAM_SOURCES: Record<DiagramKey, string> = { poll: pollSource, flights: flightsSource };

export const DIAGRAM_NAMES: Record<DiagramKey, string> = {
  poll: 'Poll architecture',
  flights: 'Flight options architecture',
};

/** The diagrams' scene commands, laid out ahead of time: laying one out at template time keeps the space waiting. */
export const DIAGRAM_COMMANDS: Record<DiagramKey, Architecture.CompiledDiagrams[string]> = Schema.decodeUnknownSync(
  Architecture.CompiledDiagrams,
)(JSON.parse(compiled)) as Record<DiagramKey, Architecture.CompiledDiagrams[string]>;
