//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { ContentBlock } from '@dxos/types';

const COLLABORATION_OPERATION = 'org.dxos.app-framework.collaboration.operation';

/**
 * A text splice `[from, from+del) → insert`. Accept/Reject return the splice that undoes them (see
 * {@link RestoreText}), so the undo registry can reverse a partial cherry-pick.
 */
const TextSplice = Schema.Struct({
  from: Schema.Number,
  del: Schema.Number,
  insert: Schema.String,
});

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
  // The handler resolves and edits the subject's content Text; it needs database access only.
  services: [Database.Service],
  input: Schema.Struct({
    subject: Schema.Any,
    anchor: Schema.String,
    branch: Schema.String,
  }),
  // The splice that undoes the accept (restores the base text on the subject); absent on a no-op.
  output: Schema.Struct({ undo: Schema.optional(TextSplice) }),
});

/**
 * Reject an individual change from a branch: revert the hunk at `anchor` (a range in the base
 * subject) on the author's `branch` back to the base text, so the suggestion disappears. The reject
 * counterpart to {@link AcceptChange} — accept splices the branch's version into the base, reject
 * splices the base back into the branch.
 */
export const RejectChange = Operation.make({
  meta: {
    key: DXN.make(`${COLLABORATION_OPERATION}.rejectChange`),
    name: 'Reject Change',
    description: 'Reject an individual change from a branch.',
    icon: 'ph--x--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    subject: Schema.Any,
    anchor: Schema.String,
    branch: Schema.String,
  }),
  // The splice that undoes the reject (re-applies the suggested text on the branch); absent on a no-op.
  output: Schema.Struct({ undo: Schema.optional(TextSplice) }),
});

/**
 * Apply a text splice to a subject's content (main), or to one of its branches when `branch` is set.
 * Used as the inverse operation for {@link AcceptChange}/{@link RejectChange} undo.
 */
export const RestoreText = Operation.make({
  meta: {
    key: DXN.make(`${COLLABORATION_OPERATION}.restoreText`),
    name: 'Restore Text',
    description: 'Apply a text splice to a document or one of its branches.',
    icon: 'ph--arrow-counter-clockwise--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    subject: Schema.Any,
    branch: Schema.optional(Schema.String),
    from: Schema.Number,
    del: Schema.Number,
    insert: Schema.String,
  }),
  output: Schema.Void,
});
