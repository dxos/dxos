//
// Copyright 2025 DXOS.org
//

import React, { useState } from 'react';

import { Dialog, Icon, useTranslation } from '@dxos/react-ui';
import { resizeAttributes, ResizeHandle, type Size, sizeStyle } from '@dxos/react-ui-dnd';

import { AUTOMATION_PLUGIN } from '../../meta';

const preventDefault = (event: Event) => event.preventDefault();

export const AmbientChatDialog = () => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  const [size, setSize] = useState<Size>('min-content');
  return (
    <div role='none' className='dx-dialog__overlay bg-transparent pointer-events-none' data-block-align='end'>
      <Dialog.Content
        onInteractOutside={preventDefault}
        classNames='pointer-events-auto relative overflow-hidden'
        inOverlayLayout
        {...resizeAttributes}
        style={{
          ...sizeStyle(size, 'vertical'),
          maxBlockSize: 'calc(100dvh - env(safe-area-inset-bottom) - env(safe-area-inset-top) - 8rem)',
        }}
      >
        <ResizeHandle
          side='block-start'
          defaultSize='min-content'
          minSize={5}
          fallbackSize={5}
          iconPosition='center'
          onSizeChange={setSize}
        />
        <Dialog.Title classNames='sr-only'>{t('ambient chat dialog title')}</Dialog.Title>
        <Dialog.Close>
          <Icon icon='ph--x--regular' size={4} />
        </Dialog.Close>
        <h1>Hello</h1>
      </Dialog.Content>
    </div>
  );
};
