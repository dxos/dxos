//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React, { useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { hoverableControls, hoverableFocusedWithinControls } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { MessageRoot } from './Message';
import { Thread } from '../Thread';
import { MessageStoryText, type MessageEntity } from '../testing';
import { translations } from '../translations';

const DefaultStory = () => {
  const [identityKey] = useState(PublicKey.random());
  const [message] = useState<MessageEntity>({
    id: 'm1',
    timestamp: new Date().toISOString(),
    authorId: identityKey.toHex(),
    text: 'hello',
  });

  return (
    <div className='mli-auto is-96 overflow-y-auto'>
      <Thread.Root id='t1'>
        <MessageRoot {...message} classNames={[hoverableControls, hoverableFocusedWithinControls]}>
          <MessageStoryText {...message} onDelete={() => console.log('delete')} />
        </MessageRoot>
      </Thread.Root>
    </div>
  );
};

export default {
  title: 'ui/react-ui-thread/Message',
  component: MessageRoot,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  parameters: { translations },
};

export const Default = {};
