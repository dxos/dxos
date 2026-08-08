//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { GMAIL_CONNECTOR_ID, JMAP_MAIL_CONNECTOR_ID } from '../constants';
import { InboxCapabilities, InboxOperation } from '../types';

/**
 * Send-operation routing for the built-in mail providers. Each entry moves to its own provider plugin
 * (`@dxos/plugin-google`, `@dxos/plugin-jmap`) when those are extracted; the composer resolves sends
 * through the capability, so that move leaves its consumer untouched.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(InboxCapabilities.MailSendOperation, {
        connectorId: GMAIL_CONNECTOR_ID,
        getOperation: () => InboxOperation.GmailSend,
      }),
      Capability.contributes(InboxCapabilities.MailSendOperation, {
        connectorId: JMAP_MAIL_CONNECTOR_ID,
        getOperation: () => InboxOperation.JmapSend,
      }),
    ];
  }),
);
