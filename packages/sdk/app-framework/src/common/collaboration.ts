//
// Copyright 2025 DXOS.org
//

import { Schema, SchemaAST } from 'effect';

import { Expando, Ref } from '@dxos/echo-schema';

export namespace CollaborationActions {
  export class InsertContent extends Schema.TaggedClass<InsertContent>()('assistant/intent-content', {
    input: Schema.Struct({
      target: Expando,
      object: Ref(Expando),
      at: Schema.optional(Schema.String),
      label: Schema.String.pipe(Schema.optional),
    }).annotations({
      [SchemaAST.DescriptionAnnotationId]:
        'Enables plugins to inject content blocks or references into a related entity.',
    }),
    output: Schema.Void,
  }) {}
}
