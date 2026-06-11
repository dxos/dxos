//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Mailbox } from '@dxos/plugin-inbox';

import { CrmMailboxCompanion } from '#containers';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      /**
       * CRM companion panel — rendered alongside a Mailbox plank.
       *
       * The companion node is created in app-graph-builder with `data: 'crm'`.
       * The surface matches when:
       *   1. The data is a literal Article with subject === 'crm'.
       *   2. The companionTo is a Mailbox instance.
       */
      Surface.create({
        id: 'crmMailboxCompanion',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'crm'),
          AppSurface.companion(AppSurface.Article, Mailbox.Mailbox),
        ),
        component: ({ data }) => <CrmMailboxCompanion companionTo={data.companionTo} />,
      }),
    ]),
  ),
);
