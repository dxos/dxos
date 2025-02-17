//
// Copyright 2024 DXOS.org
//

import React, { type ComponentProps } from 'react';

import { StackItem } from '@dxos/react-ui-stack';

import { ChatContainer } from './ChatContainer';

const ThreadContainer = ({
  role,
  ...props
}: Pick<ComponentProps<typeof ChatContainer>, 'thread' | 'context'> & { role: string }) => {
  return (
    <StackItem.Content toolbar={false}>
      <ChatContainer {...props} />
    </StackItem.Content>
  );
};

export default ThreadContainer;
