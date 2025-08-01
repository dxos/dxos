//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { DESIGN_BLUEPRINT, PLANNING_BLUEPRINT } from '@dxos/assistant-testing';
import { Blueprint } from '@dxos/blueprints';
import { Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Toolbar, useTranslation } from '@dxos/react-ui';

import { type ComponentProps } from './types';
import { Chat, type ChatPromptProps } from '../../components';
import { type AiServicePreset, AiServicePresets } from '../../hooks';
import { useChatProcessor, useChatServices } from '../../hooks';
import { meta } from '../../meta';
import { Assistant } from '../../types';

export const ChatContainer = ({ space }: ComponentProps) => {
  const { t } = useTranslation(meta.id);

  const [chat, setChat] = useState<Assistant.Chat>();
  useEffect(() => {
    const results = space?.db.query(Filter.type(Assistant.Chat)).runSync();
    if (results?.length) {
      setChat(results[0].object);
    }
  }, [space]);

  // TODO(burdon): Memo preset for provider.
  const [online, setOnline] = useState(true);
  const [preset, setPreset] = useState<AiServicePreset>();
  const presets = useMemo(
    () => AiServicePresets.filter((preset) => online === (preset.provider === 'dxos-remote')),
    [online],
  );
  useEffect(() => {
    setPreset(presets[0]);
  }, [presets]);

  const services = useChatServices({ space });
  const blueprintRegistry = useMemo(() => new Blueprint.Registry([DESIGN_BLUEPRINT, PLANNING_BLUEPRINT]), []);
  const processor = useChatProcessor({
    preset,
    chat,
    space,
    services,
    blueprintRegistry,
    noPluginArtifacts: true,
  });

  const handleChangePreset = useCallback<NonNullable<ChatPromptProps['onChangePreset']>>(
    (id) => {
      const preset = presets.find((preset) => preset.id === id);
      if (preset) {
        setPreset(preset);
      }
    },
    [presets],
  );

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
          classNames='p-2 border border-subduedSeparator rounded focus-within:outline focus-within:border-transparent outline-primary-500'
          expandable
          online={online}
          presets={presets.map(({ id, model, label }) => ({ id, label: label ?? model }))}
          preset={preset?.id}
          onChangeOnline={setOnline}
          onChangePreset={handleChangePreset}
        />
      </div>
    </Chat.Root>
  );
};
