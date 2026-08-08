//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Trigger } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { Connector } from '@dxos/plugin-connector';
import { MAIL_AUTO_SYNC, MAIL_SYNC_CRON } from '@dxos/plugin-inbox/sync';
import { InboxOperation, Mailbox, SyncOptions } from '@dxos/plugin-inbox/types';

import { JMAP_DEFAULT_HOST, JMAP_MAIL_CONNECTOR_ID } from '../constants';
import { jmapCredentialForm } from './credential-form';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Connector, [
      {
        id: JMAP_MAIL_CONNECTOR_ID,
        // Nominal default; the real `AccessToken.source` (host) is captured by the credential form.
        source: JMAP_DEFAULT_HOST,
        label: 'JMAP Mail',
        // Non-OAuth: host + email + Bearer API token, validated against the live session on submit.
        credentialForm: jmapCredentialForm,
        sync: {
          operation: InboxOperation.JmapSync,
          // What this connector binds — how `Mailbox` discovers it without naming JMAP.
          targetTypename: Type.getTypename(Mailbox.Mailbox),
          // Single-target connector (the account inbox): no `getTargets`. The coordinator calls
          // `materializeTarget` (no remoteTarget) to create the Mailbox, then binds.
          materializeTarget: InboxOperation.MaterializeJmapTarget,
          optionsSchema: SyncOptions,
          auto: MAIL_AUTO_SYNC,
          trigger: Trigger.specTimer(MAIL_SYNC_CRON),
        },
      },
    ]);
  }),
);
