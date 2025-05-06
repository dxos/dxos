//
// Copyright 2025 DXOS.org
//

import { useSignal } from '@preact/signals-react';
import React, { useMemo, useCallback } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
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
import { type MailboxType, InboxAction } from '../../types';

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

  const hasEmail = useMemo(() => !!message.sender.email, [message.sender.email]);

  const contacts = useQuery(space, Filter.schema(Contact));
  const existingContact = useMemo(() => {
    if (!hasEmail) {
      return undefined;
    }
    return contacts.find((contact) => contact.emails?.find((email) => email.value === message.sender.email));
  }, [contacts, message.sender.email, hasEmail]);

  const { dispatchPromise: dispatch } = useIntentDispatcher();

  // TODO(Zaymon): All deps need to be signals.
  const menu = useMessageToolbarActions(viewMode, !!existingContact, hasEmail);

  const handleToolbarAction = useCallback<MenuActionHandler<MessageToolbarAction>>(
    (action: MessageToolbarAction) => {
      switch (action.properties.type) {
        case 'viewMode': {
          viewMode.value = viewMode.value === 'plain' ? 'enriched' : 'plain';
          break;
        }
        case 'extractContact': {
          if (!space) {
            return;
          }
          void dispatch(createIntent(InboxAction.ExtractContact, { space, message }));
          break;
        }
      }
    },
    [viewMode, message, space, dispatch],
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
