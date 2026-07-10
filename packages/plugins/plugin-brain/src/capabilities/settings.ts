//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Ref } from '@dxos/echo';
import { createKvsStore } from '@dxos/effect';
import { InboxCapabilities, InboxOperation } from '@dxos/plugin-inbox/types';

import { meta } from '#meta';
import { BrainCapabilities, BrainSettings } from '#types';

/**
 * Owns the fact-enrichment settings (model/provider/strict) and contributes the `Enrich` action into
 * plugin-inbox's mailbox toolbar menu. The action reads the settings live (via the atom registry) at
 * invoke time, so a story or local setup can retarget enrichment (e.g. to Ollama) without a rebuild.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const settingsAtom = createKvsStore({
      key: meta.profile.key,
      schema: BrainSettings.Settings,
      defaultValue: (): BrainSettings.Settings => ({}),
    });

    return [
      Capability.contributes(BrainCapabilities.Settings, settingsAtom),
      Capability.contributes(AppCapabilities.Settings, {
        prefix: meta.profile.key,
        schema: BrainSettings.Settings,
        atom: settingsAtom,
      }),
      Capability.contributes(InboxCapabilities.MailboxAction, {
        id: 'enrich',
        label: 'Enrich',
        icon: 'ph--graph--regular',
        createInvocation: (mailbox) => {
          const settings = registry.get(settingsAtom);
          return {
            operation: InboxOperation.EnrichMailbox,
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
