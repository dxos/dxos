//
// Copyright 2025 DXOS.org
//

import React, { type FC, type PropsWithChildren, useCallback, useState } from 'react';

import { Dialog, Icon, IconButton, useTranslation } from '@dxos/react-ui';
import { resizeAttributes, ResizeHandle, type Size, sizeStyle } from '@dxos/react-ui-dnd';

import { AUTOMATION_PLUGIN } from '../../meta';
import { type AIChatType } from '../../types';
import { ThreadContainer } from '../Thread';

const preventDefault = (event: Event) => event.preventDefault();

export const AmbientChatDialog: FC<{ chat?: AIChatType }> = ({ chat }) => {
  return (
    <ChatDialog>
      <ThreadContainer chat={chat} />
    </ChatDialog>
  );
};

const ChatDialog = ({ children }: PropsWithChildren) => {
  const [size, setSize] = useState<Size>('min-content');
  const [open, setOpen] = useState(true);

  // TODO(burdon): Animate open/close.
  // NOTE: We set the min size to 5rem (80px), and the header and prompt bar to 40px each.
  // The dialog has no vertical padding and has box-content so that when closed it collapses to the size of the header and prompt bar.
  const minSize = 5;
  const handleToggle = useCallback(() => {
    setOpen((open) => {
      setSize(open ? minSize : 'min-content');
      return !open;
    });
  }, []);

  return (
    <div role='none' className='dx-dialog__overlay bg-transparent pointer-events-none' data-block-align='end'>
      <Dialog.Content
        classNames='pointer-events-auto relative overflow-hidden box-content py-0 px-2 is-[35rem] max-is-none'
        inOverlayLayout
        {...resizeAttributes}
        style={{
          ...sizeStyle(size, 'vertical'),
          maxBlockSize: 'calc(100dvh - env(safe-area-inset-bottom) - env(safe-area-inset-top) - 8rem)',
        }}
        onInteractOutside={preventDefault}
      >
        <ResizeHandle
          side='block-start'
          defaultSize='min-content'
          minSize={minSize}
          fallbackSize={minSize}
          iconPosition='center'
          onSizeChange={setSize}
        />

        <Header open={open} onToggle={handleToggle} />

        {children}
      </Dialog.Content>
    </div>
  );
};

/**
 * Matches same layout grid as PromptBar.
 */
const Header = ({ open, onToggle }: { open: boolean; onToggle: () => void }) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  return (
    <div className='flex shrink-0 w-full grid grid-cols-[40px_1fr_40px] items-center overflow-hidden'>
      <div className='flex w-[40px] h-[40px] items-center justify-center'>
        <Dialog.Close>
          <Icon icon='ph--x--regular' />
        </Dialog.Close>
      </div>
      <div className='grow'>
        <Dialog.Title classNames='sr-only'>{t('ambient chat dialog title')}</Dialog.Title>
      </div>
      <div className='flex w-[40px] h-[40px] items-center justify-center'>
        <IconButton
          variant='ghost'
          icon={open ? 'ph--caret-down--regular' : 'ph--caret-up--regular'}
          iconOnly
          label='Shrink'
          onClick={onToggle}
        />
      </div>
    </div>
  );
};
