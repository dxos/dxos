//
// Copyright 2025 DXOS.org
//

import { SchemaAST, Schema } from 'effect';

import { Expando, Ref, SpaceIdSchema } from '@dxos/echo-schema';

export namespace CollaborationActions {
  export class InsertContent extends Schema.TaggedClass<InsertContent>()('assistant/intent-content', {
    input: Schema.Struct({
      spaceId: SpaceIdSchema,
      target: Ref(Expando),
      object: Ref(Expando),
      label: Schema.String.pipe(Schema.optional),
    }).annotations({
      [SchemaAST.DescriptionAnnotationId]:
        'Enables plugins to inject content blocks or references into a related entity.',
    }),
    output: Schema.Void,
  }) {}
}
