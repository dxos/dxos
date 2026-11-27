//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Filter, Obj, Order, Query, Scope } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { type ActionGraphProps, ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { Message } from '@dxos/types';

import { ListModule, type ListRow } from './ListModule.tsx';
import { type SupportContextValue, useSupport } from './SupportContext.tsx';

/** The generators' controls: send one message, or let the actors send on their own. */
const Controls = ({ remaining, ready, playing, step, setPlaying, total }: SupportContextValue & { total: number }) => {
  const menu = useMenuBuilder(
    (): ActionGraphProps =>
      MenuBuilder.make()
        .text('title', { label: total > 0 ? `Messages (${total})` : 'Messages' })
        .separator('gap')
        .action(
          'step',
          {
            label: `Send next message (${remaining} left)`,
            icon: 'ph--skip-forward--regular',
            disabled: remaining === 0 || playing || !ready,
            disposition: 'toolbar',
            testId: 'support.step',
          },
          () => void step(),
        )
        .action(
          'play',
          {
            label: playing ? 'Pause the generators' : 'Start the generators',
            icon: playing ? 'ph--pause--regular' : 'ph--play--regular',
            disabled: remaining === 0 || !ready,
            disposition: 'toolbar',
            testId: 'support.play',
          },
          () => setPlaying(!playing),
        )
        .build(),
    [total, remaining, ready, playing, step, setPlaying],
  );
  return <ActionToolbar {...menu} alwaysActive />;
};

/** The support mailbox's feed, newest first, with the generators' controls. */
export const MessagesModule = () => {
  const support = useSupport();
  const messages = useQuery(
    support?.space.db,
    support
      ? Query.select(Filter.type(Message.Message))
          .from(Scope.feed(Obj.getURI(support.feed)))
          .orderBy(Order.property('created', 'desc'))
      : Query.select(Filter.nothing()),
  );
  const rows = useMemo<ListRow[]>(
    () =>
      messages.map((message) => ({
        id: message.id,
        label: `${message.sender.name ?? message.sender.email}: ${message.properties?.subject ?? ''}`,
        description: Message.extractText(message),
        icon: 'ph--envelope-simple--regular',
      })),
    [messages],
  );
  return (
    <ListModule
      title='Messages'
      rows={rows}
      empty='No messages yet. Send the next message, or start the generators.'
      testId='support.messages'
      header={support && <Controls {...support} total={rows.length} />}
    />
  );
};
