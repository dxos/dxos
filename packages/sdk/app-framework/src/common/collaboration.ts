//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { DataType } from '@dxos/schema';

export namespace CollaborationActions {
  export class AcceptProposal extends Schema.TaggedClass<AcceptProposal>()('collaboration/accept-proposal', {
    input: Schema.Struct({
      subject: Schema.Any,
      anchor: Schema.String,
      proposal: DataType.MessageBlock.Proposal,
    }),
    output: Schema.Void,
  }) {}
}
