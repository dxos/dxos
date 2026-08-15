//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import type * as Operation from '@dxos/compute/Operation';
import { Type } from '@dxos/echo';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

import { CalendarSkill, InboxSendSkill, InboxSkill } from '#skills';
import { Calendar, InboxCapabilities, Mailbox } from '#types';

/**
 * Contributes the mail/calendar skills, resolving each provider's tools inside `make` so a provider
 * plugin activating after plugin-inbox is still seen.
 */
const skillDefinition = () =>
  Effect.gen(function* () {
    const context = yield* Capability.Service;

    const syncOperations = (typename: string): Operation.Definition.Any[] =>
      context
        .getAll(ConnectorSpec.Connector)
        .flat()
        .filter((connector) => connector.sync?.targetTypename === typename)
        .map((connector) => connector.sync!.operation);

    const sendOperations = (): Operation.Definition.Any[] =>
      context.getAll(InboxCapabilities.MailSendOperation).map((provider) => provider.getOperation());

    return [
      Capability.contributeAll(AppCapabilities.SkillDefinition, [
        {
          key: InboxSkill.key,
          make: () => InboxSkill.make({ syncOperations: syncOperations(Type.getTypename(Mailbox.Mailbox)) }),
        },
        {
          key: InboxSendSkill.key,
          make: () => InboxSendSkill.make({ sendOperations: sendOperations() }),
        },
        {
          key: CalendarSkill.key,
          make: () => CalendarSkill.make({ syncOperations: syncOperations(Type.getTypename(Calendar.Calendar)) }),
        },
      ]),
    ];
  });

export default skillDefinition;
