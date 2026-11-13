//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as Status from '@dxos/react-ui/Status';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Tooltip from '@dxos/react-ui/Tooltip';
import * as Typography from '@dxos/react-ui/Typography';

import { type Contact, CONTACTS } from '../contacts.ts';
import { ContactList } from '../layout/ContactsScreen.tsx';
import { DeletePopover, EditDialog } from '../overlays/ContactsScreen.tsx';
import { ns } from './translations.ts';

// #region detail
/** Each field beside an icon that says what it is. */
const ContactDetail = ({ contact }: { contact?: Contact }) => {
  const { t } = Hooks.useTranslation(ns);
  if (!contact) {
    return <Status.Empty icon='ph--address-book--regular'>{t('empty.message')}</Status.Empty>;
  }

  return (
    <Layout.Flex column gap='sm' classNames='p-4'>
      <Typography.Text asChild>
        <h2>{contact.name}</h2>
      </Typography.Text>
      <Layout.Flex gap='sm' align='center'>
        <Icon.Icon icon='ph--envelope--regular' />
        <Typography.Text tone='muted'>{contact.email}</Typography.Text>
      </Layout.Flex>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {/* Focusable, so a keyboard user can open the tooltip too. */}
          <div tabIndex={0}>
            <Layout.Flex gap='sm' align='center'>
              <Icon.Icon icon='ph--identification-badge--regular' />
              <Typography.Text tone='muted'>{contact.role}</Typography.Text>
            </Layout.Flex>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content>{t(`role.${contact.role}`)}</Tooltip.Content>
      </Tooltip.Root>
    </Layout.Flex>
  );
};
// #endregion

// #region screen
export const ContactsScreen = () => {
  const { t } = Hooks.useTranslation(ns);
  const [contacts, setContacts] = useState(CONTACTS);
  const [selected, setSelected] = useState<string | undefined>(contacts[0].id);
  const contact = contacts.find(({ id }) => id === selected);

  const handleAdd = () => {
    const contact: Contact = {
      id: crypto.randomUUID(),
      name: t('new-contact.name'),
      email: '',
      role: 'viewer',
    };
    setContacts((contacts) => [...contacts, contact]);
    setSelected(contact.id);
  };

  const handleSave = (next: Contact) =>
    setContacts((contacts) => contacts.map((contact) => (contact.id === next.id ? next : contact)));

  const handleDelete = (id: string) => {
    setContacts((contacts) => contacts.filter((contact) => contact.id !== id));
    setSelected(undefined);
  };

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>{t('title.label')}</Toolbar.Text>
          <Toolbar.Text>{t('count.label', { count: contacts.length })}</Toolbar.Text>
          <Toolbar.Separator variant='gap' />
          <Button.Root icon='ph--plus--regular' label={t('add.label')} iconOnly onClick={handleAdd} />
          {contact && <EditDialog label={t('edit.label')} contact={contact} onSave={handleSave} />}
          {contact && <DeletePopover label={t('delete.label')} onDelete={() => handleDelete(contact.id)} />}
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <Layout.Grid cols={['16rem', 'fill']} grow>
          <ContactList contacts={contacts} selected={selected} onSelect={setSelected} />
          <ContactDetail contact={contact} />
        </Layout.Grid>
      </Panel.Body>
    </Panel.Root>
  );
};
// #endregion
