//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ArtifactId } from '@dxos/assistant';
import { DatabaseService, defineFunction } from '@dxos/functions';
import { Markdown } from '@dxos/plugin-markdown/types';

export default defineFunction({
  key: 'dxos.org/function/research/update-document',
  name: 'Update research document',
  description: 'Updates a note summarizing the research.',
  inputSchema: Schema.Struct({
    note: ArtifactId.annotations({
      description: 'The id or DXN of the note to update.',
    }),

    name: Schema.optional(Schema.String).annotations({
      description: 'New name of the note (if changed).',
    }),

    content: Schema.optional(Schema.String).annotations({
      description: 'New content of the note (if changed).',
    }),
  }),
  outputSchema: Schema.Struct({}), // TODO(burdon): Schema.Void?
  handler: Effect.fnUntraced(function* ({ data: { note, name, content } }) {
    const noteObj = yield* ArtifactId.resolve(Markdown.Document, note);
    if (name !== undefined) {
      noteObj.name = name;
    }
    if (content) {
      const text = yield* DatabaseService.load(noteObj.content);
      text.content = content;
    }
    yield* DatabaseService.flush({ indexes: true });
    return {};
  }),
});
