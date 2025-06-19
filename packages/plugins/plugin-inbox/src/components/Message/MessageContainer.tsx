//
// Copyright 2025 DXOS.org
//

import { useComputed, useSignal } from '@preact/signals-react';
import React, { useMemo, useCallback, useEffect } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { Key } from '@dxos/echo';
import { fullyQualifiedId, type Space, Filter, useQuery } from '@dxos/react-client/echo';
import { ElevationProvider, useTranslation } from '@dxos/react-ui';
import { stackItemContentToolbarClassNames } from '@dxos/react-ui-editor';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';
import { StackItem } from '@dxos/react-ui-stack';
import { DataType } from '@dxos/schema';

import { Message } from './Message';
import { type ViewMode } from './MessageHeader';
import { useMessageToolbarActions } from './toolbar';
import { INBOX_PLUGIN } from '../../meta';
import { type MailboxType, InboxAction } from '../../types';

export type MessageContainerProps = {
  space?: Space;
  message?: DataType.Message;
  inMailbox: MailboxType;
};

export const MessageContainer = ({ space, message, inMailbox }: MessageContainerProps) => {
  const { t } = useTranslation(INBOX_PLUGIN);

  const hasEnrichedContent = useMemo(() => {
    const textBlocks = message?.blocks.filter((block) => 'text' in block) ?? [];
    return textBlocks.length > 1 && !!textBlocks[1]?.text;
  }, [message]);

  const initialViewMode = useMemo<ViewMode>(() => {
    return hasEnrichedContent ? 'enriched' : 'plain-only';
  }, [hasEnrichedContent]);

  const viewMode = useSignal<ViewMode>(initialViewMode);

  const hasEmail = useComputed(() => !!message?.sender.email);
  const contacts = useQuery(space, Filter.type(DataType.Person));
  const existingContact = useSignal<DataType.Person | undefined>(undefined);
  const contactDxn = useComputed(() =>
    existingContact.value ? Key.getObjectDXN(existingContact.value)?.toString() : undefined,
  );

  useEffect(() => {
    existingContact.value = contacts.find((contact) =>
      contact.emails?.find((email) => email.value === message?.sender.email),
    );
  }, [contacts, message?.sender.email, hasEmail, existingContact]);

  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const handleExtractContact = useCallback(() => {
    if (!space || !message) {
      return;
    }
    void dispatch(createIntent(InboxAction.ExtractContact, { space, message }));
  }, [space, message, dispatch]);

  const menu = useMessageToolbarActions(viewMode, existingContact, handleExtractContact);

  if (!message) {
    return <p className='p-8 text-center text-description'>{t('no message message')}</p>;
  }

  return (
    <StackItem.Content classNames='relative'>
      <div role='none' className='grid grid-rows-[min-content_1fr]'>
        <div role='none' className={stackItemContentToolbarClassNames('section')}>
          <ElevationProvider elevation='positioned'>
            <MenuProvider {...menu} attendableId={fullyQualifiedId(inMailbox)}>
              <ToolbarMenu />
            </MenuProvider>
          </ElevationProvider>
        </div>
        <Message
          space={space}
          message={message}
          viewMode={viewMode.value}
          hasEnrichedContent={hasEnrichedContent}
          contactDxn={contactDxn.value}
        />
      </div>
    </StackItem.Content>
  );
};
