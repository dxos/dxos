//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { Mailbox } from '@dxos/plugin-inbox';
import { GraphBuilder } from '@dxos/plugin-graph';

import { meta } from '#meta';

/**
 * App-graph extension that attaches a CRM companion panel to every Mailbox node.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* GraphBuilder.createTypeExtension({
      id: 'crmMailboxCompanion',
      type: Mailbox.Mailbox,
      connector: () =>
        Effect.succeed([
          AppNode.makeCompanion({
            id: 'crm',
            label: ['crm-companion.label', { ns: meta.id }],
            icon: 'ph--address-book--regular',
            data: 'crm' as const,
          }),
        ]),
    });

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
