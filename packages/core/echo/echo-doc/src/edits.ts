//
// Copyright 2025 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Schema from 'effect/Schema';

import * as Doc from './Doc';

/**
 * A single find/replace edit applied to a text document. This is the structured form of the diff
 * protocol described in document blueprints' instructions.
 */
export const Edit = Schema.Struct({
  oldString: Schema.String.annotations({
    description: 'The exact text to find and replace.',
  }),
  newString: Schema.String.annotations({
    description: 'The text to replace it with.',
  }),
  replaceAll: Schema.optional(Schema.Boolean).annotations({
    description: 'Replace all occurrences of oldString (default: replace the first occurrence).',
  }),
});

export interface Edit extends Schema.Schema.Type<typeof Edit> {}

/**
 * Applies a sequence of find/replace {@link Edit}s to the string value an accessor points at,
 * returning the resulting content. Throws if a non-`replaceAll` edit's `oldString` is not found.
 */
export const applyEdits = (accessor: Doc.Accessor, edits: readonly Edit[]): string => {
  for (const edit of edits) {
    // `''.indexOf('')` is 0 (never -1), so a `replaceAll` with an empty match would loop forever.
    if (edit.oldString.length === 0) {
      throw new Error('Edit oldString must be non-empty.');
    }

    accessor.handle.change((doc) => {
      const text = Doc.getValue<string>(accessor);
      // Automerge's `splice` types the path as mutable `Prop[]`; our `KeyPath` is readonly and is not mutated here.
      if (edit.replaceAll) {
        let idx = text.indexOf(edit.oldString);
        while (idx !== -1) {
          A.splice(doc, accessor.path as A.Prop[], idx, edit.oldString.length, edit.newString);
          const updated = Doc.getValue<string>(accessor);
          idx = updated.indexOf(edit.oldString, idx + edit.newString.length);
        }
      } else {
        const idx = text.indexOf(edit.oldString);
        if (idx === -1) {
          throw new Error(`Edit not found: ${JSON.stringify(edit.oldString)}`);
        }
        A.splice(doc, accessor.path as A.Prop[], idx, edit.oldString.length, edit.newString);
      }
    });
  }

  return Doc.getValue<string>(accessor);
};
