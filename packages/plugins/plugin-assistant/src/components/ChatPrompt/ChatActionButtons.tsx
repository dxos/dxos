//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { IconButton, Select, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type ChatPromptProps } from './ChatPrompt';
import { meta } from '../../meta';

// TODO(burdon): Consider events over multiple callbacks.
export type ChatActionButtonsProps = Pick<ChatPromptProps, 'microphone' | 'processing' | 'onCancel'> & {
  recording: boolean;
  onScroll?: () => void;
  onRecordChange?: (recording: boolean) => void;
};

export const ChatActionButtons = ({
  microphone,
  processing,
  recording,
  onCancel,
  onScroll,
  onRecordChange,
}: ChatActionButtonsProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <>
      {/* TODO(burdon): Modes (models and/or presets for blueprints?). */}
      <Select.Root value={'research'}>
        <Select.TriggerButton classNames='mie-2' />
        <Select.Content>
          <Select.Option value={'research'}>Research</Select.Option>
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
          onClick={onCancel}
        />
      )) || (
        <IconButton
          classNames='px-1.5'
          variant='ghost'
          size={5}
          icon='ph--arrow-down--regular'
          iconOnly
          label={t('button scroll down')}
          onClick={() => onScroll?.()}
        />
      )}

      {microphone && onRecordChange && (
        <IconButton
          classNames={mx('px-1.5', recording && 'bg-primary-500')}
          variant='ghost'
          size={5}
          icon='ph--microphone--regular'
          iconOnly
          noTooltip
          label={t('button microphone')}
          onMouseDown={() => onRecordChange(true)}
          onMouseUp={() => onRecordChange(false)}
          onTouchStart={() => onRecordChange(true)}
          onTouchEnd={() => onRecordChange(false)}
        />
      )}
    </>
  );
};
