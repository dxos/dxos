//
// Copyright 2022 DXOS.org
//

import { Chat, Chats, List, User } from '@phosphor-icons/react';
import React, { useEffect, useRef, useState } from 'react';

import { Button, DropdownMenu, DensityProvider } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { Message } from '@dxos/kai-types';
import { ShellLayout } from '@dxos/react-client';
import { useQuery } from '@dxos/react-client/echo';
import { useShell } from '@dxos/react-shell';

import { Actions } from './Actions';
import { useAppReducer, useAppRouter, useAppState } from '../../hooks';

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
            classNames='p-2'
            onClick={() => {
              setChat(!chat);
              setNewChat(false);
            }}
          >
            {(newChat && !chat && <Chats className={mx(getSize(6), 'animate-bounce')} />) || (
              <Chat className={getSize(6)} />
            )}
          </Button>
          <Button variant='ghost' classNames='p-2' onClick={() => shell.setLayout(ShellLayout.SHARE_IDENTITY)}>
            <User className={getSize(6)} />
          </Button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant='ghost' classNames='p-2'>
                <List className={getSize(6)} />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content classNames='z-50'>
                <DropdownMenu.Viewport>
                  <Actions />
                </DropdownMenu.Viewport>
                <DropdownMenu.Arrow />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </DensityProvider>
      </div>
    </>
  );
};
