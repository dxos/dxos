//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { type Signal } from '@preact/signals-core';
import { useMemo } from 'react';

import { MenuBuilder, rxFromSignal, useMenuActions } from '@dxos/react-ui-menu';

import { meta } from '../../../meta';
import { type Mailbox } from '../../../types';
import { type MailboxModel } from '../model/mailbox-model';

export const useMailboxToolbarActions = (
  mailbox: Mailbox.Mailbox,
  model: MailboxModel,
  tagFilterVisible: Signal<boolean>,
  setTagFilterVisible: (visible: boolean) => void,
) => {
  return useMenuActions(
    useMemo(
      () =>
        Rx.make((get) =>
          MenuBuilder.make()
            .root({
              label: ['mailbox toolbar title', { ns: meta.id }],
            })
            .action(
              'sort',
              {
                label: get(
                  rxFromSignal(() =>
                    model.sortDirection === 'asc'
                      ? ['mailbox toolbar sort oldest', { ns: meta.id }]
                      : ['mailbox toolbar sort newest', { ns: meta.id }],
                  ),
                ),
                icon: get(
                  rxFromSignal(() =>
                    model.sortDirection === 'asc' ? 'ph--sort-ascending--regular' : 'ph--sort-descending--regular',
                  ),
                ),
                type: 'sort',
              },
              () => {
                const newDirection = model.sortDirection === 'asc' ? 'desc' : 'asc';
                model.sortDirection = newDirection;
              },
            )
            .action(
              'filter',
              {
                label: ['mailbox toolbar filter by tags', { ns: meta.id }],
                icon: 'ph--tag--regular',
                type: 'filter',
                classNames: get(rxFromSignal(() => (tagFilterVisible.value ? 'text-accentText' : undefined))),
              },
              () => {
                const newVisibility = !tagFilterVisible.value;
                setTagFilterVisible(newVisibility);
              },
            )
            // TODO(wittjosiah): Not implemented.
            // .action(
            //   'assistant',
            //   {
            //     label: ['mailbox toolbar run mailbox ai', { ns: meta.id }],
            //     icon: 'ph--sparkle--regular',
            //     type: 'assistant',
            //   },
            //   () => dispatchPromise(createIntent(InboxAction.RunAssistant, { mailbox })),
            // )
            .build(),
        ),
      [model, tagFilterVisible, setTagFilterVisible],
    ),
  );
};
