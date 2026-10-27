//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

/** Where speaker notes show while a deck is presented. */
export const NotesDisplay = Schema.Literals(['off', 'subtitles', 'window']).annotate({
  title: 'Speaker notes',
  description: 'Show speaker notes while presenting: as subtitles over the slide, or in a separate window.',
});
export type NotesDisplay = Schema.Schema.Type<typeof NotesDisplay>;

export const Settings = Schema.Struct({
  notes: Schema.optional(NotesDisplay),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}

export const defaults = (): Settings => ({ notes: 'off' });
