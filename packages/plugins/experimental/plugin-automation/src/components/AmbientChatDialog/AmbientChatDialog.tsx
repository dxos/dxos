//
// Copyright 2025 DXOS.org
//

import React, { useState } from 'react';

import { Dialog, Icon, IconButton, useTranslation } from '@dxos/react-ui';
import { resizeAttributes, ResizeHandle, type Size, sizeStyle } from '@dxos/react-ui-dnd';

import { AUTOMATION_PLUGIN } from '../../meta';
import { PromptBar } from '../Prompt';

const preventDefault = (event: Event) => event.preventDefault();

export const AmbientChatDialog = () => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  const [size, setSize] = useState<Size>('min-content');
  // TODO(burdon): Hack to make resize handle re-render.
  const [iter, setIter] = useState(0);

  return (
    <div role='none' className='dx-dialog__overlay bg-transparent pointer-events-none' data-block-align='end'>
      <Dialog.Content
        onInteractOutside={preventDefault}
        classNames='pointer-events-auto relative overflow-hidden p-2 is-[30rem] max-is-none'
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

        <div className='w-full grid grid-cols-[2rem_1fr_2rem] gap-2'>
          <Dialog.Close>
            <div className='flex h-8 items-center justify-center'>
              <Icon icon='ph--x--regular' />
            </div>
          </Dialog.Close>
          <div className='grow'>
            <Dialog.Title classNames='sr-only'>{t('ambient chat dialog title')}</Dialog.Title>
          </div>
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

        <PromptBar microphone lineWrapping onSubmit={() => true} />
      </Dialog.Content>
    </div>
  );
};
