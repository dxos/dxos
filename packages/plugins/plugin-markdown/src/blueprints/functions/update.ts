//
// Copyright 2025 DXOS.org
//

import { next as A, type Doc } from '@automerge/automerge';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Type } from '@dxos/echo';
import { DocAccessor, createDocAccessor } from '@dxos/echo-db';
import { defineFunction } from '@dxos/functions';
import { trim } from '@dxos/util';

import { Markdown } from '../../types';

const Edit = Schema.Struct({
  oldString: Schema.String.annotations({
    description: 'The text to find in the document.',
  }),
  newString: Schema.String.annotations({
    description: 'The text to replace it with.',
  }),
  replaceAll: Schema.optional(Schema.Boolean).annotations({
    description: 'If true, replaces all occurrences. Defaults to false (first occurrence only).',
  }),
});

// TODO(wittjosiah): Reconcile with ThreadAction.AddProposal.
export default defineFunction({
  key: 'dxos.org/function/markdown/update',
  name: 'Update',
  description: trim`
    Applies a set of edits to the markdown document.
  `,
  inputSchema: Schema.Struct({
    doc: Type.Ref(Markdown.Document).annotations({
      description: 'The ID of the markdown document.',
    }),
    edits: Schema.Array(Edit).annotations({
      description: 'The edits to apply to the document. Each edit finds oldString and replaces it with newString.',
    }),
  }),
  outputSchema: Schema.Struct({
    newContent: Schema.String,
  }),
  handler: Effect.fn(function* ({ data: { doc, edits } }) {
    const content = yield* doc.pipe(
      Database.load,
      Effect.map((_) => _.content),
      Effect.flatMap(Database.load),
    );
    const accessor = createDocAccessor(content, ['content']);

    for (const edit of edits) {
      accessor.handle.change((doc: Doc<typeof content>) => {
        const text = DocAccessor.getValue<string>(accessor);
        if (edit.replaceAll) {
          let idx = text.indexOf(edit.oldString);
          while (idx !== -1) {
            A.splice(doc, accessor.path as A.Prop[], idx, edit.oldString.length, edit.newString);
            const updated = DocAccessor.getValue<string>(accessor);
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

    return {
      newContent: DocAccessor.getValue<string>(accessor),
    };
  }),
});
