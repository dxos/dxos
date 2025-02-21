//
// Copyright 2025 DXOS.org
//

import React, { type KeyboardEventHandler, useCallback, useMemo, useRef, useState } from 'react';

import { type Message } from '@dxos/artifact';
import { IconButton, Input, useTranslation } from '@dxos/react-ui';
import { Spinner } from '@dxos/react-ui-sfx';
import { mx } from '@dxos/react-ui-theme';

import { ThreadMessage, type ThreadMessageProps } from './ThreadMessage';
import { AUTOMATION_PLUGIN } from '../../meta';
import { ScrollContainer, type ScrollController } from '../ScrollContainer';

export type ThreadProps = {
  messages?: Message[];
  streaming?: boolean;
  onSubmit?: (message: string) => void;
  onStop?: () => void;
} & Pick<ThreadMessageProps, 'collapse' | 'debug' | 'onSuggest' | 'onDelete'>;

// TODO(burdon): Factor out scroll logic.
export const Thread = ({
  messages,
  streaming,
  collapse,
  debug,
  onSubmit,
  onStop,
  onSuggest,
  onDelete,
}: ThreadProps) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  const scroller = useRef<ScrollController>(null);

  const [text, setText] = useState('');
  const handleKeyDown = useCallback<KeyboardEventHandler<HTMLInputElement>>(
    (ev) => {
      switch (ev.key) {
        case 'Escape': {
          setText('');
          break;
        }

        case 'Enter': {
          const value = text.trim();
          if (value.length > 0) {
            scroller.current?.scrollToBottom();
            onSubmit?.(value);
            setText('');
          }
          break;
        }
      }
    },
    [text],
  );

  /**
   * Reduce message blocks into collections of messages that contain related contiguous blocks.
   * For example, collapse all tool request/response pairs into a single message.
   */
  // TODO(dmaretskyi): This needs to be a separate type: `id` is not a valid ObjectId, this needs to accommodate messageId for deletion.
  const { messages: lines = [] } = useMemo(() => {
    if (!collapse) {
      return { messages: messages ?? [] };
    }

    return (messages ?? []).reduce<{ messages: Message[]; current?: Message }>(
      ({ current, messages }, message) => {
        let i = 0;
        for (const block of message.content) {
          switch (block.type) {
            case 'tool_use':
            case 'tool_result': {
              if (current) {
                current.content.push(block);
              } else {
                current = {
                  id: [message.id, i].join('_'),
                  role: message.role,
                  content: [block],
                };
                messages.push(current);
              }
              break;
            }

            case 'text':
            default: {
              current = undefined;
              messages.push({
                id: [message.id, i].join('_'),
                role: message.role,
                content: [block],
              });
              break;
            }
          }

          i++;
        }

        return { current, messages };
      },
      { messages: [] as Message[] },
    );
  }, [messages, collapse]);

  return (
    <div className='flex flex-col grow overflow-hidden'>
      <ScrollContainer ref={scroller} classNames='py-2 gap-2 overflow-x-hidden'>
        {lines.map((message) => (
          <ThreadMessage
            key={message.id}
            classNames='px-4'
            message={message}
            collapse={collapse}
            debug={debug}
            onSuggest={onSuggest}
            onDelete={onDelete}
          />
        ))}
      </ScrollContainer>

      {onSubmit && (
        <div className='flex p-4 gap-3 items-center'>
          <Spinner active={streaming} />
          <Input.Root>
            <Input.TextInput
              autoFocus
              classNames='px-2 baseSurface rounded'
              placeholder={t('chat input placeholder')}
              value={text}
              onChange={(ev) => setText(ev.target.value)}
              onKeyDown={handleKeyDown}
            />
          </Input.Root>
          {onStop && (
            <IconButton
              disabled={!streaming}
              classNames={mx('!p-1 !opacity-20 transition', streaming && '!opacity-80')}
              variant='ghost'
              size={5}
              onClick={onStop}
              icon='ph--x--regular'
              label={t('chat stop')}
              iconOnly
            />
          )}
        </div>
      )}
    </div>
  );
};
