//
// Copyright 2025 DXOS.org
//

import React, { type CSSProperties, forwardRef, useCallback, useEffect, useMemo, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { type Identity } from '@dxos/react-client/halo';
import { type ThemedClassName, setRef } from '@dxos/react-ui';
import { MarkdownStream, type MarkdownStreamController, type MarkdownStreamProps } from '@dxos/react-ui-components';
import { type Message } from '@dxos/types';
import { mx } from '@dxos/ui-theme';
import { keyToFallback } from '@dxos/util';

import { type ChatEvent } from '../Chat';
import { blockToMarkdown, componentRegistry } from './registry';
import { MessageSyncer } from './sync';

const defaultOptions: MarkdownStreamProps['options'] = {
  autoScroll: true,
  // wire: true,
  cursor: true,
};

export type ChatThreadProps = ThemedClassName<
  {
    identity?: Identity;
    messages?: Message.Message[];
    error?: Error;
    onEvent?: (event: ChatEvent) => void;
  } & Pick<MarkdownStreamProps, 'options' | 'debug'>
>;

// TODO(burdon): Memo thread position.
export const ChatThread = forwardRef<MarkdownStreamController | null, ChatThreadProps>(
  ({ classNames, identity, messages = [], error, options = defaultOptions, debug = false, onEvent }, forwardedRef) => {
    const [controller, setController] = useState<MarkdownStreamController | null>(null);
    const handleMarkdownStreamRef = useCallback(
      (instance: MarkdownStreamController | null) => {
        setController(instance);
        setRef(forwardedRef, instance);
      },
      [forwardedRef],
    );

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
    }, [controller, syncer, messages]);

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
        className={mx('flex h-full w-full justify-center overflow-hidden', classNames)}
        style={
          {
            '--user-fill': `var(--color-${userHue}-fill)`,
          } as CSSProperties
        }
      >
        <MarkdownStream
          registry={componentRegistry}
          options={options}
          debug={debug}
          onEvent={handleEvent}
          ref={handleMarkdownStreamRef}
        />
      </div>
    );
  },
);
