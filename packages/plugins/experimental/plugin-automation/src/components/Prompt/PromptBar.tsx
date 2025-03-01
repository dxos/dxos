//
// Copyright 2025 DXOS.org
//

import React, { useRef, useState } from 'react';

import { useVoiceInput } from '@dxos/plugin-transcription';
import { IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Spinner } from '@dxos/react-ui-sfx';
import { mx } from '@dxos/react-ui-theme';

import { Prompt, type PromptController, type PromptProps } from './Prompt';
import { AUTOMATION_PLUGIN } from '../../meta';

export type PromptBarProps = ThemedClassName<
  Pick<PromptProps, 'placeholder' | 'lineWrapping' | 'onSubmit' | 'onSuggest'> & {
    processing?: boolean;
    microphone?: boolean;
    onCancel?: () => void;
  }
>;

export const PromptBar = ({ classNames, placeholder, processing, microphone, onCancel, ...props }: PromptBarProps) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);

  const promptRef = useRef<PromptController>(null);
  const [active, setActive] = useState(false);
  const { recording } = useVoiceInput({
    active,
    onUpdate: (text) => {
      promptRef.current?.setText(text);
      promptRef.current?.focus();
    },
  });

  // TODO(burdon): Use rail/toolbar definition for height.
  return (
    <div className={mx('flex shrink-0 w-full grid grid-cols-[2rem_1fr_2rem] gap-2 overflow-hidden', classNames)}>
      <div className='flex h-[40px] items-center justify-center'>
        <Spinner active={processing} />
      </div>
      <Prompt
        ref={promptRef}
        autoFocus
        classNames='pbs-2'
        lineWrapping={true}
        placeholder={placeholder ?? t('prompt placeholder')}
        {...props}
      />
      {(onCancel || microphone) && (
        <div className='flex h-[40px] items-center justify-center'>
          {processing && onCancel && (
            <IconButton
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
              classNames={mx('p-0', recording && 'bg-primary-500')}
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
};
