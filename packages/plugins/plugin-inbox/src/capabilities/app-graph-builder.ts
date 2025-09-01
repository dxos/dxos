//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';

import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { createExtension, rxFromSignal } from '@dxos/plugin-graph';

import { INBOX_PLUGIN } from '../meta';
import { Mailbox } from '../types';

import { InboxCapabilities } from './capabilities';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${INBOX_PLUGIN}/mailbox-message`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (Obj.instanceOf(Mailbox.Mailbox, node.data) ? Option.some(node) : Option.none())),
            Option.map((node) => {
              const state = get(context.capabilities(InboxCapabilities.MailboxState))[0];
              const message = get(rxFromSignal(() => state?.[node.id]));
              return [
                {
                  id: `${node.id}${ATTENDABLE_PATH_SEPARATOR}message`,
                  type: PLANK_COMPANION_TYPE,
                  data: message ?? 'message',
                  properties: {
                    label: ['message label', { ns: INBOX_PLUGIN }],
                    icon: 'ph--envelope-open--regular',
                    disposition: 'hidden',
                  },
                },
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);
