//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type Dispatch, type PropsWithChildren, type SetStateAction, useEffect, useState } from 'react';

import { Dialog, Icon, IconButton, useControlledState, type ThemedClassName } from '@dxos/react-ui';
import { resizeAttributes, ResizeHandle, type Size, sizeStyle } from '@dxos/react-ui-dnd';
import { mx } from '@dxos/react-ui-theme';

const preventDefault = (event: Event) => event.preventDefault();

// TODO(burdon): Min size should be 82px (i.e., 2 x rail-size); 5rem is only 80px.
//  This currently causes the Footer to be unsettled when closed.
//  As a work around, setting minSize to 6rem and adding 16-2px padding to content.
// TODO(burdon): Allow for expandable multi-line input.
const minSize = 6;
const contentMargin = 'mbs-[6px] mbe-[6px]'; // Exclude border.

//
// Context
//

type ChatDialogContextValue = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  expanded: boolean;
  setExpanded: Dispatch<SetStateAction<boolean>>;
  size: Size;
  setSize: Dispatch<SetStateAction<Size>>;
};

const [ChadDialogContextProvider, useChatDialogContext] = createContext<ChatDialogContextValue>('ChatDialog');

//
// Root
//

type ChatDialogRootProps = PropsWithChildren<{
  open?: boolean;
  expanded?: boolean;
  onOpenChange?: (open: boolean) => void;
  onExpandedChange?: (expanded: boolean) => void;
  onEscape?: () => void;
}>;

const ChatDialogRoot = ({
  children,
  open = false,
  expanded = false,
  onOpenChange,
  onExpandedChange,
  onEscape,
}: ChatDialogRootProps) => {
  const [size, setSize] = useState<Size>('min-content');
  const [openState, setOpenState] = useControlledState<boolean>(open, onOpenChange);
  const [expandedState, setExpandedState] = useControlledState<boolean>(expanded, onExpandedChange);

  // NOTE: We set the min size to 5rem (80px), and the header and prompt bar to 40px (i.e., the rail-size) each.
  // The dialog has no vertical padding and has box-content so that when closed it collapses to the size of the header and prompt bar.
  return (
    <ChadDialogContextProvider
      open={openState}
      setOpen={setOpenState}
      expanded={expandedState}
      setExpanded={setExpandedState}
      size={size}
      setSize={setSize}
    >
      <Dialog.Root modal={false} open={openState} onOpenChange={setOpenState}>
        <div role='none' className='dx-dialog__overlay bg-transparent pointer-events-none' data-block-align='end'>
          <Dialog.Content
            classNames={[
              'box-content md:is-[35rem] md:max-is-none pointer-events-auto',
              'transition-[block-size] ease-in-out duration-0 [&:not([data-dx-resizing="true"])]:duration-200',
              'grid grid-rows-[var(--rail-action)_1fr_var(--rail-action)] p-0 overflow-hidden',
            ]}
            inOverlayLayout
            {...resizeAttributes}
            style={{
              ...sizeStyle(size, 'vertical', true),
              maxBlockSize: 'calc(100dvh - env(safe-area-inset-bottom) - env(safe-area-inset-top) - 9rem)',
            }}
            onEscapeKeyDown={onEscape}
            onInteractOutside={preventDefault}
          >
            {children}
          </Dialog.Content>
        </div>
      </Dialog.Root>
    </ChadDialogContextProvider>
  );
};

ChatDialogRoot.displayName = 'ChatDialog.Root';

//
// Header
//

type ChatDialogHeaderProps = ThemedClassName<{
  title?: string;
}>;

const ChatDialogHeader = ({ classNames, title }: ChatDialogHeaderProps) => {
  const { setSize, expanded, setExpanded } = useChatDialogContext(ChatDialogHeader.displayName);

  // Update size and key.
  const [resizeKey, setReizeKey] = useState(0);
  useEffect(() => {
    setSize(expanded ? 'min-content' : minSize);
    setReizeKey((key) => key + 1);
  }, [expanded]);

  return (
    <div className={mx('flex w-full items-center overflow-hidden', classNames)}>
      <div className='flex w-[--rail-action] h-[--rail-action] items-center justify-center'>
        <Dialog.Close>
          <Icon icon='ph--x--regular' />
        </Dialog.Close>
      </div>
      <div className='grow'>
        {title && (
          <Dialog.Title
            classNames='flex justify-center text-sm text-subdued cursor-pointer'
            onClick={() => setExpanded((expanded) => !expanded)}
          >
            {title}
          </Dialog.Title>
        )}
      </div>
      <div className='flex w-[--rail-action] h-[--rail-action] items-center justify-center'>
        <IconButton
          variant='ghost'
          icon='ph--caret-up--regular'
          iconOnly
          classNames={mx('!p-1 [&>svg]:transition [&>svg]:duration-200', expanded && '[&>svg]:rotate-180')}
          label={expanded ? 'Close' : 'Open'}
          onClick={() => setExpanded((expanded) => !expanded)}
        />
      </div>

      <ResizeHandle
        key={resizeKey}
        side='block-start'
        defaultSize='min-content'
        iconPosition='center'
        minSize={minSize}
        fallbackSize={minSize}
        onSizeChange={setSize}
      />
    </div>
  );
};

ChatDialogHeader.displayName = 'ChatDialog.Header';

//
// Content
//

type ChatDialogContentProps = ThemedClassName<PropsWithChildren>;

const ChatDialogContent = ({ children, classNames }: ChatDialogContentProps) => {
  const { expanded } = useChatDialogContext(ChatDialogContent.displayName);
  return (
    <div
      className={mx(
        'flex flex-col overflow-y-auto border-t border-b border-subduedSeparator',
        !expanded && 'border-transparent',
        contentMargin,
        classNames,
      )}
    >
      {children}
    </div>
  );
};

ChatDialogContent.displayName = 'ChatDialog.Content';

//
// Footer
//

type ChatDialogFooterProps = ThemedClassName<PropsWithChildren>;

const ChatDialogFooter = ({ children, classNames }: ChatDialogFooterProps) => {
  return <div className={mx('flex overflow-hidden', classNames)}>{children}</div>;
};

ChatDialogFooter.displayName = 'ChatDialog.Footer';

//
// ChatDialog
//

export const ChatDialog = {
  Root: ChatDialogRoot,
  Header: ChatDialogHeader,
  Content: ChatDialogContent,
  Footer: ChatDialogFooter,
};
