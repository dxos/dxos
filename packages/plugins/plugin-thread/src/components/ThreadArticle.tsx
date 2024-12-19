//
// Copyright 2024 DXOS.org
//

import React, { type ComponentProps, type FC } from 'react';

import { StackItem } from '@dxos/react-ui-stack';

import { ChatContainer } from './ChatContainer';

const ThreadArticle: FC<Pick<ComponentProps<typeof ChatContainer>, 'thread' | 'context'>> = (props) => {
  return (
    <StackItem.Content toolbar={false} role='article'>
      <ChatContainer {...props} />
    </StackItem.Content>
  );
};

export default ThreadArticle;
