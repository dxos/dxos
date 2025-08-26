//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback, useImperativeHandle } from 'react';

import { Capabilities, useCapability } from '@dxos/app-framework';
import { getSpace } from '@dxos/client/echo';
import { Toolbar, useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';

import {
  type AiChatProcessor,
  useBlueprintRegistry,
  useChatProcessor,
  useChatServices,
  useOnline,
  usePresets,
} from '../hooks';
import { meta } from '../meta';
import { type Assistant } from '../types';

import { Chat } from './Chat';

export type ChatContainerProps = {
  chat: Assistant.Chat;
  role?: string;
};

export const ChatContainer = forwardRef<AiChatProcessor | undefined, ChatContainerProps>(({ chat }, forwardedRef) => {
  const { t } = useTranslation(meta.id);
  const space = getSpace(chat);
  const settings = useCapability(Capabilities.SettingsStore).getStore<Assistant.Settings>(meta.id)?.value;
  const services = useChatServices({ space, chat });
  const [online, setOnline] = useOnline();
  const { preset, ...chatProps } = usePresets(online);
  const blueprintRegistry = useBlueprintRegistry();
  const processor = useChatProcessor({ space, chat, preset, services, blueprintRegistry, settings });
  useImperativeHandle(forwardedRef, () => processor);

  // TODO(burdon): Handle new chat/branch.
  const handleNewChat = useCallback(() => {
    // invariant(space);
    // const chat = space.db.add(
    //   Obj.make(Assistant.Chat, {
    //     queue: Ref.fromDXN(space.queues.create().dxn),
    //   }),
    // );
    // setChat(chat);
  }, [space]);

  if (!chat || !processor) {
    return null;
  }

  return (
    <StackItem.Content toolbar classNames='container-max-width'>
      <Toolbar.Root>
        <Toolbar.IconButton icon='ph--plus--regular' iconOnly label={t('button new thread')} onClick={handleNewChat} />
      </Toolbar.Root>
      <Chat.Root chat={chat} processor={processor}>
        <Chat.Thread />
        <div className='p-2'>
          <Chat.Prompt {...chatProps} outline preset={preset?.id} online={online} onOnlineChange={setOnline} />
        </div>
      </Chat.Root>
    </StackItem.Content>
  );
});

export default ChatContainer;
