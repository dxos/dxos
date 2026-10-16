//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Agent from '@dxos/assistant/Agent';
import { Filter, Obj, Ref } from '@dxos/echo';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';

import { BrainOperation } from '#types';

import { settingsAtom } from './settings.ts';

/**
 * Contributes fact analysis as a feed processor rather than a toolbar menu item. Facts land in the
 * brain of the space's agent, so a space with none (or several, where the choice is the user's) skips
 * the pass; a deployment without plugin-agent's brain fails the pass at plugin-inbox's precondition gate.
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
        const agents = Obj.getDatabase(mailbox)?.query(Filter.type(Agent.Agent)).runSync() ?? [];
        if (agents.length !== 1) {
          return { skip: `Fact analysis needs exactly one agent in the space; found ${agents.length}.` };
        }
        const settings = registry.get(settingsAtom);
        return [
          {
            operation: BrainOperation.AnalyzeMailbox,
            input: {
              mailbox: Ref.make(mailbox),
              agent: Ref.make(agents[0]),
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
