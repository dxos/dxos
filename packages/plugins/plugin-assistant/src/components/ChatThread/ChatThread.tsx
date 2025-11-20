//
// Copyright 2025 DXOS.org
//

import React, { type CSSProperties, forwardRef, useCallback, useEffect, useMemo } from 'react';

import { PublicKey } from '@dxos/keys';
import { type Identity } from '@dxos/react-client/halo';
import { type ThemedClassName, useForwardedRef } from '@dxos/react-ui';
import { MarkdownStream, type MarkdownStreamController, type MarkdownStreamProps } from '@dxos/react-ui-markdown';
import { mx } from '@dxos/react-ui-theme';
import { type Message } from '@dxos/types';
import { keyToFallback } from '@dxos/util';

import { type ChatEvent } from '../Chat';

import { blockToMarkdown, componentRegistry } from './registry';
import { MessageSyncer } from './sync';

export type ChatThreadProps = ThemedClassName<
  {
    identity?: Identity;
    messages?: Message.Message[];
    error?: Error;
    onEvent?: (event: ChatEvent) => void;
  } & Pick<MarkdownStreamProps, 'cursor' | 'fadeIn' | 'debug'>
>;

// TODO(burdon): Memo thread position.
export const ChatThread = forwardRef<MarkdownStreamController, ChatThreadProps>(
  (
    { classNames, identity, messages = [], error, cursor = false, fadeIn = true, debug = false, onEvent },
    forwardedRef,
  ) => {
    const controllerRef = useForwardedRef(forwardedRef);
    const controller = controllerRef.current;

    const userHue = useMemo(
      () => identity?.profile?.data?.hue || keyToFallback(identity?.identityKey ?? PublicKey.random()).hue,
      [identity],
    );

    // Show error.
    useEffect(() => {
      controller?.scrollToBottom();
    }, [controller, error]);

    // Update document.
    const syncer = useMemo(() => controller && new MessageSyncer(controller, blockToMarkdown), [controller]);
    useEffect(() => {
      const reset = syncer?.append(messages, true);
      if (reset) {
        controller?.scrollToBottom('instant');
      }
    }, [syncer, messages]);

    // Event adapter.
    const handleEvent = useCallback<NonNullable<MarkdownStreamProps['onEvent']>>(
      ({ type, value }) => {
        switch (type) {
          case 'submit': {
            value && onEvent?.({ type, text: value });
            break;
          }
        }
      },
      [onEvent],
    );

    return (
      <div
        role='none'
        className={mx('flex bs-full is-full justify-center overflow-hidden', classNames)}
        style={{ '--user-fill': `var(--dx-${userHue}Fill)` } as CSSProperties}
      >
        <MarkdownStream
          ref={controllerRef}
          registry={componentRegistry}
          cursor={cursor}
          fadeIn={fadeIn}
          debug={debug}
          onEvent={handleEvent}
        />
      </div>
    );
  },
);
