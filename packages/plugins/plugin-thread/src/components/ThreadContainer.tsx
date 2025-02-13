//
// Copyright 2024 DXOS.org
//

import React, { type ComponentProps } from 'react';

import { Surface } from '@dxos/app-framework';
import { PublicKey } from '@dxos/react-client';
import { getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { ChatContainer } from './ChatContainer';

const ThreadContainer = ({
  role,
  ...props
}: Pick<ComponentProps<typeof ChatContainer>, 'thread' | 'context'> & { role: string }) => {
  const space = getSpace(props.thread);
  return (
    <StackItem.Content toolbar={false}>
      <Surface
        data={{
          subject: { space, roomId: PublicKey.from(props.thread.id), type: 'dxos.org/plugin/calls/thread-calls' },
        }}
        role='thread-calls'
      />
      <ChatContainer {...props} />
    </StackItem.Content>
  );
};

export default ThreadContainer;
