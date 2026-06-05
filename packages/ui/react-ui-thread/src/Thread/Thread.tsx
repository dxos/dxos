//
// Copyright 2023 DXOS.org
//

import React, {
  type ComponentPropsWithRef,
  forwardRef,
  type PropsWithChildren,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Obj } from '@dxos/echo';
import { Icon, ScrollArea, type ThemedClassName, useThemeContext, useTranslation } from '@dxos/react-ui';
import { Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { type Message as MessageType } from '@dxos/types';
import { type Extension, createBasicExtensions, createThemeExtensions, listener } from '@dxos/ui-editor';
import { hoverableControlItem, hoverableFocusedWithinControls, mx } from '@dxos/ui-theme';

import { command } from '../command';
import { ThreadContextProvider } from '../context';
import { Message } from '../Message';
import { translationKey } from '../translations';
import { type MessageMetadata, type ThreadContextValue } from '../types';

const getMessageId = (message: MessageType.Message) => Obj.getURI(message);

//
// Root
//

export type ThreadRootProps = ThemedClassName<
  PropsWithChildren<
    Omit<ThreadContextValue, 'components'> &
      Partial<Pick<ThreadContextValue, 'components'>> & {
        id?: string;
        current?: boolean | string;
      } & Pick<ComponentPropsWithRef<'div'>, 'onClickCapture' | 'onFocusCapture'>
  >
>;

/**
 * Root of a thread. Provides message-tile context and the Mosaic root that
 * `Thread.Messages` renders its (virtual) stack within.
 */
const ThreadRoot = forwardRef<HTMLDivElement, ThreadRootProps>(
  (
    {
      children,
      classNames,
      current,
      id,
      getMetadata,
      components,
      identityDid,
      editable,
      onMessageDelete,
      onAcceptProposal,
      ...props
    },
    forwardedRef,
  ) => {
    return (
      <ThreadContextProvider
        getMetadata={getMetadata}
        components={components ?? {}}
        identityDid={identityDid}
        editable={editable}
        onMessageDelete={onMessageDelete}
        onAcceptProposal={onAcceptProposal}
      >
        <Mosaic.Root>
          <div
            role='group'
            data-testid='thread'
            id={id}
            aria-current={current ? 'location' : undefined}
            {...props}
            className={mx(
              'flex flex-col bg-[var(--surface-bg)] current-related dx-attention-surface [--controls-opacity:0]',
              hoverableFocusedWithinControls,
              classNames,
            )}
            ref={forwardedRef}
          >
            {children}
          </div>
        </Mosaic.Root>
      </ThreadContextProvider>
    );
  },
);

ThreadRoot.displayName = 'Thread.Root';

//
// Header
//

export type ThreadHeaderProps = PropsWithChildren<{ detached?: boolean }>;

const ThreadHeader = forwardRef<HTMLParagraphElement, ThreadHeaderProps>(
  ({ children, detached, ...props }, forwardedRef) => {
    return (
      <div className='grid grid-cols-[var(--dx-rail-size)_1fr]'>
        <div className='flex items-center justify-center text-description'>
          <Icon icon='ph--caret-double-right--regular' />
        </div>
        <div className='flex items-center overflow-hidden'>
          <p
            role='heading'
            data-testid='thread.heading'
            {...props}
            className={mx('me-2 text-description font-medium truncate italic', detached && 'line-through decoration-1')}
            ref={forwardedRef}
          >
            {children}
          </p>
        </div>
      </div>
    );
  },
);

ThreadHeader.displayName = 'Thread.Header';

//
// Messages
//

const MessageTileAdapter = ({
  id,
  data,
  location,
  draggable,
  current,
  selected,
}: MosaicTileProps<MessageType.Message>) => (
  <Mosaic.Tile id={id} data={data} location={location} draggable={draggable} current={current} selected={selected}>
    <Message.Tile message={data} />
  </Mosaic.Tile>
);

export type ThreadMessagesProps = ThemedClassName<{
  messages: readonly MessageType.Message[];
  /** Estimated tile height for the virtualizer. */
  estimateSize?: number;
  currentId?: string;
}>;

/** Virtualized stack of message tiles (via Mosaic), within an internal scroll area. */
const ThreadMessages = ({ messages, estimateSize = 80, currentId, classNames }: ThreadMessagesProps) => {
  const [viewport, setViewport] = useState<HTMLElement | null>(null);
  const items = useMemo(() => messages.filter(Boolean), [messages]);

  return (
    <Mosaic.Container
      asChild
      orientation='vertical'
      autoScroll={viewport}
      currentId={currentId}
      eventHandler={{ id: 'thread', canDrop: () => false }}
    >
      <ScrollArea.Root classNames={mx('col-span-2', classNames)} orientation='vertical'>
        <ScrollArea.Viewport ref={setViewport}>
          <Mosaic.VirtualStack
            items={items}
            getId={getMessageId}
            Tile={MessageTileAdapter}
            draggable={false}
            getScrollElement={() => viewport}
            estimateSize={() => estimateSize}
          />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Mosaic.Container>
  );
};

ThreadMessages.displayName = 'Thread.Messages';

//
// Textbox
//

export type ThreadTextboxProps = MessageMetadata & {
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  extensions?: Extension;
  /**
   * Called with the composer content on send. Return `true` to accept (the
   * editor is cleared and remounted), `false` to reject.
   */
  onSend?: (text: string) => boolean;
};

/** Message composer pinned at the foot of a thread. */
const ThreadTextbox = ({ placeholder, autoFocus, disabled, extensions, onSend, ...metadata }: ThreadTextboxProps) => {
  const { t } = useTranslation(translationKey);
  const { themeMode } = useThemeContext();
  const messageRef = useRef('');
  const [count, setCount] = useState(0);

  const editorExtensions = useMemo(
    () =>
      [
        createBasicExtensions({ placeholder: placeholder ?? t('message.placeholder') }),
        createThemeExtensions({ themeMode }),
        listener({ onChange: ({ text }) => (messageRef.current = text) }),
        command,
        extensions,
      ].filter(Boolean) as Extension[],
    [themeMode, placeholder, t, extensions, count],
  );

  const handleSend = () => {
    const text = messageRef.current;
    if (!text?.length || !onSend) {
      return;
    }
    if (onSend(text)) {
      messageRef.current = '';
      setCount((value) => value + 1);
    }
  };

  return (
    <Message.Textbox
      {...metadata}
      autoFocus={autoFocus}
      disabled={disabled}
      extensions={editorExtensions}
      onSend={handleSend}
    />
  );
};

ThreadTextbox.displayName = 'Thread.Textbox';

//
// Status
//

export type ThreadStatusProps = ThemedClassName<PropsWithChildren> & {
  activity?: boolean;
};

const ThreadStatus = forwardRef<HTMLDivElement, ThreadStatusProps>(
  ({ activity, classNames, children, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    return (
      <div
        {...props}
        className={mx(
          'col-start-2 grid grid-cols-[min-content_1fr_max-content] pb-2 pe-2 text-xs text-description',
          classNames,
        )}
        ref={forwardedRef}
      >
        <Icon
          icon='ph--spinner--bold'
          classNames='w-6 h-4 invisible data-[visible=show]:visible animate-spin-slow'
          data-visible={activity ? 'show' : 'hide'}
        />
        <span className='truncate min-w-0' aria-live='polite'>
          {activity ? children : null}
        </span>
        <span className={mx('text-end', hoverableControlItem)}>{t('enter-to-send.message')}</span>
      </div>
    );
  },
);

ThreadStatus.displayName = 'Thread.Status';

//
// Thread
//

export const Thread = {
  Root: ThreadRoot,
  Header: ThreadHeader,
  Messages: ThreadMessages,
  Textbox: ThreadTextbox,
  Status: ThreadStatus,
};
