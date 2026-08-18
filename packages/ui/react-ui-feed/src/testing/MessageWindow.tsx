//
// Copyright 2026 DXOS.org
//

import React, { type ComponentType, useCallback, useMemo, useRef, useState } from 'react';

import { Column } from '@dxos/react-ui';
import { type Message } from '@dxos/types';

import {
  HtmlItem,
  MarkdownItem,
  type MessageChromeProps,
  Window,
  type WindowController,
  type WindowState,
} from '../components';
import { type MessageRenderer, defaultRenderer } from '../model';

/**
 * A feed of real messages placed by `Window`, and nothing else.
 *
 * The bridge between the placement layer and the thing it has to replace. `placement/*` proves the
 * shape against boxes that cannot lie about their size; `baseline/*` proves the current engine
 * against real editors. This is where those meet: the same messages, the same renderer and the same
 * chrome as a feed, but placed by the new module — so the baseline invariants can be pointed at it
 * and answer whether the replacement is ready, rather than the question being settled by argument.
 *
 * Deliberately *not* wired into `MessageList.Root`. Root owns the follow, the sticky tail, the
 * anchors and the cursor as well as the virtualizer, so swapping the placement inside it is not a
 * swap but a reimplementation — and doing that before this exists would leave nothing to check it
 * against.
 */
export type MessageWindowProps = {
  messages: Message.Message[];
  renderer?: MessageRenderer;
  Chrome?: ComponentType<MessageChromeProps>;
  Custom?: ComponentType<{ content: any; message: Message.Message }>;
  /** Extent of a row before it has been measured; a function where rows differ widely. */
  estimateSize?: number | ((message: Message.Message, index: number) => number);
  gutter?: 'sm' | 'md' | 'lg';
  onChange?: (state: WindowState) => void;
  controllerRef?: React.Ref<WindowController>;
};

const DefaultChrome = ({ children }: MessageChromeProps) => <>{children}</>;

export const MessageWindow = ({
  messages,
  renderer = defaultRenderer,
  Chrome = DefaultChrome,
  Custom,
  estimateSize = 120,
  gutter,
  onChange,
  controllerRef,
}: MessageWindowProps) => {
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const onSelect = useCallback((id: string) => setSelectedIds((current) => new Set(current).add(id)), []);

  const getId = useCallback((index: number) => messages[index]?.id ?? `missing-${index}`, [messages]);
  const extents = useMemo(
    () => ({
      of: (index: number) => {
        const message = messages[index];
        if (!message) {
          return typeof estimateSize === 'number' ? estimateSize : 120;
        }

        return typeof estimateSize === 'function' ? estimateSize(message, index) : estimateSize;
      },
    }),
    [messages, estimateSize],
  );

  return (
    <Window
      classNames='h-full'
      count={messages.length}
      getId={getId}
      extents={extents}
      onChange={onChange}
      controllerRef={controllerRef}
    >
      {(index) => {
        const message = messages[index];
        if (!message) {
          return null;
        }

        return (
          <Column.Root gutter={gutter}>
            <Column.Center>
              <Chrome message={message} index={index} selected={selectedIds.has(message.id)} onSelect={onSelect}>
                <Item content={renderer(message)} message={message} Custom={Custom} />
              </Chrome>
            </Column.Center>
          </Column.Root>
        );
      }}
    </Window>
  );
};

/**
 * The item's content, resolved without the list.
 *
 * `MessageList.Item` reads the renderer, the registry, the hits and the widget census from
 * `MessageList.Root`'s context, so it cannot be rendered outside the very thing this exists to
 * replace. Repeated here rather than refactored: making the item take its dependencies as props is
 * the right change and belongs in the retrofit, not in a harness written to measure it.
 */
const Item = ({
  content,
  message,
  Custom,
}: {
  content: ReturnType<MessageRenderer>;
  message: Message.Message;
  Custom?: ComponentType<{ content: any; message: Message.Message }>;
}) => (
  <>
    {content.kind === 'markdown' && <MarkdownItem text={content.text} />}
    {content.kind === 'html' && <HtmlItem html={content.html} />}
    {content.kind === 'custom' && Custom && <Custom content={content} message={message} />}
  </>
);

/** Kept for the stories that drive it; the ref is the same handle `placement/*` uses. */
export const useMessageWindow = () => useRef<WindowController>(null);
