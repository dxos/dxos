//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, DXN } from '@dxos/echo';
// Referenced in the emitted .d.ts of the operations (via `ConnectorSpec`'s schemas); importing it
// lets TypeScript name it (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import { Connection } from '@dxos/link';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import * as MailSend from '@dxos/plugin-inbox/MailSend';
// eslint-disable-next-line unused-imports/no-unused-imports
import { type Message } from '@dxos/types';

import { meta } from '#meta';

/**
 * This provider's operations.
 *
 * Defined here rather than in plugin-inbox so a deployment without this connector never sees them:
 * plugin-inbox owns the mail domain, each provider owns its own wire protocol.
 */
const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

export const JmapSync = Operation.make({
  meta: {
    key: makeKey('jmapSync'),
    name: 'Sync JMAP',
    description: 'Sync emails from a JMAP server (e.g. Fastmail) to the mailbox feed.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: ConnectorSpec.SyncInput,
  output: Schema.Struct({
    newMessages: Schema.Number,
  }),
  // Capability (on-arrival extractors), Database (feed I/O), Trace (status) — provided by the invoker;
  // HTTP client and JMAP credentials are provided by the handler from the connection.
  services: [Capability.Service, Database.Service, Trace.TraceService],
}).pipe(Operation.visible, Operation.idempotent);

export const MaterializeJmapTarget = Operation.make({
  meta: {
    key: makeKey('materializeJmapTarget'),
    name: 'Materialize JMAP Target',
    description: 'Create the local Mailbox bound to a JMAP connection.',
    icon: 'ph--envelope--regular',
  },
  input: ConnectorSpec.MaterializeTargetInput,
  output: ConnectorSpec.MaterializeTargetOutput,
});

export const JmapSend = Operation.make({
  meta: {
    key: makeKey('jmapSend'),
    name: 'Send JMAP',
    description: 'Send an email via a JMAP server.',
    icon: 'ph--paper-plane-tilt--regular',
  },
  input: MailSend.Input,
  output: MailSend.Output,
}).pipe(Operation.visible);
