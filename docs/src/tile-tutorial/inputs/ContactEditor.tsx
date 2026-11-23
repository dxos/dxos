//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Field from '@dxos/react-ui/Field';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Select from '@dxos/react-ui/Select';

import { type Contact, ROLES } from '../contacts.ts';

export type ContactEditorProps = {
  contact: Contact;
  onSave: (contact: Contact) => void;
};

// #region editor
/** Edits a copy of `contact`; nothing changes until Save. */
export const ContactEditor = ({ contact, onSave }: ContactEditorProps) => {
  const [draft, setDraft] = useState(contact);
  const changed = JSON.stringify(draft) !== JSON.stringify(contact);

  return (
    <Layout.Flex column gap='form'>
      <Field.Root>
        <Field.Label>Name</Field.Label>
        <Input.Root value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      </Field.Root>
      <Field.Root>
        <Field.Label>Email</Field.Label>
        <Input.Root
          type='email'
          value={draft.email}
          onChange={(event) => setDraft({ ...draft, email: event.target.value })}
        />
      </Field.Root>
      <Field.Root>
        <Field.Label>Role</Field.Label>
        <Select.Root
          items={ROLES}
          value={[draft.role]}
          onValueChange={({ value: [role] }) => setDraft({ ...draft, role })}
        >
          <Select.Trigger />
          <Select.Content>
            {ROLES.map((item) => (
              <Select.Item key={item.value} item={item} />
            ))}
          </Select.Content>
        </Select.Root>
      </Field.Root>
      <Layout.Flex gap='sm' justify='end'>
        <Button.Root disabled={!changed} onClick={() => setDraft(contact)}>
          Revert
        </Button.Root>
        <Button.Root variant='primary' disabled={!changed || draft.name.trim() === ''} onClick={() => onSave(draft)}>
          Save
        </Button.Root>
      </Layout.Flex>
    </Layout.Flex>
  );
};
// #endregion
