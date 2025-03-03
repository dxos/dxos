//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useState } from 'react';

import { Dialog, Icon, IconButton, useTranslation } from '@dxos/react-ui';
import { resizeAttributes, ResizeHandle, type Size, sizeStyle } from '@dxos/react-ui-dnd';

import { AUTOMATION_PLUGIN } from '../../meta';

const preventDefault = (event: Event) => event.preventDefault();

const minSize = 5;

export const AmbientDialog = ({ children }: PropsWithChildren) => {
  const [size, setSize] = useState<Size>('min-content');
  const [open, setOpen] = useState(true);
  // TODO(thure): This seems like a smell, but ResizeHandle uses a ref internally in order to avoid rerendering while dragging. Consider refactoring to use Lit.
  const [iter, setIter] = useState(0);

  // TODO(burdon): Animate open/close.
  // NOTE: We set the min size to 5rem (80px), and the header and prompt bar to 40px each.
  // The dialog has no vertical padding and has box-content so that when closed it collapses to the size of the header and prompt bar.
  const handleToggle = useCallback(() => {
    setOpen((open) => {
      setSize(open ? minSize : 'min-content');
      setIter((iter) => iter + 1);
      return !open;
    });
  }, [iter]);

  return (
    <div role='none' className='dx-dialog__overlay bg-transparent pointer-events-none' data-block-align='end'>
      <Dialog.Content
        classNames='relative box-content py-0 px-2 md:is-[35rem] md:max-is-none overflow-hidden pointer-events-auto'
        inOverlayLayout
        {...resizeAttributes}
        style={{
          ...sizeStyle(size, 'vertical'),
          maxBlockSize: 'calc(100dvh - env(safe-area-inset-bottom) - env(safe-area-inset-top) - 8rem)',
        }}
        onInteractOutside={preventDefault}
      >
        <ResizeHandle
          key={iter}
          side='block-start'
          defaultSize='min-content'
          minSize={minSize}
          fallbackSize={minSize}
          iconPosition='center'
          onSizeChange={setSize}
        />

        <DialogHeader open={open} onToggle={handleToggle} />

        {children}
      </Dialog.Content>
    </div>
  );
};

/**
 * Matches same layout grid as PromptBar.
 */
const DialogHeader = ({ open, onToggle }: { open: boolean; onToggle: () => void }) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  return (
    <div className='flex shrink-0 w-full grid grid-cols-[var(--rail-action)_1fr_var(--rail-action)] items-center overflow-hidden'>
      <div className='flex is-[--rail-action] bs-[--rail-action] items-center justify-center'>
        <Dialog.Close>
          <Icon icon='ph--x--regular' />
        </Dialog.Close>
      </div>
      <div className='grow'>
        <Dialog.Title classNames='sr-only'>{t('ambient chat dialog title')}</Dialog.Title>
      </div>
      <div className='flex w-[--rail-action] h-[--rail-action] items-center justify-center'>
        <IconButton
          variant='ghost'
          icon={open ? 'ph--caret-down--regular' : 'ph--caret-up--regular'}
          iconOnly
          label={t('collapse label')}
          onClick={onToggle}
        />
      </div>
    </div>
  );
};
