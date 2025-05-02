//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { DXN } from '@dxos/keys';
import { resolveRef, useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { useThemeContext, type ThemedClassName } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  preview,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { StackItem } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';
import { type MessageType } from '@dxos/schema';

export type MessageProps = ThemedClassName<{
  space?: Space;
  message: MessageType;
}>;

const Message = ({ space, message, classNames }: MessageProps) => {
  const client = useClient();
  const { themeMode } = useThemeContext();

  const content = useMemo(() => {
    return message.blocks
      .filter((block) => 'text' in block)
      .map((block) => block.text)
      .join('\n');
  }, [message.blocks]);

  // TODO(ZaymonFC): How to prevent caret and selection?
  const extensions = useMemo(() => {
    if (space) {
      return [
        createBasicExtensions({ readOnly: true, lineWrapping: true }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode }),
        decorateMarkdown(),
        preview({
          onLookup: async ({ label, ref }) => {
            console.info('onLookup', { label, ref });
            const dxn = DXN.parse(ref);
            if (!dxn) {
              return null;
            }

            const object = await resolveRef(client, dxn, space);
            return { label, object };
          },
        }),
      ];
    }
    return [];
  }, [space, client]);

  const { parentRef } = useTextEditor({ initialValue: content, extensions }, [content, extensions]);

  return <div ref={parentRef} className={mx('overflow-hidden', classNames)} />;
};

export type MessageContainerProps = {
  space?: Space;
  message: MessageType;
};

export const MessageContainer = ({ space, message }: MessageContainerProps) => {
  return (
    <StackItem.Content classNames='p-2 overflow-y-auto'>
      <Message space={space} message={message} />
    </StackItem.Content>
  );
};
