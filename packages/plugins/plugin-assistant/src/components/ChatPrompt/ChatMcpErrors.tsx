//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback } from 'react';

import { Banner, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';

import { meta } from '#meta';

import { type AiChatProcessor } from '../../processor/index.ts';

export type ChatMcpErrorsProps = ThemedClassName<{
  processor: AiChatProcessor;
}>;

/**
 * Inline banner that lists MCP servers that failed to connect during the most recent request.
 * The chat itself keeps working without these servers — this just lets the user see what was dropped.
 */
export const ChatMcpErrors = ({ classNames, processor }: ChatMcpErrorsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const errors = useAtomValue(processor.mcpErrors);

  const handleDismiss = useCallback(() => {
    processor.dismissMcpErrors();
  }, [processor]);

  if (errors.length === 0) {
    return null;
  }

  return (
    <Banner.Root valence='warning'>
      <Banner.Content classNames={['m-1', classNames]}>
        <Banner.Title onClose={handleDismiss}>{t('mcp-server-error.label')}</Banner.Title>
        <Banner.Body>
          <Listbox.Root>
            <Listbox.Content aria-label={t('mcp-server-error.label')} classNames='gap-0.5 text-sm'>
              {errors.map((error) => (
                <Listbox.Item key={`${error.url}::${error.protocol}`} id={`${error.url}::${error.protocol}`}>
                  {/* `min-w-0`: the item is a flex child, so without it `truncate` never shrinks below
                      the content's intrinsic width. */}
                  <span className='truncate min-w-0'>
                    <span className='font-mono'>{error.url}</span>
                    {' — '}
                    <span>{error.unauthorized ? t('mcp-server-error.unauthorized') : error.message}</span>
                  </span>
                </Listbox.Item>
              ))}
            </Listbox.Content>
          </Listbox.Root>
        </Banner.Body>
      </Banner.Content>
    </Banner.Root>
  );
};
