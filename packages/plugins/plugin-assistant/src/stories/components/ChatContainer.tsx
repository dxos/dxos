//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React, { useCallback, useEffect, useState } from 'react';

import { Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Toolbar, useTranslation } from '@dxos/react-ui';

import { type ComponentProps } from './types';
import { Chat } from '../../components';
import { useBlueprintRegistry, useChatProcessor, useChatServices } from '../../hooks';
import { useOnline, usePresets } from '../../hooks';
import { meta } from '../../meta';
import { Assistant } from '../../types';

export const ChatContainer = ({ space }: ComponentProps) => {
  const { t } = useTranslation(meta.id);
  const [online, setOnline] = useOnline();
  const { preset, ...chatProps } = usePresets(online);

  const [chat, setChat] = useState<Assistant.Chat>();
  useEffect(() => {
    const results = space?.db.query(Filter.type(Assistant.Chat)).runSync();
    if (results?.length) {
      setChat(results[0].object);
    }
  }, [space]);

  const blueprintRegistry = useBlueprintRegistry();
  const services = useChatServices({ space });
  const processor = useChatProcessor({
    preset,
    chat,
    space,
    services,
    blueprintRegistry,
    noPluginArtifacts: true,
  });

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

  if (!chat || !processor) {
    return null;
  }

  return (
    <Chat.Root chat={chat} processor={processor} onEvent={(event) => log.info('event', { event })}>
      <Toolbar.Root classNames='border-b border-subduedSeparator'>
        {/* <Toolbar.Button>sss</Toolbar.Button> */}
        <Toolbar.IconButton icon='ph--plus--regular' iconOnly label={t('button new thread')} onClick={handleNewChat} />
        <Toolbar.IconButton
          disabled
          icon='ph--git-branch--regular'
          iconOnly
          label={t('button branch thread')}
          onClick={handleBranchChat}
        />
      </Toolbar.Root>
      <Chat.Thread />
      <div className='p-4'>
        <Chat.Prompt
          {...chatProps}
          classNames='p-2 border border-subduedSeparator rounded focus-within:outline focus-within:border-transparent outline-primary-500'
          preset={preset?.id}
          online={online}
          onChangeOnline={setOnline}
        />
      </div>
    </Chat.Root>
  );
};
