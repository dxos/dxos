//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { InboxCapabilities, InboxOperation } from '@dxos/plugin-inbox/types';

import { JMAP_MAIL_CONNECTOR_ID } from '../constants';

/** Routes a draft whose mailbox is bound to a JMAP connection to this provider's send operation. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(InboxCapabilities.MailSendOperation, {
      connectorId: JMAP_MAIL_CONNECTOR_ID,
      getOperation: () => InboxOperation.JmapSend,
    });
  }),
);
