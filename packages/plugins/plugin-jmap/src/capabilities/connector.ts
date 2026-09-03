//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Trigger from '@dxos/compute/Trigger';
import { Type } from '@dxos/echo';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { MAIL_AUTO_SYNC, MAIL_REMOTE_SYNC, MAIL_SYNC_CRON } from '@dxos/plugin-inbox/sync';
import * as SyncOptions from '@dxos/plugin-inbox/SyncOptions';

import { JmapOperation } from '#types';

import { JMAP_DEFAULT_HOST, JMAP_MAIL_CONNECTOR_ID } from '../constants.ts';
import { jmapCredentialForm } from './credential-form.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ConnectorSpec.Connector, [
      {
        id: JMAP_MAIL_CONNECTOR_ID,
        // Nominal default; the real `AccessToken.source` (host) is captured by the credential form.
        source: JMAP_DEFAULT_HOST,
        label: 'JMAP Mail',
        // Non-OAuth: host + email + Bearer API token, validated against the live session on submit.
        credentialForm: jmapCredentialForm,
        sync: {
          operation: JmapOperation.JmapSync,
          // What this connector binds — how `Mailbox` discovers it without naming JMAP.
          targetTypename: Type.getTypename(Mailbox.Mailbox),
          // Single-target connector (the account inbox): no `getTargets`. The coordinator calls
          // `materializeTarget` (no remoteTarget) to create the Mailbox, then binds.
          materializeTarget: JmapOperation.MaterializeJmapTarget,
          optionsSchema: SyncOptions.SyncOptions,
          auto: MAIL_AUTO_SYNC,
          trigger: Trigger.specTimer(MAIL_SYNC_CRON),
          remote: MAIL_REMOTE_SYNC,
        },
      },
    ]);
  }),
);
