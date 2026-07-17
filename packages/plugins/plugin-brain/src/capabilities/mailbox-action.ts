//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Ref } from '@dxos/echo';
import { InboxCapabilities, InboxOperation } from '@dxos/plugin-inbox/types';

import { settingsAtom } from './settings';

/**
 * Injects the `Analyze` action into plugin-inbox's mailbox toolbar menu (fact analysis is owned by
 * brain). Reads the analysis settings (model/provider/strict) live via the atom registry at invoke
 * time, so a story or local setup can retarget analysis (e.g. to Ollama) without a rebuild.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;
    return [
      Capability.provide(InboxCapabilities.MailboxAction, {
        id: 'analyze',
        label: 'Analyze',
        icon: 'ph--graph--regular',
        createInvocation: (mailbox) => {
          const settings = registry.get(settingsAtom);
          return {
            operation: InboxOperation.AnalyzeMailbox,
            input: {
              mailbox: Ref.make(mailbox),
              ...(settings.model !== undefined ? { model: settings.model } : {}),
              ...(settings.provider !== undefined ? { provider: settings.provider } : {}),
              ...(settings.strict !== undefined ? { strict: settings.strict } : {}),
            },
          };
        },
      }),
    ];
  }),
);
