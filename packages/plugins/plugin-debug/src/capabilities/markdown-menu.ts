//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';

import { meta } from '#meta';
import { DebugOperation } from '#types';
import { DebugEvents } from '#types';

/**
 * Contributes this plugin's editor commands to the markdown slash menu.
 *
 * One group per contributing plugin, so several debug commands share a single "Debug" heading
 * rather than each growing its own. The entry names an operation rather than a callback: the same
 * command is then reachable from a skill, the debug port, or a QA flow.
 */
export const MarkdownMenu = Capability.makeModule(
  'MarkdownMenu',
  { provides: [MarkdownCapabilities.MenuExtension], activatesOn: DebugEvents.Start },
  Effect.fnUntraced(function* () {
    return [
      Capability.contribute(MarkdownCapabilities.MenuExtension, {
        id: `${meta.profile.key}.command.loremIpsum`,
        label: 'Lorem ipsum',
        icon: 'ph--text-align-left--regular',
        group: { id: meta.profile.key, label: meta.profile.name ?? 'Debug' },
        operation: DebugOperation.InsertLoremIpsum,
      }),
    ];
  }),
);
