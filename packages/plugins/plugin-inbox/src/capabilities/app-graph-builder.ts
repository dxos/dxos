//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import * as Option from 'effect/Option';
import * as pipe from 'effect/pipe';

import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { ACTION_TYPE, createExtension, rxFromSignal } from '@dxos/plugin-graph';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { kebabize } from '@dxos/util';

import { meta } from '../meta';
import { Mailbox } from '../types';

import { InboxCapabilities } from './capabilities';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${meta.id}/mailbox-filters`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) =>
              Obj.instanceOf(Mailbox.Mailbox, node.data) &&
              node.data.filters?.length > 0 &&
              node.properties.filter === undefined
                ? Option.some(node.data)
                : Option.none(),
            ),
            Option.map((mailbox) =>
              get(
                rxFromSignal(() => [
                  {
                    id: `${fullyQualifiedId(mailbox)}-unfiltered`,
                    type: `${Mailbox.Mailbox.typename}-filter`,
                    data: mailbox,
                    properties: {
                      label: ['inbox label', { ns: meta.id }],
                      icon: 'ph--tray--regular',
                      filter: null,
                    },
                  },
                  ...mailbox.filters?.map(({ name, filter }) => ({
                    id: `${fullyQualifiedId(mailbox)}-filter-${kebabize(name)}`,
                    type: `${Mailbox.Mailbox.typename}-filter`,
                    data: mailbox,
                    properties: {
                      label: name,
                      icon: 'ph--tray--regular',
                      filter,
                    },
                    nodes: [
                      {
                        id: `${fullyQualifiedId(mailbox)}-filter-${kebabize(name)}-delete`,
                        type: ACTION_TYPE,
                        data: async () => {
                          const index = mailbox.filters.findIndex((f) => f.name === name);
                          mailbox.filters.splice(index, 1);
                        },
                        properties: {
                          label: ['delete filter label', { ns: meta.id }],
                          icon: 'ph--trash--regular',
                          disposition: 'list-item',
                        },
                      },
                    ],
                  })),
                ]),
              ),
            ),
            Option.getOrElse(() => []),
          ),
        ),
    }),
    createExtension({
      id: `${meta.id}/mailbox-message`,
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
                    label: ['message label', { ns: meta.id }],
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
