//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { GMAIL_CONNECTOR_ID } from '../constants';
import { InboxCapabilities, InboxOperation } from '../types';

/**
 * Send-operation routing for Gmail. Moves to `@dxos/plugin-google` when that is extracted, the way the
 * JMAP entry already moved to `@dxos/plugin-jmap`; the composer resolves sends through the capability,
 * so each move leaves its consumer untouched.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(InboxCapabilities.MailSendOperation, {
        connectorId: GMAIL_CONNECTOR_ID,
        getOperation: () => InboxOperation.GmailSend,
      }),
    ];
  }),
);
