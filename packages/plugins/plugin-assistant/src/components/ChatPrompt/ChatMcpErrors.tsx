//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback } from 'react';

import { Message, type ThemedClassName, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import { type AiChatProcessor } from '../../processor';

export type ChatMcpErrorsProps = ThemedClassName<{
  processor: AiChatProcessor;
}>;

/**
 * Inline banner that lists MCP servers that failed to connect during the most recent request.
 * The chat itself keeps working without these servers — this just lets the user see what was dropped.
 */
export const ChatMcpErrors = ({ classNames, processor }: ChatMcpErrorsProps) => {
  const { t } = useTranslation(meta.id);
  const errors = useAtomValue(processor.mcpErrors);

  const handleDismiss = useCallback(() => {
    processor.dismissMcpErrors();
  }, [processor]);

  if (errors.length === 0) {
    return null;
  }

  return (
    <Message.Root classNames={['m-1', classNames]} valence='warning'>
      <Message.Title onClose={handleDismiss}>{t('mcp-server-error.label')}</Message.Title>
      <Message.Content asChild>
        <ul className='flex flex-col gap-0.5 text-sm'>
          {errors.map((error) => (
            <li key={`${error.url}::${error.kind}`} className='truncate'>
              <span className='font-mono'>{error.url}</span>
              {' — '}
              <span>{error.message}</span>
            </li>
          ))}
        </ul>
      </Message.Content>
    </Message.Root>
  );
};
