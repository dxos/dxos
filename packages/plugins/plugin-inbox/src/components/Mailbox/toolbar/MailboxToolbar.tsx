//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { type Signal } from '@preact/signals-core';
import { useMemo } from 'react';

import { MenuBuilder, rxFromSignal, useMenuActions } from '@dxos/react-ui-menu';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { INBOX_PLUGIN } from '../../../meta';
import { InboxAction, type MailboxType } from '../../../types';
import { type MailboxModel } from '../model/mailbox-model';

export const useMailboxToolbarActions = (
  mailbox: MailboxType,
  model: MailboxModel,
  tagFilterVisible: Signal<boolean>,
  setTagFilterVisible: (visible: boolean) => void,
) => {
  const { dispatchPromise } = useIntentDispatcher();

  const creator = useMemo(
    () =>
      Rx.make((get) =>
        MenuBuilder.make()
          .root({
            label: ['mailbox toolbar title', { ns: INBOX_PLUGIN }],
          })
          .action(
            'sort',
            () => {
              const newDirection = model.sortDirection === 'asc' ? 'desc' : 'asc';
              model.sortDirection = newDirection;
            },
            {
              label: get(
                rxFromSignal(() =>
                  model.sortDirection === 'asc'
                    ? ['mailbox toolbar sort oldest', { ns: INBOX_PLUGIN }]
                    : ['mailbox toolbar sort newest', { ns: INBOX_PLUGIN }],
                ),
              ),
              icon: get(
                rxFromSignal(() =>
                  model.sortDirection === 'asc' ? 'ph--sort-ascending--regular' : 'ph--sort-descending--regular',
                ),
              ),
              type: 'sort',
            },
          )
          .action(
            'filter',
            () => {
              const newVisibility = !tagFilterVisible.value;
              setTagFilterVisible(newVisibility);
            },
            {
              label: ['mailbox toolbar filter by tags', { ns: INBOX_PLUGIN }],
              icon: 'ph--tag--regular',
              type: 'filter',
              classNames: get(rxFromSignal(() => (tagFilterVisible.value ? 'text-accentText' : undefined))),
            },
          )
          .action('assistant', () => dispatchPromise(createIntent(InboxAction.RunAssistant, { mailbox })), {
            label: ['mailbox toolbar run mailbox ai', { ns: INBOX_PLUGIN }],
            icon: 'ph--sparkle--regular',
            type: 'assistant',
          })
          .build(),
      ),
    [model, tagFilterVisible, setTagFilterVisible],
  );

  return useMenuActions(creator);
};
