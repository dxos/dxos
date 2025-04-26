//
// Copyright 2025 DXOS.org
//

import { SchemaAST as AST, Schema as S } from 'effect';

export namespace CollaborationActions {
  export class InsertContent extends S.TaggedClass<InsertContent>()('assistant/intent-content', {
    input: S.Struct({
      queueId: S.String,
      messageId: S.String,
      associatedArtifact: S.Struct({
        id: S.String,
        typename: S.String,
      }),
    }).annotations({
      [AST.DescriptionAnnotationId]: 'Enables plugins to inject content blocks or references into a related entity.',
    }),
    output: S.Void,
  }) {}
}
