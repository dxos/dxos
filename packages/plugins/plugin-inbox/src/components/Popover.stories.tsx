//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useRef } from 'react';

import { IntentPlugin, LayoutAction, SettingsPlugin, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { List, ListItem } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { defaultTx } from '@dxos/react-ui-theme';
import { Message, Organization, Person } from '@dxos/types';
import { seedTestData } from '@dxos/types/testing';

import { InboxPlugin } from '../InboxPlugin';
import { Mailbox } from '../types';

const ContactItem = ({ contact }: { contact: Person.Person }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const ref = useRef<HTMLLIElement>(null);

  const handleClick = useCallback(
    () =>
      dispatch(
        createIntent(LayoutAction.UpdatePopover, {
          part: 'popover',
          subject: contact,
          options: {
            state: true,
            variant: 'virtual',
            anchor: ref.current,
          },
        }),
      ),
    [],
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
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const ref = useRef<HTMLLIElement>(null);

  const handleClick = useCallback(
    () =>
      dispatch(
        createIntent(LayoutAction.UpdatePopover, {
          part: 'popover',
          subject: organization,
          options: {
            state: true,
            variant: 'virtual',
            anchor: ref.current,
          },
        }),
      ),
    [],
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
        IntentPlugin(),
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
    const space = useSpace();
    const contacts = useQuery(space, Filter.type(Person.Person));

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
    const space = useSpace();
    const organizations = useQuery(space, Filter.type(Organization.Organization));

    return (
      <List>
        {organizations.map((organization) => (
          <OrganizationItem key={organization.id} organization={organization} />
        ))}
      </List>
    );
  },
};
