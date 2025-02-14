//
// Copyright 2024 DXOS.org
//

import React, { type ComponentProps } from 'react';

import { Surface } from '@dxos/app-framework';
import { PublicKey } from '@dxos/react-client';
import { getSpace } from '@dxos/react-client/echo';
import { Stack, StackItem } from '@dxos/react-ui-stack';

import { ChatContainer } from './ChatContainer';

const ThreadContainer = ({
  role,
  ...props
}: Pick<ComponentProps<typeof ChatContainer>, 'thread' | 'context'> & { role: string }) => {
  const space = getSpace(props.thread);
  return (
    <StackItem.Content toolbar={false}>
      <Stack orientation='vertical' size='contain' classNames='h-full overflow-hidden flex flex-col'>
        <StackItem.Root key={props.thread.id} item={{ id: `${props.thread.id}-calls` }} classNames='flex relative'>
          <Surface
            data={{
              subject: { space, roomId: PublicKey.from(props.thread.id), type: 'dxos.org/plugin/calls/thread-calls' },
            }}
            role='thread-calls'
            classNames='h-full'
          />
          <div className='absolute bottom-0 left-0 right-0 flex  h-min-[300px] justify-center'>
            <StackItem.Heading>
              <StackItem.ResizeHandle />
            </StackItem.Heading>
          </div>
        </StackItem.Root>

        <ChatContainer {...props} />
      </Stack>
    </StackItem.Content>
  );
};

export default ThreadContainer;
