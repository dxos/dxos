//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';
import * as InboxOperation from '@dxos/plugin-inbox/InboxOperation';

import { JMAP_MAIL_CONNECTOR_ID } from '../constants';

/** Routes a draft whose mailbox is bound to a JMAP connection to this provider's send operation. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(InboxCapabilities.MailSendOperation, {
      connectorId: JMAP_MAIL_CONNECTOR_ID,
      getOperation: () => InboxOperation.JmapSend,
    });
  }),
);
