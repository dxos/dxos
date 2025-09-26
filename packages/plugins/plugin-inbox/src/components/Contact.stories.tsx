//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

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
import { defaultTx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { seedTestData } from '@dxos/schema/testing';

import { InboxPlugin } from '../InboxPlugin';
import { Mailbox } from '../types';

const ContactItem = ({ contact }: { contact: DataType.Person }) => {
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

const OrganizationItem = ({ organization }: { organization: DataType.Organization }) => {
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
  title: 'plugins/plugin-inbox/Related',
  decorators: [
    withPluginManager({
      plugins: [
        StorybookLayoutPlugin({}),
        ThemePlugin({ tx: defaultTx }),
        ClientPlugin({
          types: [Mailbox.Mailbox, DataType.Message, DataType.Person, DataType.Organization],
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
            await client.spaces.waitUntilReady();
            await client.spaces.default.waitUntilReady();
            const space = client.spaces.default;
            const { emails } = await seedTestData(space);
            const queueDxn = space.queues.create().dxn;
            const queue = space.queues.get<DataType.Message>(queueDxn);
            await queue.append(emails);
            const mailbox = Mailbox.make({ queue: queueDxn });
            space.db.add(mailbox);
          },
        }),
        PreviewPlugin(),
        SpacePlugin({}),
        IntentPlugin(),
        SettingsPlugin(),
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
    const contacts = useQuery(space, Filter.type(DataType.Person));

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
    const organizations = useQuery(space, Filter.type(DataType.Organization));

    return (
      <List>
        {organizations.map((organization) => (
          <OrganizationItem key={organization.id} organization={organization} />
        ))}
      </List>
    );
  },
};
