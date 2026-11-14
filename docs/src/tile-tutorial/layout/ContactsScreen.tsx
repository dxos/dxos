//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import * as Layout from '@dxos/react-ui/Layout';
import * as Listbox from '@dxos/react-ui/Listbox';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Status from '@dxos/react-ui/Status';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Typography from '@dxos/react-ui/Typography';

import { type Contact, CONTACTS } from '../contacts.ts';

// #region list
type ContactListProps = {
  contacts: Contact[];
  selected?: string;
  onSelect: (id: string) => void;
};

/** One row per contact; the list scrolls inside its own viewport. */
export const ContactList = ({ contacts, selected, onSelect }: ContactListProps) => {
  const items = contacts.map((contact) => ({
    value: contact.id,
    label: contact.name,
    description: contact.email,
  }));
  return (
    <Listbox.Root items={items} value={selected ? [selected] : []} onValueChange={([id]) => id && onSelect(id)}>
      <Listbox.Viewport>
        <Listbox.Content aria-label='Contacts'>
          {items.map((item) => (
            <Listbox.Item key={item.value} item={item} />
          ))}
        </Listbox.Content>
      </Listbox.Viewport>
    </Listbox.Root>
  );
};
// #endregion

// #region detail
/** The selected contact's fields, or a hint when nothing is selected. */
export const ContactDetail = ({ contact }: { contact?: Contact }) =>
  contact ? (
    <ScrollArea.Root>
      <ScrollArea.Viewport asChild>
        <Layout.Flex column gap='sm' classNames='p-4'>
          <Typography.Text asChild>
            <h2>{contact.name}</h2>
          </Typography.Text>
          <Typography.Text tone='muted'>{contact.email}</Typography.Text>
          <Typography.Text tone='muted'>Role: {contact.role}</Typography.Text>
        </Layout.Flex>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  ) : (
    <Status.Empty icon='ph--address-book--regular'>Choose a contact</Status.Empty>
  );
// #endregion

// #region screen
export const ContactsScreen = () => {
  const [contacts] = useState(CONTACTS);
  const [selected, setSelected] = useState<string>(contacts[0].id);
  const contact = contacts.find(({ id }) => id === selected);

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
          <ContactDetail contact={contact} />
        </Layout.Grid>
      </Panel.Body>
    </Panel.Root>
  );
};
// #endregion
