//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

// TODO(Zan): In the future we should consider adding new planks adjacent to the attended plank.
export const NewPlankPositions = ['start', 'end'] as const;
export type NewPlankPositioning = (typeof NewPlankPositions)[number];

export const OverScrollToProps = ['none', 'centering'] as const;
export type Overscroll = (typeof OverScrollToProps)[number];

export const Settings = Schema.Struct({
  showHints: Schema.optional(Schema.Boolean),
  enableDeck: Schema.optional(Schema.Boolean),
  enableStatusbar: Schema.optional(Schema.Boolean),
  enableNativeRedirect: Schema.optional(Schema.Boolean),
  newPlankPositioning: Schema.optional(Schema.Literal(...NewPlankPositions)),
  overscroll: Schema.optional(Schema.Literal(...OverScrollToProps)),
  // TODO(burdon): Rename layoutMode? (e.g., bento | encapsulated?)
  encapsulatedPlanks: Schema.optional(Schema.Boolean),
}).pipe(Schema.mutable);
export type Settings = Schema.Schema.Type<typeof Settings>;
