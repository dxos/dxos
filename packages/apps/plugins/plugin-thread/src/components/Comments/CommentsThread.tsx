//
// Copyright 2023 DXOS.org
//

import React, { type ForwardedRef, forwardRef } from 'react';

import { type Thread as ThreadType } from '@braneframe/types';
import type { PublicKey } from '@dxos/keys';
import { useTranslation } from '@dxos/react-ui';
import { fixedBorder, attentionSurface, mx } from '@dxos/react-ui-theme';

import { THREAD_PLUGIN } from '../../meta';
import { Message } from '../MessageCard';
import { MessageInput, type MessageInputProps } from '../MessageInput';
import { type MessagePropertiesProvider } from '../util';

export type CommentsThreadProps = {
  thread: ThreadType;
  processing?: boolean;
  identityKey: PublicKey;
  propertiesProvider: MessagePropertiesProvider;
  active?: boolean;
  autoFocus?: boolean;
  onFocus?: () => void;
  onCreate?: MessageInputProps['onMessage'];
  onDelete?: (messageId: string, idx: number) => void;
};

export const CommentsThread = forwardRef(
  (
    {
      thread,
      processing,
      identityKey,
      propertiesProvider,
      active,
      autoFocus,
      onFocus,
      onCreate,
      onDelete,
    }: CommentsThreadProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) => {
    const { t } = useTranslation(THREAD_PLUGIN);

    return (
      <div
        className={mx(
          'flex flex-col rounded shadow divide-y',
          attentionSurface,
          fixedBorder,
          onCreate ? '' : 'opacity-60',
        )}
        onClick={() => {
          onFocus?.();
        }}
      >
        {/* TODO(burdon): Don't show avatar/display name if same as previous. */}
        {thread.messages.map((message) => (
          <Message key={message.id} message={message} propertiesProvider={propertiesProvider} onDelete={onDelete} />
        ))}

        {/* TODO(burdon): Resolve button. */}
        {onCreate && (
          // NOTE: Should always render so that the input doesn't lose state.
          <div ref={ref} role='none' className={mx(!active && 'hidden')}>
            <MessageInput
              className='pl-1 py-2'
              autoFocus={autoFocus}
              placeholder={t('comment placeholder')}
              processing={processing}
              onFocus={onFocus}
              onMessage={onCreate}
            />
          </div>
        )}
      </div>
    );
  },
);
