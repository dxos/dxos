//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayerSpec } from '@dxos/compute';
import { Imap, ImapUnavailable, Smtp, SmtpUnavailable } from '@dxos/functions';

//
// Capability Module
//
// Contributes an application-affinity LayerSpec that provides the runtime-bound
// `Imap`/`Smtp` services. On composer (browser) and CLI (node) the transport is
// the `Unavailable` sentinel: operations declaring `services: [Imap]`/`[Smtp]`
// resolve cleanly and fail fast with `reason: 'unavailable'` at call time rather
// than dying with a missing-service defect during process spawn. Workers function
// bundles substitute the live transport (`MailServicesLive` from
// `@dxos/plugin-inbox/mail-live`).
//

const MailServicesSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [],
    provides: [Imap, Smtp],
  },
  () => Layer.mergeAll(ImapUnavailable, SmtpUnavailable),
);

export default Capability.makeModule(() =>
  Effect.succeed([Capability.contributes(Capabilities.LayerSpec, MailServicesSpec)]),
);
