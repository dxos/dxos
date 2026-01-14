//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/operation';
import { ContentBlock } from '@dxos/types';

const COLLABORATION_OPERATION = 'dxos.org/app-framework/collaboration/operation';

export namespace CollaborationOperation {
  export const AcceptProposal = Operation.make({
    meta: {
      key: `${COLLABORATION_OPERATION}/accept-proposal`,
      name: 'Accept Proposal',
      description: 'Accept a proposal from a collaborator.',
    },
    schema: {
      input: Schema.Struct({
        subject: Schema.Any,
        anchor: Schema.String,
        proposal: ContentBlock.Proposal,
      }),
      output: Schema.Void,
    },
  });
}
