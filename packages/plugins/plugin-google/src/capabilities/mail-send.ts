//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';

import { GoogleOperation } from '#types';

import { GMAIL_CONNECTOR_ID } from '../constants.ts';

/** Routes a draft whose mailbox is bound to a Gmail connection to this provider's send operation. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(InboxCapabilities.MailSendOperation, {
      connectorId: GMAIL_CONNECTOR_ID,
      getOperation: () => GoogleOperation.GmailSend,
    });
  }),
);
