//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type Dispatch, type PropsWithChildren, type SetStateAction, useEffect, useState } from 'react';

import { Dialog, Icon, IconButton, type ThemedClassName, useControlledState } from '@dxos/react-ui';
import { ResizeHandle, type Size, resizeAttributes, sizeStyle } from '@dxos/react-ui-dnd';
import { mx } from '@dxos/react-ui-theme';

const preventDefault = (event: Event) => event.preventDefault();

// TODO(burdon): Factor out.
const Endcap = ({ children }: PropsWithChildren) => (
  <div className='grid w-[var(--rail-action)] h-[var(--rail-action)] items-center justify-center'>{children}</div>
);

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

const [ChatDialogContextProvider, useChatDialogContext] = createContext<ChatDialogContextValue>('ChatDialog');

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
  open: _open = false,
  expanded: expandedParam = false,
  onOpenChange,
  onExpandedChange,
  onEscape,
}: ChatDialogRootProps) => {
  const [size, setSize] = useState<Size>('min-content');
  const [open, setOpen] = useControlledState<boolean>(_open, onOpenChange);
  const [expanded, setExpanded] = useControlledState<boolean>(expandedParam, onExpandedChange);

  // NOTE: We set the min size to 5rem (80px), and the header and prompt bar to 40px (i.e., the rail-size) each.
  // The dialog has no vertical padding and has box-content so that when closed it collapses to the size of the header and prompt bar.
  return (
    <ChatDialogContextProvider
      open={open}
      setOpen={setOpen}
      expanded={expanded}
      setExpanded={setExpanded}
      size={size}
      setSize={setSize}
    >
      <Dialog.Root modal={false} open={open} onOpenChange={setOpen}>
        <div role='none' className='dx-dialog__overlay bg-transparent pointer-events-none' data-block-align='end'>
          <Dialog.Content
            inOverlayLayout
            classNames={[
              'grid grid-rows-[var(--rail-action)_1fr_min-content] p-0 overflow-hidden',
              'box-content md:is-[35rem] md:max-is-none pointer-events-auto',
            ]}
            onEscapeKeyDown={onEscape}
            onInteractOutside={preventDefault}
          >
            {children}
          </Dialog.Content>
        </div>
      </Dialog.Root>
    </ChatDialogContextProvider>
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
  const { expanded, setExpanded } = useChatDialogContext(ChatDialogHeader.displayName);

  return (
    <div className={mx('grid grid-cols-[var(--rail-action)_1fr_min-content] items-center overflow-hidden', classNames)}>
      <Endcap>
        <Dialog.Close>
          <Icon icon='ph--x--regular' />
        </Dialog.Close>
      </Endcap>
      <Dialog.Title
        classNames='flex w-full justify-center text-sm text-subdued select-none cursor-pointer'
        onClick={() => setExpanded((expanded) => !expanded)}
      >
        {title}
      </Dialog.Title>
      <Endcap>
        <IconButton
          variant='ghost'
          icon='ph--caret-up--regular'
          iconOnly
          classNames={mx('!p-1 [&>svg]:transition [&>svg]:duration-200', expanded && '[&>svg]:rotate-180')}
          label={expanded ? 'Close' : 'Open'}
          onClick={() => setExpanded((expanded) => !expanded)}
        />
      </Endcap>
    </div>
  );
};

ChatDialogHeader.displayName = 'ChatDialog.Header';

//
// Content
//

type ChatDialogContentProps = ThemedClassName<PropsWithChildren>;

const ChatDialogContent = ({ children, classNames }: ChatDialogContentProps) => {
  const { expanded, size, setSize } = useChatDialogContext(ChatDialogContent.displayName);
  useEffect(() => {
    setSize(expanded ? 'min-content' : 0);
  }, [expanded]);

  return (
    <div
      className={mx(
        'flex flex-col overflow-y-auto border-t border-b border-subduedSeparator',
        'transition-[block-size] ease-in-out duration-0 [&:not([data-dx-resizing="true"])]:duration-200',
        classNames,
      )}
      style={{
        ...sizeStyle(size, 'vertical', true),
        maxBlockSize: 'calc(100dvh - env(safe-area-inset-bottom) - env(safe-area-inset-top) - 14rem)',
      }}
      {...resizeAttributes}
    >
      <ResizeHandle
        side='block-start'
        iconPosition='center'
        defaultSize='min-content'
        fallbackSize={0}
        minSize={0}
        onSizeChange={setSize}
      />
      {children}
    </div>
  );
};

ChatDialogContent.displayName = 'ChatDialog.Content';

//
// Footer
//

type ChatDialogFooterProps = ThemedClassName<PropsWithChildren>;

const ChatDialogFooter = ({ children, classNames }: ChatDialogFooterProps) => (
  <div className={mx(classNames)}>{children}</div>
);

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
