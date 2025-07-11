//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type ReferencesOptions } from '@dxos/react-ui-chat';

import { useChatContext } from './ChatRoot';
import { useContextProvider } from '../../hooks';
import { ChatPrompt as NativeChatPrompt, type ChatPromptProps } from '../ChatPrompt';

export const ChatPrompt = (props: Pick<ChatPromptProps, 'classNames' | 'placeholder'>) => {
  const { space, error, processing, handleOpenChange, handleSubmit, handleCancel } = useChatContext(
    ChatPrompt.displayName,
  );

  const contextProvider = useContextProvider(space);
  const references = useMemo<ReferencesOptions | undefined>(() => {
    if (!contextProvider) {
      return;
    }

    return {
      provider: {
        getReferences: async ({ query }) => contextProvider.query({ query }),
        resolveReference: async ({ uri }) => contextProvider.resolveMetadata({ uri }),
      },
    };
  }, [contextProvider]);

  return (
    <NativeChatPrompt
      {...props}
      error={error}
      processing={processing}
      references={references}
      onOpenChange={handleOpenChange}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  );
};

ChatPrompt.displayName = 'Chat.Prompt';
