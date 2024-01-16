//
// Copyright 2023 DXOS.org
//

import React, { type FC, useEffect, useRef } from 'react';

import { type Thread as ThreadType } from '@braneframe/types';
import type { PublicKey } from '@dxos/keys';
import { type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { fixedBorder, inputSurface, mx } from '@dxos/react-ui-theme';

import { ChatInput, type ChatInputProps } from './ChatInput';
import { type BlockProperties, MessageCard } from './MessageCard';
import { useStatus } from '../../hooks';
import { THREAD_PLUGIN } from '../../meta';

// TODO(burdon): Replace with ThreadChannel.
export const CommentThread: FC<{
  space: Space;
  thread: ThreadType;
  identityKey: PublicKey;
  propertiesProvider: (identityKey: PublicKey | undefined) => BlockProperties;
  onFocus?: () => void;
  onCreate?: ChatInputProps['onMessage'];
  onDelete?: (messageId: string, idx: number) => void;
}> = ({ space, thread, identityKey, propertiesProvider, onFocus, onCreate, onDelete }) => {
  const { t } = useTranslation(THREAD_PLUGIN);
  const processing = useStatus(space, thread.id);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // TODO(burdon): Check not already scrolling.
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [ref, onCreate]);

  return (
    <div
      // TODO(burdon): Use border rather than opacity.
      className={mx('flex flex-col rounded shadow divide-y', inputSurface, fixedBorder, onCreate ? '' : 'opacity-60')}
      onClick={() => onFocus?.()}
    >
      {/* TODO(burdon): Don't show avatar/display name if same as previous. */}
      {thread.messages.map((message) => (
        <MessageCard
          key={message.id}
          className='p-1'
          message={message}
          propertiesProvider={propertiesProvider}
          onDelete={onDelete}
        />
      ))}

      {onCreate && (
        <ChatInput
          ref={ref}
          className='pl-1 py-2'
          placeholder={t('comment placeholder')}
          processing={processing}
          onFocus={onFocus}
          onMessage={onCreate}
        />
      )}
    </div>
  );
};
