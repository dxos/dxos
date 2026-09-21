//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Ref } from '@dxos/echo';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';
import * as InboxEvents from '@dxos/plugin-inbox/InboxEvents';

import { BrainOperation } from '#types';

import { settingsAtom } from './settings.ts';

export const MailboxProcessor = Capability.makeModule(
  'MailboxProcessor',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [InboxCapabilities.MailboxProcessor],
    activatesOn: InboxEvents.Start,
  },
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
