//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useRef } from 'react';

import { Common, OperationPlugin, SettingsPlugin } from '@dxos/app-framework';
import { useOperationInvoker } from '@dxos/app-framework/react';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { useDatabase, useQuery } from '@dxos/react-client/echo';
import { List, ListItem } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { Message, Organization, Person } from '@dxos/types';
import { seedTestData } from '@dxos/types/testing';
import { defaultTx } from '@dxos/ui-theme';

import { InboxPlugin } from '../InboxPlugin';
import { Mailbox } from '../types';

const ContactItem = ({ contact }: { contact: Person.Person }) => {
  const { invokePromise } = useOperationInvoker();
  const ref = useRef<HTMLLIElement>(null);

  const handleClick = useCallback(
    () =>
      invokePromise(Common.LayoutOperation.UpdatePopover, {
        subject: contact,
        state: true,
        variant: 'virtual',
        anchor: ref.current,
      }),
    [invokePromise],
  );

  return (
    <ListItem.Root
      ref={ref}
      key={contact.id}
      title={contact.fullName}
      classNames='cursor-pointer justify-center'
      onClick={handleClick}
    >
      <ListItem.Heading>{contact.fullName}</ListItem.Heading>
    </ListItem.Root>
  );
};

const OrganizationItem = ({ organization }: { organization: Organization.Organization }) => {
  const { invokePromise } = useOperationInvoker();
  const ref = useRef<HTMLLIElement>(null);

  const handleClick = useCallback(
    () =>
      invokePromise(Common.LayoutOperation.UpdatePopover, {
        subject: organization,
        state: true,
        variant: 'virtual',
        anchor: ref.current,
      }),
    [invokePromise],
  );

  return (
    <ListItem.Root
      ref={ref}
      key={organization.id}
      title={organization.name}
      classNames='cursor-pointer justify-center'
      onClick={handleClick}
    >
      <ListItem.Heading>{organization.name}</ListItem.Heading>
    </ListItem.Root>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/Popover',
  decorators: [
    withTheme,
    withPluginManager({
      plugins: [
        ClientPlugin({
          types: [Mailbox.Mailbox, Message.Message, Person.Person, Organization.Organization],
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
            await client.spaces.waitUntilReady();
            await client.spaces.default.waitUntilReady();
            const space = client.spaces.default;
            const mailbox = Mailbox.make({ space });
            const { emails } = await seedTestData(space);
            const queueDxn = mailbox.queue.dxn;
            const queue = space.queues.get<Message.Message>(queueDxn);
            await queue.append(emails);
            space.db.add(mailbox);
          },
        }),
        SpacePlugin({}),
        OperationPlugin(),
        OperationPlugin(),
        SettingsPlugin(),

        // UI
        ThemePlugin({ tx: defaultTx }),
        StorybookLayoutPlugin({}),
        PreviewPlugin(),
        InboxPlugin(),
      ],
    }),
  ],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Contacts: Story = {
  render: () => {
    const db = useDatabase();
    const contacts = useQuery(db, Filter.type(Person.Person));

    return (
      <List>
        {contacts.map((contact) => (
          <ContactItem key={contact.id} contact={contact} />
        ))}
      </List>
    );
  },
};

export const Organizations: Story = {
  render: () => {
    const db = useDatabase();
    const organizations = useQuery(db, Filter.type(Organization.Organization));

    return (
      <List>
        {organizations.map((organization) => (
          <OrganizationItem key={organization.id} organization={organization} />
        ))}
      </List>
    );
  },
};
