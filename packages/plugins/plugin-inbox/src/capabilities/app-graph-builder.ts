//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { getSpace } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { AutomationCapabilities, invokeFunctionWithTracing } from '@dxos/plugin-automation';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { ACTION_TYPE, atomFromSignal, createExtension } from '@dxos/plugin-graph';
import { kebabize } from '@dxos/util';

import { gmail } from '../functions';
import { meta } from '../meta';
import { Mailbox } from '../types';

import { InboxCapabilities } from './capabilities';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${meta.id}/mailbox-filters`,
      connector: (node) =>
        Atom.make((get) =>
          Function.pipe(
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
                atomFromSignal(() => [
                  {
                    id: `${Obj.getDXN(mailbox).toString()}-unfiltered`,
                    type: `${Mailbox.Mailbox.typename}-filter`,
                    data: mailbox,
                    properties: {
                      label: ['inbox label', { ns: meta.id }],
                      icon: 'ph--tray--regular',
                      filter: null,
                    },
                  },
                  ...mailbox.filters?.map(({ name, filter }) => ({
                    id: `${Obj.getDXN(mailbox).toString()}-filter-${kebabize(name)}`,
                    type: `${Mailbox.Mailbox.typename}-filter`,
                    data: mailbox,
                    properties: {
                      label: name,
                      icon: 'ph--tray--regular',
                      filter,
                    },
                    nodes: [
                      {
                        id: `${Obj.getDXN(mailbox).toString()}-filter-${kebabize(name)}-delete`,
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
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (Obj.instanceOf(Mailbox.Mailbox, node.data) ? Option.some(node) : Option.none())),
            Option.map((node) => {
              const state = get(context.capabilities(InboxCapabilities.MailboxState))[0];
              const message = get(atomFromSignal(() => state?.[node.id]));
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
    createExtension({
      id: `${meta.id}/sync`,
      actions: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) =>
              Obj.instanceOf(Mailbox.Mailbox, node.data) ? Option.some(node.data) : Option.none(),
            ),
            Option.map((mailbox) =>
              get(
                atomFromSignal(() => [
                  {
                    id: `${Obj.getDXN(mailbox).toString()}-sync`,
                    type: ACTION_TYPE,
                    data: async () => {
                      const space = getSpace(mailbox);
                      invariant(space);
                      const computeRuntime = context.getCapability(AutomationCapabilities.ComputeRuntime);
                      const runtime = computeRuntime.getRuntime(space.id);
                      await runtime.runPromise(
                        invokeFunctionWithTracing(gmail.sync, { mailboxId: Obj.getDXN(mailbox).toString() }),
                      );
                    },
                    properties: {
                      label: ['sync mailbox label', { ns: meta.id }],
                      icon: 'ph--arrows-clockwise--regular',
                      disposition: 'list-item',
                    },
                  },
                ]),
              ),
            ),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);
