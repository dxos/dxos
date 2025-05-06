//
// Copyright 2025 DXOS.org
//

import { useSignal } from '@preact/signals-react';
import React, { useMemo, useCallback } from 'react';

import { fullyQualifiedId, type Space, Filter, useQuery } from '@dxos/react-client/echo';
import { ElevationProvider } from '@dxos/react-ui';
import { stackItemContentToolbarClassNames } from '@dxos/react-ui-editor';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';
import { type MenuActionHandler } from '@dxos/react-ui-menu';
import { StackItem } from '@dxos/react-ui-stack';
import { type MessageType, Contact } from '@dxos/schema';

import { Message } from './Message';
import { type ViewMode } from './MessageHeader';
import { useMessageToolbarActions, type MessageToolbarAction } from './toolbar';
import { type MailboxType } from '../../types';

export type MessageContainerProps = {
  space?: Space;
  message: MessageType;
  inMailbox: MailboxType;
};

export const MessageContainer = ({ space, message, inMailbox }: MessageContainerProps) => {
  const hasEnrichedContent = useMemo(() => {
    const textBlocks = message.blocks.filter((block) => 'text' in block);
    return textBlocks.length > 1 && !!textBlocks[1]?.text;
  }, [message]);

  const initialViewMode = useMemo<ViewMode>(() => {
    return hasEnrichedContent ? 'enriched' : 'plain-only';
  }, [hasEnrichedContent]);

  const viewMode = useSignal<ViewMode>(initialViewMode);

  // Check if message has sender email
  const hasEmail = !!message.sender.email;

  // Get contacts from space
  const contacts = useQuery(space, Filter.schema(Contact));

  // Check if there's an existing contact with the sender's email
  const existingContact = useMemo(() => {
    if (!hasEmail) {
      return undefined;
    }
    return contacts.find((contact) => contact.emails?.find((email) => email.value === message.sender.email));
  }, [contacts, message.sender.email, hasEmail]);

  // Pass existingContact and hasEmail to useMessageToolbarActions
  const menu = useMessageToolbarActions(viewMode, !!existingContact, hasEmail);

  const handleToolbarAction = useCallback<MenuActionHandler<MessageToolbarAction>>(
    (action: MessageToolbarAction) => {
      switch (action.properties.type) {
        case 'viewMode': {
          viewMode.value = viewMode.value === 'plain' ? 'enriched' : 'plain';
          break;
        }
        case 'extractContact': {
          // TODO: Implement contact extraction logic
          console.log('Extract contact from message:', message.sender);
          break;
        }
      }
    },
    [viewMode, message],
  );

  return (
    <StackItem.Content classNames='relative'>
      <div role='none' className='grid grid-rows-[min-content_1fr]'>
        <div role='none' className={stackItemContentToolbarClassNames('section')}>
          <ElevationProvider elevation='positioned'>
            <MenuProvider {...menu} attendableId={fullyQualifiedId(inMailbox)} onAction={handleToolbarAction}>
              <ToolbarMenu />
            </MenuProvider>
          </ElevationProvider>
        </div>
        <Message space={space} message={message} viewMode={viewMode.value} hasEnrichedContent={hasEnrichedContent} />
      </div>
    </StackItem.Content>
  );
};
