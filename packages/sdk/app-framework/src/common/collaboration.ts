//
// Copyright 2025 DXOS.org
//

import { SchemaAST as AST, Schema as S } from 'effect';

export namespace CollaborationActions {
  export class InsertContent extends S.TaggedClass<InsertContent>()('assistant/intent-content', {
    input: S.Struct({
      label: S.String.pipe(S.optional),
      // TODO(burdon): Use ref?
      queueId: S.String,
      messageId: S.String,
      // TODO(burdon): Use ref?
      associatedArtifact: S.Struct({
        typename: S.String,
        id: S.String,
      }),
    }).annotations({
      [AST.DescriptionAnnotationId]: 'Enables plugins to inject content blocks or references into a related entity.',
    }),
    output: S.Void,
  }) {}
}
