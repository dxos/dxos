//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { IconButton, Select, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type ChatEvent } from './events';
import { meta } from '../../meta';

export type ChatActionsProps = {
  microphone?: boolean;
  recording?: boolean;
  processing?: boolean;
  onEvent?: (event: ChatEvent) => void;
};

export const ChatActions = ({ microphone, recording, processing, onEvent }: ChatActionsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <div className='flex items-center'>
      {/* TODO(burdon): Modes (models and/or presets for blueprints?). */}
      <Select.Root value={'ollama'} disabled>
        <Select.TriggerButton classNames='mie-2 text-sm' />
        <Select.Content>
          <Select.Option value={'ollama'} classNames='text-sm'>
            Ollama
          </Select.Option>
        </Select.Content>
      </Select.Root>

      {(processing && (
        <IconButton
          disabled={!processing}
          classNames='px-1.5'
          variant='ghost'
          size={5}
          icon='ph--x--regular'
          iconOnly
          label={t('button cancel processing')}
          onClick={() => onEvent?.({ type: 'cancel' })}
        />
      )) || (
        <IconButton
          classNames='px-1.5'
          variant='ghost'
          size={5}
          icon='ph--arrow-down--regular'
          iconOnly
          label={t('button scroll down')}
          onClick={() => onEvent?.({ type: 'scroll-to-bottom' })}
        />
      )}

      {microphone && (
        <IconButton
          disabled={!processing}
          classNames={mx('px-1.5', recording && 'bg-primary-500')}
          variant='ghost'
          size={5}
          icon='ph--microphone--regular'
          iconOnly
          noTooltip
          label={t('button microphone')}
          onMouseDown={() => onEvent?.({ type: 'record-start' })}
          onMouseUp={() => onEvent?.({ type: 'record-stop' })}
          onTouchStart={() => onEvent?.({ type: 'record-start' })}
          onTouchEnd={() => onEvent?.({ type: 'record-stop' })}
        />
      )}
    </div>
  );
};
