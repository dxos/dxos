//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Obj } from '@dxos/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Person } from '@dxos/types';

import { translations } from '#translations';

import { ActorList, type ActorListProps } from './ActorList';

const TEST_USERS: { fullName: string; emails: { value: string }[] }[] = [
  { fullName: 'Alice Carroll', emails: [{ value: 'alice@example.com' }] },
  { fullName: 'Bob Marley', emails: [{ value: 'bob@example.com' }, { value: 'bob.marley@reggae.org' }] },
  { fullName: 'Carol Danvers', emails: [{ value: 'carol@example.com' }] },
  { fullName: 'David Bowie', emails: [{ value: 'david@example.com' }] },
  { fullName: 'Erin Brockovich', emails: [{ value: 'erin@example.com' }] },
  { fullName: 'Frank Zappa', emails: [{ value: 'frank@example.com' }] },
  { fullName: 'Grace Hopper', emails: [{ value: 'grace@navy.mil' }] },
  { fullName: 'Heidi Klum', emails: [{ value: 'xxx@example.com' }] },
];

const meta = {
  title: 'ui/react-ui-components/ActorList',
  component: ActorList,
  render: (args: ActorListProps) => {
    const { space } = useClientStory();
    const [value, setValue] = useState(args.value ?? '');

    return (
      <div className='flex flex-col gap-2'>
        <ActorList
          {...args}
          classNames='p-2 border border-subdued-separator rounded-xs'
          db={space?.db}
          onChange={setValue}
        />

        <JsonHighlighter data={{ value }} classNames='text-xs' />
      </div>
    );
  },
  decorators: [
    withTheme(),
    withLayout({ layout: 'column', classNames: 'p-2', scroll: true }),
    withClientProvider({
      types: [Person.Person],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: ({ space }) => {
        TEST_USERS.forEach((user) => space.db.add(Obj.make(Person.Person, user)));
      },
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof ActorList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    autoFocus: true,
  },
};

export const ActivateOnTyping: Story = {
  args: {
    autoFocus: true,
    activateOnTyping: true,
  },
};

export const WithEmail: Story = {
  args: {
    value: 'someone@example.com ',
  },
};
