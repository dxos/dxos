//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { type Identity } from '@dxos/react-client/halo';
import { type ThemedClassName, setRef } from '@dxos/react-ui';
import { MarkdownStream, type MarkdownStreamController, type MarkdownStreamProps } from '@dxos/react-ui-markdown';
import { type Message } from '@dxos/types';
import { mx } from '@dxos/ui-theme';
import { keyToFallback } from '@dxos/util';

import { type ChatEvent } from '../Chat';
import { blockToMarkdown, componentRegistry } from './registry';
import { MessageSyncer } from './sync';

const defaultOptions: MarkdownStreamProps['options'] = {
  autoScroll: true,
  typewriter: true,
  cursor: false,
};

export type ChatThreadProps = ThemedClassName<
  {
    identity?: Identity;
    messages?: Message.Message[];
    error?: Error;
    onEvent?: (event: ChatEvent) => void;
  } & Pick<MarkdownStreamProps, 'options' | 'debug' | 'extensions' | 'footer'>
>;

export const ChatThread = forwardRef<MarkdownStreamController | null, ChatThreadProps>(
  (
    {
      classNames,
      identity,
      messages = [],
      error,
      options = defaultOptions,
      footer,
      debug = false,
      extensions,
      onEvent,
    },
    forwardedRef,
  ) => {
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
      if (!syncer) {
        return;
      }

      if (syncer.update(messages)) {
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
        data-hue={userHue}
        className={mx('flex h-full w-full justify-center overflow-hidden', classNames)}
      >
        <MarkdownStream
          registry={componentRegistry}
          options={options}
          debug={debug}
          extensions={extensions}
          footer={footer}
          onEvent={handleEvent}
          ref={handleMarkdownStreamRef}
        />
      </div>
    );
  },
);
