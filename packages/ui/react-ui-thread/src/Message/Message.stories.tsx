//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React, { useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { hoverableControls, hoverableFocusedWithinControls } from '@dxos/react-ui-theme';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { MessageRoot } from './Message';
import { threadLayout } from '../Thread';
import { ThreadStoryContainer, MessageStoryText, type MessageEntity } from '../testing';
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
    <ThreadStoryContainer>
      <div className={threadLayout}>
        <MessageRoot {...message} classNames={[hoverableControls, hoverableFocusedWithinControls]}>
          <MessageStoryText {...message} onDelete={() => console.log('delete')} />
        </MessageRoot>
      </div>
    </ThreadStoryContainer>
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
