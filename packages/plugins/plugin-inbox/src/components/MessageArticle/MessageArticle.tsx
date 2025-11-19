//
// Copyright 2025 DXOS.org
//

import { useComputed, useSignal } from '@preact/signals-react';
import React, { useCallback, useEffect, useMemo } from 'react';

import { createIntent } from '@dxos/app-framework';
import { type SurfaceComponentProps, useIntentDispatcher } from '@dxos/app-framework/react';
import { getSpace } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { ElevationProvider, useTranslation } from '@dxos/react-ui';
import { MenuProvider, ToolbarMenu } from '@dxos/react-ui-menu';
import { StackItem } from '@dxos/react-ui-stack';
import { type Message as MessageType, Person } from '@dxos/types';

import { meta } from '../../meta';
import { InboxAction, type Mailbox } from '../../types';

import { Message } from './Message';
import { type ViewMode } from './MessageHeader';
import { useMessageToolbarActions } from './MessageToolbar';

export const MessageArticle = ({
  subject: message,
  mailbox,
}: SurfaceComponentProps<MessageType.Message, { mailbox: Mailbox.Mailbox }>) => {
  const { t } = useTranslation(meta.id);
  const space = getSpace(mailbox);

  const hasEnrichedContent = useMemo(() => {
    const textBlocks = message?.blocks.filter((block) => 'text' in block) ?? [];
    return textBlocks.length > 1 && !!textBlocks[1]?.text;
  }, [message]);

  const initialViewMode = useMemo<ViewMode>(() => {
    return hasEnrichedContent ? 'enriched' : 'plain-only';
  }, [hasEnrichedContent]);

  const viewMode = useSignal<ViewMode>(initialViewMode);
  const hasEmail = useComputed(() => !!message?.sender.email);
  // Don't bother querying the space if there is already a reference to the contact.
  const isLinked = !!message?.sender.contact;
  const contacts = useQuery(isLinked ? undefined : space, Filter.type(Person.Person));
  const existingContact = useSignal<Person.Person | undefined>(undefined);
  const contactDxn = useComputed(() =>
    message?.sender.contact
      ? message.sender.contact.dxn.toString()
      : existingContact.value
        ? Obj.getDXN(existingContact.value)?.toString()
        : undefined,
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
    <StackItem.Content classNames='relative' toolbar>
      <ElevationProvider elevation='positioned'>
        <MenuProvider {...menu} attendableId={Obj.getDXN(mailbox).toString()}>
          <ToolbarMenu />
        </MenuProvider>
      </ElevationProvider>
      <Message
        space={space}
        message={message}
        viewMode={viewMode.value}
        hasEnrichedContent={hasEnrichedContent}
        contactDxn={contactDxn.value}
      />
    </StackItem.Content>
  );
};
