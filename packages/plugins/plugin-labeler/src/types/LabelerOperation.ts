//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as DecisionModel from 'effect/unstable/ai/DecisionModel';

import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Obj, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';

/** Hard per-run cap: one decision call per message, so a run must stay bounded. */
export const MAX_LABEL_MAILBOX_BATCH_LIMIT = 200;

/** Default number of messages labelled per run. */
export const DEFAULT_LABEL_MAILBOX_BATCH_LIMIT = 50;

/** Decision calls in flight at once; the questions for one message do not depend on another's. */
export const LABEL_MAILBOX_CONCURRENCY = 10;

/** Progress-registry key for a mailbox's labelling monitor. */
export const createLabelProgressKey = (mailbox: Mailbox.Mailbox) => `${Obj.getURI(mailbox).toString()}#label`;

export const LabelMailbox = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.labeler.labelMailbox'),
    name: 'Label Mailbox',
    description:
      "Labels mailbox messages with the space's own tags, plus needs-reply and urgent, using a decision model.",
    icon: 'ph--tag--regular',
  },
  services: [DecisionModel.DecisionModel, Database.Service, Trace.TraceService],
  input: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotate({
      description: 'Mailbox whose feed messages are labelled.',
    }),
    batchLimit: Schema.optional(
      Schema.Number.pipe(Schema.check(Schema.isGreaterThan(0)), Schema.check(Schema.isInt())).annotate({
        description: 'Maximum messages labelled this run (hard-capped at 200).',
      }),
    ),
    minConfidence: Schema.optional(
      Schema.Number.pipe(Schema.check(Schema.isBetween({ minimum: 0, maximum: 1 }))).annotate({
        description: 'Confidence a label or urgency answer must reach before it is applied.',
      }),
    ),
  }),
  output: Schema.Struct({
    /** Messages asked about this run. */
    processed: Schema.Number,
    /** Messages that received a label from the space's own tags. */
    labelled: Schema.Number,
    /** Messages tagged as needing a reply. */
    needsReply: Schema.Number,
    /** Messages tagged urgent. */
    urgent: Schema.Number,
    /** Messages skipped because they already carried one of these tags. */
    skipped: Schema.Number,
  }),
}).pipe(Operation.idempotent);
