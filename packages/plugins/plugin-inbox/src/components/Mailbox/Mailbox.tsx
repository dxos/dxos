//
// Copyright 2025 DXOS.org
//

import React, {
  type KeyboardEvent,
  type MouseEvent,
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { addEventListener, combine } from '@dxos/async';
import { DxAvatar } from '@dxos/lit-ui/react';
import { Card, ScrollArea } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { type Message } from '@dxos/types';
import { composable, composableProps, getHashStyles } from '@dxos/ui-theme';
import { createContext } from '@radix-ui/react-context';

import { GoogleMail } from '../../apis';
import { type Mailbox as MailboxType } from '../../types';
import { getMessageProps } from '../../util';

//
// Context
//

const MAILBOX_NAME = 'Mailbox';

type MailboxContextValue = { currentMessageId?: string };

const [MailboxProvider, useMailboxContext] = createContext<MailboxContextValue>(MAILBOX_NAME);

export type MailboxAction =
  | { type: 'current'; messageId: string }
  | { type: 'select'; messageId: string }
  | { type: 'select-tag'; label: string }
  | { type: 'save'; filter: string };

export type MailboxActionHandler = (action: MailboxAction) => void;

//
// MessageTile
//

type MessageTileData = {
  message: Message.Message;
  labels?: MailboxType.Labels;
  onAction?: MailboxActionHandler;
};

type MessageTileProps = Pick<MosaicTileProps<MessageTileData>, 'location' | 'data'>;

const MessageTile = forwardRef<HTMLDivElement, MessageTileProps>(({ data, location }, forwardedRef) => {
  const { message, labels, onAction } = data;
  const { currentMessageId } = useMailboxContext('MessageTile');
  const { hue, from, date, subject, snippet } = getMessageProps(message, new Date(), true);

  const isCurrent = currentMessageId ? currentMessageId === message.id : undefined;

  const handleCurrentChange = useCallback(() => {
    onAction?.({ type: 'current', messageId: message.id });
  }, [message.id, onAction]);

  const handleAvatarClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      onAction?.({ type: 'select', messageId: message.id });
    },
    [message.id, onAction],
  );

  const handleTagClick = useCallback(
    (event: MouseEvent, label: string) => {
      event.stopPropagation();
      onAction?.({ type: 'select-tag', label });
    },
    [onAction],
  );

  const messageLabels = useMemo(() => {
    if (!labels || !Array.isArray(message.properties?.labels)) {
      return [];
    }

    return message.properties.labels
      .filter((labelId: string) => !GoogleMail.isSystemLabel(labelId))
      .map((labelId: string) => ({
        id: labelId,
        hue: getHashStyles(labelId).hue,
        label: labels[labelId],
      }))
      .filter((item) => item.label);
  }, [labels, message.properties?.labels]);

  return (
    <Mosaic.Tile asChild classNames='dx-hover dx-current dx-selected' id={message.id} data={data} location={location}>
      <Focus.Item asChild current={isCurrent} onCurrentChange={handleCurrentChange}>
        <Card.Root ref={forwardedRef} data-message-id={message.id}>
          <Card.Toolbar>
            <Card.IconBlock>
              <DxAvatar
                hue={hue}
                hueVariant='surface'
                variant='square'
                size={6}
                fallback={from}
                onClick={handleAvatarClick}
              />
            </Card.IconBlock>
            <Card.Title classNames='flex items-center gap-3'>
              <span className='grow truncate font-medium'>{subject}</span>
              <span className='text-xs text-description whitespace-nowrap shrink-0'>{date}</span>
            </Card.Title>
            <Card.Menu />
          </Card.Toolbar>
          <Card.Content>
            <Card.Row icon='ph--user--regular'>
              <Card.Text>{from}</Card.Text>
            </Card.Row>
            {snippet && (
              <Card.Row>
                <Card.Text variant='description'>{snippet}</Card.Text>
              </Card.Row>
            )}
            {messageLabels.length > 0 && (
              <Card.Row>
                <div role='none' className='flex flex-wrap gap-1 py-1'>
                  {messageLabels.map(({ id: labelId, label, hue: labelHue }) => (
                    <button
                      key={labelId}
                      type='button'
                      className='dx-tag dx-focus-ring'
                      data-hue={labelHue}
                      data-label={label}
                      onClick={(event) => handleTagClick(event, label)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Card.Row>
            )}
          </Card.Content>
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

MessageTile.displayName = 'MessageTile';

//
// Mailbox
//

export type MailboxProps = {
  id: string;
  messages: Message.Message[];
  labels?: MailboxType.Labels;
  currentMessageId?: string;
  ignoreAttention?: boolean;
  onAction?: MailboxActionHandler;
};

/**
 * Card-based mailbox component using mosaic layout.
 */
export const Mailbox = composable<HTMLDivElement, MailboxProps>(
  ({ messages, labels, currentMessageId, onAction, ...props }, forwardedRef) => {
    const [viewport, setViewport] = useState<HTMLElement | null>(null);
    const items = useMemo(
      () =>
        messages.map((message) => ({
          message,
          labels,
          onAction,
        })),
      [messages, labels, onAction],
    );

    // Focus restoration: when a focused MessageTile scrolls out of view, its DOM is unmounted
    // and focus moves to the container root. When the virtualizer brings it back into view,
    // we restore focus to the correct element.
    const stackRef = useRef<HTMLDivElement>(null);
    const focusedMessageId = useRef<string | null>(null);
    const [focusNonce, setFocusNonce] = useState(0);

    // Track which message tile last received focus via event delegation.
    // We use native listeners because MosaicVirtualStackProps doesn't include HTML events.
    useEffect(() => {
      const el = stackRef.current;
      if (!el) {
        return;
      }

      return combine(
        // When focus leaves the stack, clear the tracked ID — but only if focus moved to a
        // real element elsewhere. When relatedTarget is null it means focus went to document.body,
        // which is what browsers do when the focused DOM node is unmounted by the virtualizer.
        // In that case we keep the ID so we can restore focus when the item scrolls back.
        addEventListener(
          el,
          'blur',
          (event) => {
            const related = event.relatedTarget as HTMLElement | null;
            if (related && !el.contains(related)) {
              focusedMessageId.current = null;
            }
          },
          true,
        ),
        addEventListener(
          el,
          'focus',
          (event) => {
            const tile = (event.target as HTMLElement).closest<HTMLElement>('[data-message-id]');
            focusedMessageId.current = tile?.getAttribute('data-message-id') ?? null;
          },
          true,
        ),
      );
    }, []);

    // After React renders the newly-visible items, restore focus if needed.
    useLayoutEffect(() => {
      const id = focusedMessageId.current;
      if (!id || !stackRef.current) return;
      const activeEl = document.activeElement;
      // Restore when focus is inside our stack, OR when it went to document.body (which is
      // what happens when the virtualizer unmounts the focused tile — not a user navigation).
      if (activeEl !== document.body && !stackRef.current.contains(activeEl)) return;
      const tile = stackRef.current.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(id)}"]`);
      if (!tile || tile.contains(activeEl)) return;
      const focusable = tile.querySelector<HTMLElement>('[tabindex]:not([tabindex="-1"])') ?? tile;
      focusable.focus({ preventScroll: true });
    }, [focusNonce]);

    // onChange fires when the virtualizer scrolls; schedule a focus-restoration pass.
    const handleChange = useCallback(() => setFocusNonce((prev) => prev + 1), []);

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        (document.activeElement as HTMLElement | null)?.click();
      }
    }, []);

    return (
      <MailboxProvider currentMessageId={currentMessageId}>
        <Focus.Group {...composableProps(props)} asChild onKeyDown={handleKeyDown} ref={forwardedRef}>
          <Mosaic.Container asChild withFocus autoScroll={viewport}>
            <ScrollArea.Root orientation='vertical' padding>
              <ScrollArea.Viewport ref={setViewport}>
                <Mosaic.VirtualStack
                  ref={stackRef}
                  classNames='my-2'
                  gap={8}
                  items={items}
                  getId={(item) => item.message.id}
                  getScrollElement={() => viewport}
                  estimateSize={() => 150}
                  draggable={false}
                  Tile={MessageTile}
                  onChange={handleChange}
                />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Mosaic.Container>
        </Focus.Group>
      </MailboxProvider>
    );
  },
);

Mailbox.displayName = 'Mailbox';
