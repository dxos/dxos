//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { type Database, Obj } from '@dxos/echo';
import { random } from '@dxos/random';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';
import { Message, Person } from '@dxos/types';

import { translations } from '#translations';

import { EditMessage, type EditMessageProps } from './EditMessage';

const generator: ValueGenerator = random as any;
random.seed(7);

// Seed Person records with email addresses so the recipient typeahead (To/Cc/Bcc) has matches.
const seedPeople = async (db: Database.Database, count: number) => {
  const people = await createObjectFactory(db, generator)([{ type: Person.Person, count }]);
  people.forEach((person) =>
    Obj.update(person, (person: Obj.Mutable<Person.Person>) => {
      const slug = (person.fullName ?? 'user')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.+|\.+$/g, '');
      person.emails = [{ value: `${slug}@example.com` }];
    }),
  );
};

type StoryArgs = Pick<EditMessageProps, 'onSend'>;

// The draft is created in the space so `Obj.getDatabase(message)` resolves — the recipient fields
// query it for `Person` records.
const DefaultStory = (args: StoryArgs) => {
  const { space } = useClientStory();
  const message = useMemo(
    () =>
      space?.db.add(
        Obj.make(Message.Message, {
          created: new Date().toISOString(),
          sender: { name: 'Me' },
          blocks: [{ _tag: 'text' as const, text: 'This is a draft message.' }],
          properties: {},
        }),
      ),
    [space],
  );

  return <>{message && <EditMessage classNames='dx-expander' message={message} onSend={args.onSend} />}</>;
};

const meta = {
  title: 'plugins/plugin-inbox/components/EditMessage',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withClientProvider({
      types: [Message.Message, Person.Person],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        await seedPeople(space.db, 8);
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSend: async (message: any) => console.log(message),
  },
};

export const Spec: Story = {
  args: {
    onSend: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for the form to render.
    await canvas.findByTestId('edit-email-form');

    // Subject is a plain input (the To/Cc/Bcc fields are CodeMirror recipient editors).
    const subjectInput = canvas.getByLabelText('Subject');
    await userEvent.type(subjectInput, 'Test Subject');

    // Click the send button.
    const sendButton = canvas.getByTestId('send-email-button');
    await userEvent.click(sendButton);

    // The composer wrote the subject to the draft and invoked onSend.
    await expect(args.onSend).toHaveBeenCalledWith(
      expect.objectContaining({ properties: expect.objectContaining({ subject: 'Test Subject' }) }),
    );
  },
};
