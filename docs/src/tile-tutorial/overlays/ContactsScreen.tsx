//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as Popover from '@dxos/react-ui/Popover';
import * as Toast from '@dxos/react-ui/Toast';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Tooltip from '@dxos/react-ui/Tooltip';
import * as Typography from '@dxos/react-ui/Typography';

import { type Contact, CONTACTS } from '../contacts.ts';
import { ContactEditor } from '../inputs/ContactEditor.tsx';
import { ContactList } from '../layout/ContactsScreen.tsx';

// #region edit
type EditDialogProps = {
  label: string;
  contact: Contact;
  onSave: (contact: Contact) => void;
};

/** The editor from the last page, in a dialog that closes on Save. */
export const EditDialog = ({ label, contact, onSave }: EditDialogProps) => {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={({ open }) => setOpen(open)}>
      <Dialog.Trigger asChild>
        <Button.Root icon='ph--pencil-simple--regular' label={label} iconOnly />
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>{contact.name}</Dialog.Title>
          <Dialog.CloseTrigger />
        </Dialog.Header>
        <Dialog.Body>
          <ContactEditor
            contact={contact}
            onSave={(next) => {
              onSave(next);
              setOpen(false);
            }}
          />
        </Dialog.Body>
      </Dialog.Content>
    </Dialog.Root>
  );
};
// #endregion

// #region delete
/** Asks before it deletes, in a popover beside the button. */
type DeletePopoverProps = {
  label: string;
  onDelete: () => void;
};

export const DeletePopover = ({ label, onDelete }: DeletePopoverProps) => (
  <Popover.Root>
    <Popover.Trigger asChild>
      <Button.Root variant='destructive' icon='ph--trash--regular' label={label} iconOnly />
    </Popover.Trigger>
    <Popover.Content>
      <Popover.Header>
        <Popover.Title>Delete this contact?</Popover.Title>
      </Popover.Header>
      <Layout.Flex gap='sm' justify='end'>
        <Popover.CloseTrigger asChild>
          <Button.Root>Keep</Button.Root>
        </Popover.CloseTrigger>
        <Button.Root variant='destructive' onClick={onDelete}>
          Delete
        </Button.Root>
      </Layout.Flex>
    </Popover.Content>
  </Popover.Root>
);
// #endregion

// #region role
const ROLE_HELP: Record<string, string> = {
  viewer: 'Can read the contact book',
  editor: 'Can change contacts',
  admin: 'Can change contacts and who has access',
};

/** The role, with what it allows in a tooltip. */
export const Role = ({ role }: { role: string }) => (
  <Tooltip.Root>
    <Tooltip.Trigger asChild>
      {/* Focusable, so a keyboard user can open the tooltip too. */}
      <span tabIndex={0}>
        <Typography.Text tone='muted'>Role: {role}</Typography.Text>
      </span>
    </Tooltip.Trigger>
    <Tooltip.Content>{ROLE_HELP[role]}</Tooltip.Content>
  </Tooltip.Root>
);
// #endregion

// #region screen
export const ContactsScreen = () => {
  const [contacts, setContacts] = useState(CONTACTS);
  const [selected, setSelected] = useState<string | undefined>(contacts[0].id);
  const [saved, setSaved] = useState<string>();
  const contact = contacts.find(({ id }) => id === selected);

  const handleSave = (next: Contact) => {
    setContacts((contacts) => contacts.map((contact) => (contact.id === next.id ? next : contact)));
    setSaved(next.name);
  };

  const handleDelete = (id: string) => {
    setContacts((contacts) => contacts.filter((contact) => contact.id !== id));
    setSelected(undefined);
  };

  return (
    <Toast.Provider>
      <Panel.Root>
        <Panel.Header>
          <Toolbar.Root>
            <Toolbar.Text>Contacts</Toolbar.Text>
            <Toolbar.Separator variant='gap' />
            {contact && <EditDialog label='Edit' contact={contact} onSave={handleSave} />}
            {contact && <DeletePopover label='Delete' onDelete={() => handleDelete(contact.id)} />}
          </Toolbar.Root>
        </Panel.Header>
        <Panel.Body asChild>
          <Layout.Grid cols={['16rem', 'fill']} grow>
            <ContactList contacts={contacts} selected={selected} onSelect={setSelected} />
            {contact && (
              <Layout.Flex column gap='sm' classNames='p-4'>
                <Typography.Text asChild>
                  <h2>{contact.name}</h2>
                </Typography.Text>
                <Typography.Text tone='muted'>{contact.email}</Typography.Text>
                <Role role={contact.role} />
              </Layout.Flex>
            )}
          </Layout.Grid>
        </Panel.Body>
      </Panel.Root>
      <Toast.Root open={saved !== undefined} onOpenChange={(open) => !open && setSaved(undefined)}>
        <Toast.Header icon='ph--check-circle--regular'>Contact saved</Toast.Header>
        <Toast.Description>{saved} was updated.</Toast.Description>
      </Toast.Root>
      <Toast.Toaster />
    </Toast.Provider>
  );
};
// #endregion
