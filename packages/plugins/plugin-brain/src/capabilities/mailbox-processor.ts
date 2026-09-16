//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Ref } from '@dxos/echo';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';

import { BrainOperation } from '#types';

import { settingsAtom } from './settings.ts';

/**
 * Contributes fact analysis as a feed processor rather than a toolbar menu item.
 *
 * This is what makes the missing-`FactStore` case structurally impossible instead of merely handled:
 * the pass and the layer it needs are contributed by the same plugin, so a deployment without brain
 * has no `analyze` processor to run rather than one that dies resolving a service nobody provided.
 * The uniform precondition gate in plugin-inbox stays as the backstop for anything else.
 *
 * Analysis settings (model/provider/strict) are read live from the atom registry at invoke time and
 * OVERRIDE the cascade's run options, so a story or local setup can retarget analysis (e.g. to Ollama)
 * without a rebuild — the reason the menu item read them this way too.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;
    return Capability.contribute(InboxCapabilities.MailboxProcessor, {
      id: 'analyze',
      tier: 'analyze',
      // Facts are extracted per message; running after the summarize pass keeps the cost ladder intact.
      after: ['summarize'],
      createInvocations: (mailbox, { model, provider, strict }) => {
        const settings = registry.get(settingsAtom);
        return [
          {
            operation: BrainOperation.AnalyzeMailbox,
            input: {
              mailbox: Ref.make(mailbox),
              model: settings.model ?? model,
              provider: settings.provider ?? provider,
              strict: settings.strict ?? strict,
            },
          },
        ];
      },
    });
  }),
);
