//
// Copyright 2023 DXOS.org
//

import React, { type FC, useState } from 'react';

import { type Mailbox as MailboxType, type Message as MessageType } from '@braneframe/types';
import { Main } from '@dxos/react-ui';
import { baseSurface, fixedInsetFlexLayout, inputSurface, topbarBlockPaddingStart, mx } from '@dxos/react-ui-theme';

import { MessageList, styles } from './MessageList';

export const Mailbox: FC<{ mailbox: MailboxType }> = ({ mailbox }) => {
  const [selected, setSelected] = useState<MessageType>();
  const messages = [...mailbox.messages].reverse();

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      <div className='flex grow overflow-hidden'>
        <div className={mx('flex shrink-0 w-[400px] border-r', styles.border)}>
          <MessageList messages={messages} selected={selected?.id} onSelect={setSelected} />
        </div>
        <div className={mx('flex w-full overflow-auto px-8', inputSurface)}>
          {selected && <pre className='text-sm'>{selected.blocks[0].text}</pre>}
        </div>
      </div>
    </Main.Content>
  );
};
