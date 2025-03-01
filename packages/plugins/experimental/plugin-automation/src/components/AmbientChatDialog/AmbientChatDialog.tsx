//
// Copyright 2025 DXOS.org
//

import React, { useState, useCallback, useRef } from 'react';

import { useVoiceInput } from '@dxos/plugin-transcription';
import { Dialog, Icon, IconButton, useTranslation } from '@dxos/react-ui';
import { resizeAttributes, ResizeHandle, type Size, sizeStyle } from '@dxos/react-ui-dnd';
import { type EditorView } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { AUTOMATION_PLUGIN } from '../../meta';
import { Prompt, type PromptProps } from '../Prompt';

const preventDefault = (event: Event) => event.preventDefault();

export const AmbientChatDialog = () => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  const [size, setSize] = useState<Size>('min-content');
  const [iter, setIter] = useState(0);

  const [prompt, setPrompt] = useState('');
  const promptRef = useRef<EditorView>();

  const [active, setActive] = useState(false);
  const { recording } = useVoiceInput({
    active,
    onUpdate: (text) => {
      setPrompt(text);
      promptRef.current?.focus();
    },
  });

  // TODO(burdon): Suggestions.
  const handleSuggest = useCallback<NonNullable<PromptProps['onSuggest']>>((text) => {
    return [];
  }, []);

  return (
    <div role='none' className='dx-dialog__overlay bg-transparent pointer-events-none' data-block-align='end'>
      <Dialog.Content
        onInteractOutside={preventDefault}
        classNames='pointer-events-auto relative overflow-hidden is-[500px] max-is-none'
        inOverlayLayout
        {...resizeAttributes}
        style={{
          ...sizeStyle(size, 'vertical'),
          maxBlockSize: 'calc(100dvh - env(safe-area-inset-bottom) - env(safe-area-inset-top) - 8rem)',
        }}
      >
        <ResizeHandle
          key={iter}
          side='block-start'
          defaultSize='min-content'
          minSize={5}
          fallbackSize={5}
          iconPosition='center'
          onSizeChange={setSize}
        />

        <div className='flex w-full items-center'>
          <Dialog.Title classNames='sr-only'>{t('ambient chat dialog title')}</Dialog.Title>
          <Dialog.Close>
            <Icon icon='ph--x--regular' size={4} />
          </Dialog.Close>
          <div className='grow' />
          <IconButton
            variant='ghost'
            icon='ph--caret-down--regular'
            iconOnly
            label='Shrink'
            onClick={() => {
              setIter((iter) => iter + 1);
              setSize('min-content');
            }}
          />
        </div>

        <div className='grid grid-cols-[1fr_auto] w-full'>
          <Prompt
            ref={promptRef}
            autoFocus
            lineWrapping
            classNames='pt-1'
            value={prompt}
            onEnter={setPrompt}
            onSuggest={handleSuggest}
          />
          <div className='flex flex-col h-full'>
            <IconButton
              classNames={mx(recording && 'bg-primary-500')}
              icon='ph--microphone--regular'
              iconOnly
              noTooltip
              label='Microphone'
              onMouseDown={() => setActive(true)}
              onMouseUp={() => setActive(false)}
            />
          </div>
        </div>
      </Dialog.Content>
    </div>
  );
};
