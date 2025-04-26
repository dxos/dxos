//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';

export namespace CollaborationActions {
  // TODO(burdon): Is this assistant specific? Just a generic Insert action?
  export class ContentProposal extends S.TaggedClass<ContentProposal>()('assistant/content-proposal', {
    input: S.Struct({
      queueId: S.String,
      messageId: S.String,
      associatedArtifact: S.Struct({
        id: S.String,
        typename: S.String,
      }),
    }),
    output: S.Void,
  }) {}
}
