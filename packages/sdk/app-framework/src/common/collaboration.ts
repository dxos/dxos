//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { ContentBlock } from '@dxos/types';

export namespace CollaborationActions {
  export class AcceptProposal extends Schema.TaggedClass<AcceptProposal>()('collaboration/accept-proposal', {
    input: Schema.Struct({
      subject: Schema.Any,
      anchor: Schema.String,
      proposal: ContentBlock.Proposal,
    }),
    output: Schema.Void,
  }) {}
}
