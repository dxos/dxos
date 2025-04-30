//
// Copyright 2025 DXOS.org
//

import { SchemaAST as AST, Schema as S } from 'effect';

import { Expando, Ref } from '@dxos/echo-schema';

export namespace CollaborationActions {
  export class InsertContent extends S.TaggedClass<InsertContent>()('assistant/intent-content', {
    input: S.Struct({
      target: Ref(Expando),
      object: Ref(Expando),
      label: S.String.pipe(S.optional),
    }).annotations({
      [AST.DescriptionAnnotationId]: 'Enables plugins to inject content blocks or references into a related entity.',
    }),
    output: S.Void,
  }) {}
}
