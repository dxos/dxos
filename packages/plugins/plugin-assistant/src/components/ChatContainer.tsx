//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Capabilities, useCapability } from '@dxos/app-framework';
import { type AssociatedArtifact } from '@dxos/blueprints';
import { getSpace } from '@dxos/client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { Chat, type ChatPromptProps } from './Chat';
import { type AiServicePreset, AiServicePresets, useChatProcessor, useChatServices } from '../hooks';
import { meta } from '../meta';
import { type Assistant } from '../types';

export type ChatContainerProps = {
  role: string;
  chat: Assistant.Chat;
  /** @deprecated */
  artifact?: AssociatedArtifact;
};

export const ChatContainer = ({ chat, artifact }: ChatContainerProps) => {
  const space = getSpace(chat);
  const settings = useCapability(Capabilities.SettingsStore).getStore<Assistant.Settings>(meta.id)?.value;
  const services = useChatServices({ space });

  // TODO(burdon): Factor out.
  const [online, setOnline] = useState(true);
  const presets = useMemo(
    () => AiServicePresets.filter((preset) => online === (preset.provider === 'dxos-remote')),
    [online],
  );
  const [preset, setPreset] = useState<AiServicePreset>();
  const handleChangePreset = useCallback<NonNullable<ChatPromptProps['onChangePreset']>>(
    (id) => {
      const preset = presets.find((preset) => preset.id === id);
      if (preset) {
        setPreset(preset);
      }
    },
    [presets],
  );

  const processor = useChatProcessor({ preset, chat, services, settings });
  if (!processor) {
    return null;
  }

  // TODO(burdon): Add attention attributes.
  return (
    <StackItem.Content classNames='container-max-width'>
      <Chat.Root chat={chat} processor={processor} artifact={artifact}>
        <Chat.Thread />
        <div className='pbe-4 pis-2 pie-2'>
          <Chat.Prompt
            classNames='border border-subduedSeparator rounded-md'
            presets={presets.map(({ id, model, label }) => ({ id, label: label ?? model }))}
            preset={preset?.id}
            onChangeOnline={setOnline}
            onChangePreset={handleChangePreset}
          />
        </div>
      </Chat.Root>
    </StackItem.Content>
  );
};

export default ChatContainer;
