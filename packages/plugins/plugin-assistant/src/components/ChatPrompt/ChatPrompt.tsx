//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useState } from 'react';

import { useVoiceInput } from '@dxos/plugin-transcription';
import {
  Icon,
  IconButton,
  type ThemedClassName,
  Toolbar,
  Tooltip,
  useForwardedRef,
  useTranslation,
} from '@dxos/react-ui';
import { ChatEditor } from '@dxos/react-ui-chat';
import { type ChatEditorController, type ChatEditorProps } from '@dxos/react-ui-chat';
import { Spinner } from '@dxos/react-ui-sfx';
import { errorText, mx } from '@dxos/react-ui-theme';

import { meta } from '../../meta';

export type ChatPromptProps = ThemedClassName<
  Omit<ChatEditorProps, 'classNames'> & {
    compact?: boolean;
    error?: Error;
    processing?: boolean;
    microphone?: boolean;
  }
>;

export const ChatPrompt = forwardRef<ChatEditorController, ChatPromptProps>(
  ({ classNames, compact = true, error, processing, microphone, onCancel, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const promptRef = useForwardedRef<ChatEditorController>(forwardedRef);
    const [active, setActive] = useState(false);

    // TODO(burdon): Configure capability in TranscriptionPlugin.
    const { recording } = useVoiceInput({
      active,
      onUpdate: (text) => {
        promptRef.current?.setText(text);
        promptRef.current?.focus();
      },
    });

    if (compact) {
      return (
        <div
          className={mx(
            'flex shrink-0 w-full items-center overflow-hidden',
            'grid grid-cols-[var(--rail-action)_1fr_var(--rail-action)]',
            classNames,
          )}
        >
          <div className='flex w-[--rail-action] h-[--rail-action] items-center justify-center'>
            {(error && (
              <Tooltip.Trigger content={error.message} delayDuration={0}>
                <Icon icon='ph--warning-circle--regular' classNames={errorText} size={5} />
              </Tooltip.Trigger>
            )) || <Spinner active={processing} />}
          </div>

          <ChatEditor {...props} ref={promptRef} />
          <div className='flex w-[--rail-action] h-[--rail-action] items-center justify-center'>
            {microphone && (
              <ActionButtons
                processing={processing}
                recording={recording}
                onCancel={onCancel}
                onRecordChange={setActive}
              />
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={mx('flex flex-col shrink-0 w-full', classNames)}>
        <div className='flex'>
          <div className='flex shrink-0 w-[--rail-action] h-[--rail-action] items-center justify-center pbe-[3px]'>
            <Spinner active={processing} />
          </div>
          <ChatEditor classNames='p-2 w-full' lineWrapping {...props} ref={promptRef} />
        </div>
        <Toolbar.Root classNames='bg-transparent'>
          <IconButton
            disabled
            icon='ph--plus--regular'
            variant='ghost'
            size={5}
            iconOnly
            label={t('button cancel')}
            onClick={onCancel}
          />
          <div className='flex-1' />
          {microphone && (
            <ActionButtons
              processing={processing}
              recording={recording}
              onCancel={onCancel}
              onRecordChange={setActive}
            />
          )}
        </Toolbar.Root>
      </div>
    );
  },
);

type ActionButtonsProps = ChatPromptProps & {
  recording: boolean;
  onRecordChange: (recording: boolean) => void;
};

const ActionButtons = ({ processing, recording, onCancel, onRecordChange }: ActionButtonsProps) => {
  const { t } = useTranslation(meta.id);
  if (processing) {
    return (
      <IconButton
        classNames='px-1.5'
        variant='ghost'
        size={5}
        icon='ph--x--regular'
        iconOnly
        label={t('button cancel processing')}
        onClick={onCancel}
      />
    );
  }

  return (
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
      // onTouchStart={() => onRecordChange(true)}
      // onTouchEnd={() => onRecordChange(false)}
    />
  );
};
