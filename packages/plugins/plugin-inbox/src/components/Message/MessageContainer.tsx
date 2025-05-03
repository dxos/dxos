//
// Copyright 2025 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { ElevationProvider, useThemeContext, type ThemedClassName } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  preview,
  useTextEditor,
  stackItemContentToolbarClassNames,
} from '@dxos/react-ui-editor';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';
import { StackItem } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';
import { type MessageType } from '@dxos/schema';

import { MessageHeader } from './MessageHeader';
import { useMessageToolbarActions, useMessageToolbarAction } from './toolbar';

export type MessageProps = ThemedClassName<{
  space?: Space;
  message: MessageType;
  plainView: boolean;
}>;

const Message = ({ space, message, plainView, classNames }: MessageProps) => {
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
        preview(),
      ];
    }
    return [];
  }, [space, client]);

  const { parentRef } = useTextEditor({ initialValue: content, extensions }, [content, extensions]);

  return (
    <div role='none' className='grid grid-rows-[min-content_min-content_1fr]'>
      <MessageHeader message={message} />
      <div role='none' className='overflow-y-auto bs-full min-bs-0 p-2'>
        <div ref={parentRef} className={mx(classNames)} />
      </div>
    </div>
  );
};

export type MessageContainerProps = {
  space?: Space;
  message: MessageType;
};

export const MessageContainer = ({ space, message }: MessageContainerProps) => {
  const [plainView, setPlainView] = useState(false);
  const menu = useMessageToolbarActions(plainView);
  const handleToolbarAction = useMessageToolbarAction({
    plainView,
    setPlainView,
  });

  return (
    <StackItem.Content classNames='relative'>
      <div role='none' className='grid grid-rows-[min-content_1fr]'>
        <div role='none' className={stackItemContentToolbarClassNames('section')}>
          <ElevationProvider elevation='positioned'>
            <MenuProvider {...menu} onAction={handleToolbarAction}>
              <ToolbarMenu />
            </MenuProvider>
          </ElevationProvider>
        </div>
        <Message space={space} message={message} plainView={plainView} />
      </div>
    </StackItem.Content>
  );
};
