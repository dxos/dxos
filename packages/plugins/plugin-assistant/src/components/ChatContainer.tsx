//
// Copyright 2025 DXOS.org
//

import React, { useEffect } from 'react';

import { Capabilities, useCapability } from '@dxos/app-framework';
import { getSpace } from '@dxos/client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { type MaybePromise } from '@dxos/util';

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
  onProcessorReady?: (processor: AiChatProcessor) => MaybePromise<void>;
};

export const ChatContainer = ({ chat, onProcessorReady }: ChatContainerProps) => {
  const space = getSpace(chat);
  const settings = useCapability(Capabilities.SettingsStore).getStore<Assistant.Settings>(meta.id)?.value;
  const services = useChatServices({ space, chat });
  const [online, setOnline] = useOnline();
  const { preset, ...chatProps } = usePresets(online);
  const blueprintRegistry = useBlueprintRegistry();
  const processor = useChatProcessor({ space, chat, preset, services, blueprintRegistry, settings });

  // TODO(burdon): Handle new chat/branch.

  useEffect(() => {
    if (processor && onProcessorReady) {
      // TODO(burdon): Why setTimeout?
      const timeout = setTimeout(() => onProcessorReady(processor));
      return () => clearTimeout(timeout);
    }
  }, [processor, onProcessorReady]);

  if (!chat || !processor) {
    return null;
  }

  return (
    <StackItem.Content classNames='container-max-width'>
      <Chat.Root chat={chat} processor={processor}>
        <Chat.Thread />
        <div className='p-2'>
          <Chat.Prompt {...chatProps} outline preset={preset?.id} online={online} onOnlineChange={setOnline} />
        </div>
      </Chat.Root>
    </StackItem.Content>
  );
};

export default ChatContainer;
