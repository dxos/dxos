//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { ViewState } from '@dxos/react-ui-attention/types';

export const State = Schema.Struct({
  /** Zero-based index of the slide this user is viewing. */
  index: Schema.Number,
  /** Thumbnail size of the slide grid. */
  gridSize: Schema.optional(Schema.Literals(['small', 'large'])),
}).mapFields(Struct.map(Schema.mutableKey));

export type GridSize = NonNullable<State['gridSize']>;

export type State = Schema.Schema.Type<typeof State>;

/** Per-user slide position, persisted locally so each viewer keeps their own place. */
export const aspect: ViewState.Aspect<State> = ViewState.define<State>({
  key: 'presenter-slide',
  backend: 'local',
  schema: State,
  defaultValue: () => ({ index: 0 }),
});

/** Bounds an index to the valid slide range; an empty deck always yields zero. */
export const clamp = (index: number, count: number): number =>
  count === 0 ? 0 : Math.min(Math.max(index, 0), count - 1);
