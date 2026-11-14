//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { type Contact, CONTACTS } from '../contacts.ts';
import { ContactList } from '../layout/ContactsScreen.tsx';
import { ContactEditor } from './ContactEditor.tsx';

// #region screen
export const ContactsScreen = () => {
  const [contacts, setContacts] = useState(CONTACTS);
  const [selected, setSelected] = useState<string>(contacts[0].id);
  const contact = contacts.find(({ id }) => id === selected);

  const handleSave = (next: Contact) =>
    setContacts((contacts) => contacts.map((contact) => (contact.id === next.id ? next : contact)));

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Contacts</Toolbar.Text>
          <Toolbar.Separator variant='gap' />
          <Toolbar.Text>{contacts.length} contacts</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <Layout.Grid cols={['16rem', 'fill']} grow>
          <ContactList contacts={contacts} selected={selected} onSelect={setSelected} />
          <ScrollArea.Root>
            <ScrollArea.Viewport classNames='p-4'>
              {contact && <ContactEditor key={contact.id} contact={contact} onSave={handleSave} />}
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Layout.Grid>
      </Panel.Body>
    </Panel.Root>
  );
};
// #endregion
