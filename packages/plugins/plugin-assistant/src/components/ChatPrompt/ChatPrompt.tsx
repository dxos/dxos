//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useState } from 'react';

import { useVoiceInput } from '@dxos/plugin-transcription';
import { Icon, IconButton, type ThemedClassName, Tooltip, useForwardedRef, useTranslation } from '@dxos/react-ui';
import { ChatEditor } from '@dxos/react-ui-chat';
import { type ChatEditorController, type ChatEditorProps } from '@dxos/react-ui-chat';
import { Spinner } from '@dxos/react-ui-sfx';
import { errorText, mx } from '@dxos/react-ui-theme';

import { meta } from '../../meta';

export type ChatPromptProps = ThemedClassName<
  Omit<ChatEditorProps, 'classNames'> & {
    error?: Error;
    processing?: boolean;
    microphone?: boolean;
  }
>;

// TODO(burdon): Split into Radix-style components.
export const ChatPrompt = forwardRef<ChatEditorController, ChatPromptProps>(
  ({ classNames, error, processing, microphone, onCancel, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
    const [active, setActive] = useState(false);

    // TODO(burdon): Configure capability in TranscriptionPlugin.
    const promptRef = useForwardedRef<ChatEditorController>(forwardedRef);
    const { recording } = useVoiceInput({
      active,
      onUpdate: (text) => {
        promptRef.current?.setText(text);
        promptRef.current?.focus();
      },
    });

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

        {(onCancel || microphone) && (
          <div className='flex w-[--rail-action] h-[--rail-action] items-center justify-center'>
            {processing && onCancel && (
              <IconButton
                classNames='px-1.5'
                variant='ghost'
                size={5}
                icon='ph--x--regular'
                iconOnly
                label={t('cancel processing button')}
                onClick={onCancel}
              />
            )}
            {!processing && microphone && (
              <IconButton
                classNames={mx('px-1.5', recording && 'bg-primary-500')}
                variant='ghost'
                size={5}
                icon='ph--microphone--regular'
                iconOnly
                noTooltip
                label={t('microphone button')}
                onMouseDown={() => setActive(true)}
                onMouseUp={() => setActive(false)}
                onTouchStart={() => setActive(true)}
                onTouchEnd={() => setActive(false)}
              />
            )}
          </div>
        )}
      </div>
    );
  },
);
