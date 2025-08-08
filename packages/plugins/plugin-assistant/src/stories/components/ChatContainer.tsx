//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React, { useCallback, useEffect, useState } from 'react';

import { Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Toolbar, useTranslation } from '@dxos/react-ui';

import { Chat } from '../../components';
import { useBlueprintRegistry, useChatProcessor, useChatServices } from '../../hooks';
import { useOnline, usePresets } from '../../hooks';
import { meta } from '../../meta';
import { Assistant } from '../../types';

import { type ComponentProps } from './types';
import { useQuery } from '@dxos/react-client/echo';

export const ChatContainer = ({ space }: ComponentProps) => {
  const { t } = useTranslation(meta.id);
  const [online, setOnline] = useOnline();
  const { preset, ...chatProps } = usePresets(online);

  const chats = useQuery(space, Filter.type(Assistant.Chat));
  const [chat, setChat] = useState<Assistant.Chat>();
  useEffect(() => {
    setChat((currentChat) => currentChat ?? chats[0]);
  }, [chat, chats]);

  const blueprintRegistry = useBlueprintRegistry();
  const services = useChatServices({ space });
  const processor = useChatProcessor({ space, chat, preset, services, blueprintRegistry });

  const handleNewChat = useCallback(() => {
    invariant(space);
    const chat = space.db.add(
      Obj.make(Assistant.Chat, {
        queue: Ref.fromDXN(space.queues.create().dxn),
      }),
    );
    setChat(chat);
  }, [space]);

  const handleBranchChat = useCallback(() => {}, [space]);

  return (
    <>
      <Toolbar.Root classNames='density-coarse border-b border-subduedSeparator'>
        <Toolbar.IconButton icon='ph--plus--regular' iconOnly label={t('button new thread')} onClick={handleNewChat} />
        <Toolbar.IconButton
          disabled
          icon='ph--git-branch--regular'
          iconOnly
          label={t('button branch thread')}
          onClick={handleBranchChat}
        />
      </Toolbar.Root>
      {!chat || !processor ? null : (
        <Chat.Root chat={chat} processor={processor} onEvent={(event) => log.info('event', { event })}>
          <Chat.Thread />
          <div className='p-4'>
            <Chat.Prompt
              {...chatProps}
              classNames='border border-transparent rounded focus-within:outline focus-within:border-transparent outline-primary-500'
              preset={preset?.id}
              online={online}
              onChangeOnline={setOnline}
            />
          </div>
        </Chat.Root>
      )}
    </>
  );
};
