//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { ContentBlock } from '@dxos/types';
import { DXN } from '@dxos/keys';

const COLLABORATION_OPERATION = 'org.dxos.app-framework.collaboration.operation';

export namespace CollaborationOperation {
  export const AcceptProposal = Operation.make({
    meta: {
      key: DXN.make(`${COLLABORATION_OPERATION}.acceptProposal`),
      name: 'Accept Proposal',
      description: 'Accept a proposal from a collaborator.',
      icon: 'ph--check--regular',
    },
    services: [Capability.Service],
    input: Schema.Struct({
      subject: Schema.Any,
      anchor: Schema.String,
      proposal: ContentBlock.Proposal,
    }),
    output: Schema.Void,
  });
}
