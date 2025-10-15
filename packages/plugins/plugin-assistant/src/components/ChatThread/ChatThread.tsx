//
// Copyright 2025 DXOS.org
//

import React, {
  type CSSProperties,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';

import { PublicKey } from '@dxos/keys';
import { type Identity } from '@dxos/react-client/halo';
import { type ThemedClassName } from '@dxos/react-ui';
import { MarkdownStream, type MarkdownStreamController, type MarkdownStreamProps } from '@dxos/react-ui-components';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';
import { keyToFallback } from '@dxos/util';

import { type ChatEvent } from '../Chat';

import { blockToMarkdown, componentRegistry } from './registry';
import { MessageSyncer } from './sync';

export type ChatThreadController = Pick<MarkdownStreamController, 'setContext' | 'scrollToBottom'>;

export type ChatThreadProps = ThemedClassName<
  {
    identity?: Identity;
    messages?: DataType.Message[];
    error?: Error;
    overscroll?: number;
    onEvent?: (event: ChatEvent) => void;
  } & Pick<MarkdownStreamProps, 'cursor' | 'fadeIn' | 'overscroll'>
>;

export const ChatThread = forwardRef<ChatThreadController | null, ChatThreadProps>(
  (
    { classNames, identity, messages = [], error, cursor = false, fadeIn = true, overscroll, onEvent },
    forwardedRef,
  ) => {
    const userHue = useMemo(() => {
      return identity?.profile?.data?.hue || keyToFallback(identity?.identityKey ?? PublicKey.random()).hue;
    }, [identity]);

    // Expose controller.
    const [controller, setController] = useState<MarkdownStreamController | null>(null);
    useImperativeHandle(forwardedRef, () => (controller ? controller : (null as any)), [controller]);

    // Show error.
    useEffect(() => {
      controller?.scrollToBottom();
    }, [controller, error]);

    // Update document.
    const syncer = useMemo(() => controller && new MessageSyncer(controller, blockToMarkdown), [controller]);
    useEffect(() => {
      syncer?.sync(messages);
    }, [syncer, messages]);

    // Event handler.
    const handleEvent = useCallback<NonNullable<MarkdownStreamProps['onEvent']>>(
      (ev) => {
        switch (ev.type) {
          case 'submit': {
            ev.value &&
              onEvent?.({
                type: 'submit',
                text: ev.value,
              });
            break;
          }
        }
      },
      [onEvent],
    );

    return (
      <div
        className={mx('flex bs-full is-full justify-center overflow-hidden', classNames)}
        style={{ '--user-fill': `var(--dx-${userHue}Fill)` } as CSSProperties}
      >
        <MarkdownStream
          ref={setController}
          classNames='bs-full max-is-prose overflow-hidden'
          registry={componentRegistry}
          cursor={cursor}
          fadeIn={fadeIn}
          overscroll={overscroll}
          onEvent={handleEvent}
        />
      </div>
    );
  },
);
