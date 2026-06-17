//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';
import { ContentBlock } from '@dxos/types';

const COLLABORATION_OPERATION = 'org.dxos.app-framework.collaboration.operation';

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

/**
 * Accept an individual change from another branch at an anchored region, without merging the whole
 * branch. The handler recomputes the latest diff between the subject's current branch and `branch`,
 * finds the hunk at `anchor`, and applies the compare branch's current text into the current branch
 * (a partial cherry-pick) — so the latest version is applied, not a snapshot.
 */
export const AcceptChange = Operation.make({
  meta: {
    key: DXN.make(`${COLLABORATION_OPERATION}.acceptChange`),
    name: 'Accept Change',
    description: 'Accept an individual change from a branch.',
    icon: 'ph--check--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Schema.Any,
    anchor: Schema.String,
    branch: Schema.String,
  }),
  output: Schema.Void,
});
