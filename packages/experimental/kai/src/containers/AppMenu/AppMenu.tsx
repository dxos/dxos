//
// Copyright 2022 DXOS.org
//

import { Chat, Chats, List, User } from '@phosphor-icons/react';
import React, { useEffect, useRef, useState } from 'react';

import { Button, DensityProvider, getSize, mx } from '@dxos/aurora';
import { Message } from '@dxos/kai-types';
import { DropdownMenu } from '@dxos/react-appkit';
import { ShellLayout, useQuery } from '@dxos/react-client';
import { useShell } from '@dxos/react-shell';

import { useAppReducer, useAppRouter, useAppState } from '../../hooks';
import { Actions } from './Actions';

export const AppMenu = () => {
  const shell = useShell();
  const { space } = useAppRouter();

  // TODO(burdon): Factor out kai-types Message dep (frame triggers event?)
  const { chat } = useAppState();
  const { setChat } = useAppReducer();
  const [newChat, setNewChat] = useState(false);
  const messages = useQuery(space, Message.filter());
  const messageCount = useRef(0);
  useEffect(() => {
    messageCount.current = 0;
  }, [space]);
  useEffect(() => {
    if (messageCount.current === 0) {
      messageCount.current = messages.length;
    } else if (messageCount.current !== messages.length) {
      setNewChat(true);
    }
  }, [messages]);

  return (
    <>
      {/* TODO(burdon): Help button. */}
      {/* TODO(burdon): Share button. */}
      <div className='flex items-center'>
        <DensityProvider density='coarse'>
          <Button
            variant='ghost'
            className='p-2'
            onClick={() => {
              setChat(!chat);
              setNewChat(false);
            }}
          >
            {(newChat && !chat && <Chats className={mx(getSize(6), 'animate-bounce')} />) || (
              <Chat className={getSize(6)} />
            )}
          </Button>
          <Button variant='ghost' className='p-2' onClick={() => shell.setLayout(ShellLayout.DEVICE_INVITATIONS)}>
            <User className={getSize(6)} />
          </Button>
          <DropdownMenu
            slots={{ content: { className: 'z-50' } }}
            trigger={
              <Button variant='ghost' className='p-2'>
                <List className={getSize(6)} />
              </Button>
            }
          >
            <Actions />
          </DropdownMenu>
        </DensityProvider>
      </div>
    </>
  );
};
