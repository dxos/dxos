//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { type Signal } from '@preact/signals-core';
import { useMemo } from 'react';

import { MenuBuilder, rxFromSignal, useMenuActions } from '@dxos/react-ui-menu';

import { meta } from '../../../meta';
import { type Mailbox } from '../../../types';

export const useMailboxToolbarActions = (
  mailbox: Mailbox.Mailbox,
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
              'filter',
              {
                label: ['mailbox toolbar filter by tags', { ns: meta.id }],
                icon: 'ph--magnifying-glass--regular',
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
      [tagFilterVisible, setTagFilterVisible],
    ),
  );
};
