//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Scene } from '@dxos/diagram';

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
/** Scene commands by diagram id, the shape of `compiled.json`. */
export const CompiledDiagrams = Schema.Record(Schema.String, Schema.Array(Scene.Command));

export const DIAGRAM_COMMANDS = Schema.decodeUnknownSync(CompiledDiagrams)(JSON.parse(compiled)) as Record<
  DiagramKey,
  readonly Scene.Command[]
>;
