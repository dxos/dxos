//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useState } from 'react';

import { useVoiceInput } from '@dxos/plugin-transcription';
import { Icon, IconButton, type ThemedClassName, Tooltip, useForwardedRef, useTranslation } from '@dxos/react-ui';
import { Spinner } from '@dxos/react-ui-sfx';
import { errorText, mx } from '@dxos/react-ui-theme';

import { Prompt, type PromptController, type PromptProps } from './Prompt';
import { ASSISTANT_PLUGIN } from '../../meta';

export type PromptBarProps = ThemedClassName<
  Pick<
    PromptProps,
    | 'extensions'
    | 'references'
    | 'placeholder'
    | 'lineWrapping'
    | 'onSubmit'
    | 'onSuggest'
    | 'onCancel'
    | 'onOpenChange'
  > & {
    processing?: boolean;
    error?: Error;
    microphone?: boolean;
  }
>;

export const PromptBar = forwardRef<PromptController, PromptBarProps>(
  ({ classNames, placeholder, processing, error, microphone, references, onCancel, ...props }, forwardedRef) => {
    const { t } = useTranslation(ASSISTANT_PLUGIN);
    const promptRef = useForwardedRef<PromptController>(forwardedRef);
    const [active, setActive] = useState(false);

    // TODO(burdon): Configure capability in TranscriptionPlugin.
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
          'shrink-0 w-full grid grid-cols-[var(--rail-action)_1fr_var(--rail-action)] overflow-hidden',
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
        <Prompt
          ref={promptRef}
          autoFocus
          classNames='pbs-2'
          lineWrapping={true}
          placeholder={placeholder ?? t('prompt placeholder')}
          references={references}
          onCancel={onCancel}
          {...props}
        />
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
