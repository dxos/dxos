//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Database, Filter, Ref } from '@dxos/echo';
import { Connection } from '@dxos/link';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';

import { DebugOperation } from '#types';

import { sampleMailKey } from '../samples/triage/sample-mail.ts';

/**
 * The sample spaces' local mail account: a sample mailbox has no sync binding, so it is claimed through
 * the connection its template created for it, and its drafts are delivered locally.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(InboxCapabilities.MailSendOperation, {
      connectorId: DebugOperation.SAMPLE_MAIL_CONNECTOR_ID,
      getOperation: () => DebugOperation.SendSampleMail,
      resolveConnection: (mailbox) =>
        Database.query(Filter.foreignKeys(Connection.Connection, [sampleMailKey(mailbox)])).run.pipe(
          Effect.map(([connection]) => (connection ? Ref.make(connection) : undefined)),
          Effect.orElseSucceed(() => undefined),
        ),
    });
  }),
);
