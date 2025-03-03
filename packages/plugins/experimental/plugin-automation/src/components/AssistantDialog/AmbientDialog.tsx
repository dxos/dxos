//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect, useState } from 'react';

import { Dialog, Icon, IconButton } from '@dxos/react-ui';
import { resizeAttributes, ResizeHandle, type Size, sizeStyle } from '@dxos/react-ui-dnd';

const preventDefault = (event: Event) => event.preventDefault();

// TODO(burdon): Factor out.
export const AmbientDialog = ({ children, title }: PropsWithChildren<{ title?: string }>) => {
  const [resizeKey, setReizeKey] = useState(0);
  const [size, setSize] = useState<Size>('min-content');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(true);
  }, []);

  // TODO(burdon): Animate open/close.
  // NOTE: We set the min size to 5rem (80px), and the header and prompt bar to 40px each.
  // The dialog has no vertical padding and has box-content so that when closed it collapses to the size of the header and prompt bar.
  const minSize = 5;
  const handleToggle = useCallback(() => {
    setOpen((open) => {
      setSize(open ? minSize : 'min-content');
      setReizeKey((key) => key + 1);
      return !open;
    });
  }, []);

  return (
    <div role='none' className='dx-dialog__overlay bg-transparent pointer-events-none' data-block-align='end'>
      <Dialog.Content
        classNames='relative box-content py-0 px-2 is-[35rem] max-is-none overflow-hidden pointer-events-auto'
        inOverlayLayout
        {...resizeAttributes}
        style={{
          ...sizeStyle(size, 'vertical'),
          maxBlockSize: 'calc(100dvh - env(safe-area-inset-bottom) - env(safe-area-inset-top) - 8rem)',
        }}
        onInteractOutside={preventDefault}
      >
        <ResizeHandle
          key={resizeKey}
          side='block-start'
          defaultSize='min-content'
          minSize={minSize}
          fallbackSize={minSize}
          iconPosition='center'
          onSizeChange={setSize}
        />

        <DialogHeader open={open} title={title} onToggle={handleToggle} />

        {children}
      </Dialog.Content>
    </div>
  );
};

/**
 * Matches same layout grid as PromptBar.
 */
const DialogHeader = ({ open, title, onToggle }: { open: boolean; title?: string; onToggle: () => void }) => {
  return (
    <div className='flex shrink-0 w-full grid grid-cols-[40px_1fr_40px] items-center overflow-hidden'>
      <div className='flex w-[40px] h-[40px] items-center justify-center'>
        <Dialog.Close>
          <Icon icon='ph--x--regular' />
        </Dialog.Close>
      </div>
      <div className='grow'>
        <Dialog.Title classNames='flex justify-center text-xs text-subdued'>{title}</Dialog.Title>
      </div>
      <div className='flex w-[40px] h-[40px] items-center justify-center'>
        <IconButton
          variant='ghost'
          icon={'ph--caret-down--regular'}
          classNames={mx()}
          iconOnly
          label='Shrink'
          onClick={onToggle}
        />
      </div>
    </div>
  );
};
