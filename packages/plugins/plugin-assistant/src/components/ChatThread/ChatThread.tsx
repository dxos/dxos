//
// Copyright 2025 DXOS.org
//

import React, { type CSSProperties, forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { type Identity } from '@dxos/react-client/halo';
import { type ThemedClassName } from '@dxos/react-ui';
import { MarkdownStream, type MarkdownStreamController, type MarkdownStreamProps } from '@dxos/react-ui-components';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';
import { keyToFallback } from '@dxos/util';

import { type ChatMessageProps } from './ChatMessage';
import { componentRegistry } from './registry';
import { MessageSyncer } from './sync';

export type ChatThreadController = Pick<MarkdownStreamController, 'scrollToBottom'>;

export type ChatThreadProps = ThemedClassName<
  {
    identity?: Identity;
    messages?: DataType.Message[];
    error?: Error;
  } & Pick<ChatMessageProps, 'debug' | 'toolProvider'> &
    Pick<MarkdownStreamProps, 'characterDelay' | 'cursor' | 'fadeIn'>
>;

export const ChatThread = forwardRef<ChatThreadController | null, ChatThreadProps>(
  (
    { classNames, identity, messages = [], error, debug, characterDelay = 5, cursor = true, fadeIn = true },
    forwardedRef,
  ) => {
    const userHue = useMemo(() => {
      return identity?.profile?.data?.hue || keyToFallback(identity?.identityKey ?? PublicKey.random()).hue;
    }, [identity]);

    const [controller, setController] = useState<MarkdownStreamController | null>(null);
    useImperativeHandle(forwardedRef, () => (controller ? controller : (null as any)), [controller]);

    // Show error.
    useEffect(() => {
      controller?.scrollToBottom();
    }, [controller, error]);

    // Update document.
    const syncer = useMemo(() => controller && new MessageSyncer(controller), [controller]);
    useEffect(() => {
      syncer?.sync(messages);
    }, [syncer, messages]);

    return (
      <div
        className={mx('flex bs-full justify-center overflow-hidden', classNames)}
        style={{ '--user-fill': `var(--dx-${userHue}Fill)` } as CSSProperties}
      >
        <MarkdownStream
          ref={setController}
          classNames='bs-full max-is-prose overflow-hidden'
          registry={componentRegistry}
          characterDelay={characterDelay}
          cursor={cursor}
          fadeIn={fadeIn}
        />
      </div>
    );
  },
);
