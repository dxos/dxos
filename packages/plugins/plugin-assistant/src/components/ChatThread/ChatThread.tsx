//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { type Identity } from '@dxos/react-client/halo';
import { type ThemedClassName, setRef } from '@dxos/react-ui';
import { MarkdownStream, type MarkdownStreamController, type MarkdownStreamProps } from '@dxos/react-ui-markdown';
import { type Message } from '@dxos/types';
import { keyToFallback } from '@dxos/util';

import { type ChatViewType } from '../../types';
import { type ChatEvent } from '../Chat';
import { componentRegistry, createBlockRenderer } from './registry';
import { MessageSyncer } from './sync';

const defaultOptions: MarkdownStreamProps['options'] = {
  autoScroll: true,
  cursor: false,
  fader: true,
  typewriter: true,
};

export type ChatThreadProps = ThemedClassName<
  {
    identity?: Identity;
    messages?: Message.Message[];
    error?: Error;
    viewType?: ChatViewType;
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
      viewType = 'normal',
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
    const renderer = useMemo(() => createBlockRenderer(viewType), [viewType]);
    const syncer = useMemo(() => controller && new MessageSyncer(controller, renderer), [controller, renderer]);
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
      <div role='none' data-hue={userHue} className='contents'>
        <MarkdownStream
          classNames={classNames}
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
