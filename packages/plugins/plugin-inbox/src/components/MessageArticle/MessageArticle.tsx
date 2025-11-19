//
// Copyright 2025 DXOS.org
//

import { type Signal, useComputed, useSignal } from '@preact/signals-react';
import React, { useCallback, useEffect, useMemo } from 'react';

import { createIntent } from '@dxos/app-framework';
import { type SurfaceComponentProps, useIntentDispatcher } from '@dxos/app-framework/react';
import { type Space, getSpace } from '@dxos/client/echo';
import { type DXN, Obj } from '@dxos/echo';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { ElevationProvider, useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';
import { type Message as MessageType, Person } from '@dxos/types';

import { meta } from '../../meta';
import { InboxAction, type Mailbox } from '../../types';

import { Message, type ViewMode } from './Message';

export const MessageArticle = ({
  subject: message,
  mailbox, // TODO(burdon): companionTo?
}: SurfaceComponentProps<MessageType.Message, { mailbox: Mailbox.Mailbox }>) => {
  const { t } = useTranslation(meta.id);

  const viewMode = useMemo<ViewMode>(() => {
    const textBlocks = message?.blocks.filter((block) => 'text' in block) ?? [];
    return textBlocks.length > 1 && !!textBlocks[1]?.text ? 'enriched' : 'plain-only';
  }, [message]);

  const space = getSpace(mailbox);
  const sender = useSenderContact(space, message);

  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const handleContactCreate = useCallback(() => {
    if (space && message) {
      // TODO(burdon): Specify sender email.
      void dispatch(createIntent(InboxAction.ExtractContact, { space, message }));
    }
  }, [space, message, dispatch]);

  if (!message) {
    return <p className='p-8 text-center text-description'>{t('no message message')}</p>;
  }

  return (
    <StackItem.Content classNames='relative' toolbar>
      <Message.Root attendableId={Obj.getDXN(mailbox).toString()} viewMode={viewMode} message={message} sender={sender}>
        {/* TODO(burdon): Why? */}
        <ElevationProvider elevation='positioned'>
          <Message.Toolbar onContactCreate={handleContactCreate} />
        </ElevationProvider>
        <Message.Viewport>
          <Message.Header />
          <Message.Content />
        </Message.Viewport>
      </Message.Root>
    </StackItem.Content>
  );
};

// TODO(burdon): Factor out lazy update pattern.
const useSenderContact = (space?: Space, message?: MessageType.Message): Signal<DXN | undefined> => {
  // Don't bother querying the space if there is already a reference to the contact.
  const isLinked = !!message?.sender.contact;
  const contacts = useQuery(isLinked ? undefined : space, Filter.type(Person.Person));
  // TODO(burdon): Remove hasEmail check?
  const hasEmail = useComputed(() => !!message?.sender.email);
  const existingContact = useSignal<Person.Person | undefined>(undefined);
  useEffect(() => {
    existingContact.value = contacts.find((contact) =>
      contact.emails?.find((email) => email.value === message?.sender.email),
    );
  }, [contacts, message?.sender.email, hasEmail, existingContact]);

  return useComputed(() =>
    message?.sender.contact
      ? message.sender.contact.dxn
      : existingContact.value
        ? Obj.getDXN(existingContact.value)
        : undefined,
  );
};
