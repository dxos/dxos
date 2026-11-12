//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useState } from 'react';

import { DXN, Format, Type } from '@dxos/echo';
import { Form, ObjectForm } from '@dxos/react-ui-form';
import * as Typography from '@dxos/react-ui/Typography';

// #region schema
const ContactSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.check(Schema.isMinLength(1))).annotate({
    title: 'Name',
  }),
  email: Schema.optional(Format.Email.annotate({ title: 'Email' })),
  role: Schema.Literals(['viewer', 'editor', 'admin']).annotate({
    title: 'Role',
  }),
  notes: Schema.optional(Format.Text.annotate({ title: 'Notes' })),
});

type Contact = Schema.Schema.Type<typeof ContactSchema>;
// #endregion

// #region form
/** A form for a new contact: its fields come from the schema, and Save is enabled once the values are valid. */
export const NewContact = () => {
  const [saved, setSaved] = useState<Contact>();
  return (
    <>
      <Form.Root
        schema={ContactSchema}
        values={{ role: 'viewer' }}
        onSave={(values) => setSaved(values)}
      >
        <Form.Content>
          <Form.Fields />
          <Form.Actions />
        </Form.Content>
      </Form.Root>
      <Typography.Text tone='muted'>
        {saved ? `Saved ${saved.name} as ${saved.role}` : 'Not saved yet'}
      </Typography.Text>
    </>
  );
};
// #endregion

// #region include
/** Only the fields a quick-add needs, in this order. */
export const QuickAdd = ({
  onSave,
}: {
  onSave: (contact: Contact) => void;
}) => (
  <Form.Root schema={ContactSchema} values={{ role: 'viewer' }} onSave={onSave}>
    <Form.Content>
      <Form.Fields include={['name', 'email']} />
      <Form.Actions />
    </Form.Content>
  </Form.Root>
);
// #endregion

// #region object
class Person extends Type.makeObject<Person>(
  DXN.make('com.example.type.person', '0.1.0'),
)(
  Schema.Struct({
    name: Schema.String,
    email: Schema.optional(Format.Email),
  }),
) {}

/** An ECHO object's fields; each change is written to the object as it is made. */
export const PersonForm = ({ person }: { person: Person }) => (
  <ObjectForm type={Person} object={person} showTags={false} />
);
// #endregion
