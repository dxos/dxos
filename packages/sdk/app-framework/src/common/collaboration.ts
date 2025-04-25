//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';

export namespace CollaborationActions {
  export class ContentProposal extends S.TaggedClass<ContentProposal>()('assistant/content-proposal', {
    input: S.Struct({
      dxn: S.String,
      blockIndex: S.Number,
      content: S.String,
      associatedArtifact: S.Struct({
        id: S.String,
        typename: S.String,
      }),
    }),
    output: S.Void,
  }) {}
}
