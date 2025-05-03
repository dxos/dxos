//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { type FC } from 'react';

import { create } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { makeRef } from '@dxos/react-client/echo';
import { Icon, Popover } from '@dxos/react-ui';
import { Testing } from '@dxos/schema/testing';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { ContactCard, OrgCard } from './components';
import translations from './translations';

faker.seed(1);

type StoryProps = {
  Component: FC<{ subject: any }>;
  icon: string;
  subject: any;
};

const meta: Meta<StoryProps> = {
  title: 'plugins/plugin-preview/Preview',
  render: ({ Component, icon, ...args }) => {
    return (
      <Popover.Root open>
        <Popover.Content classNames='popover-max-width overflow-hidden'>
          <Component {...args} />
          <Popover.Arrow />
        </Popover.Content>
        <Popover.Trigger>
          <Icon icon={icon} size={5} />
        </Popover.Trigger>
      </Popover.Root>
    );
  },
  decorators: [withTheme, withLayout({ tooltips: true })],
  parameters: {
    layout: 'centered',
    translations,
  },
};

export default meta;

export const Org = {
  args: {
    Component: OrgCard,
    icon: 'ph--building-office--regular',
    subject: create(Testing.Org, {
      name: faker.company.name(),
      image:
        'https://plus.unsplash.com/premium_photo-1672116452571-896980a801c8?q=80&w=2671&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      website: faker.internet.url(),
      description: faker.lorem.paragraph(),
    }),
  },
};

export const OrgNoImage = {
  args: {
    Component: OrgCard,
    icon: 'ph--building-office--regular',
    subject: create(Testing.Org, {
      name: faker.company.name(),
      website: faker.internet.url(),
      description: faker.lorem.paragraph(),
    }),
  },
};

export const Contact = {
  args: {
    Component: ContactCard,
    icon: 'ph--user--regular',
    subject: create(Testing.Contact, {
      name: faker.person.fullName(),
      image:
        'https://plus.unsplash.com/premium_photo-1664536392779-049ba8fde933?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      organization: makeRef(Org.args.subject),
      email: faker.internet.email(),
    }),
  },
};

export const ContactNoImage = {
  args: {
    Component: ContactCard,
    icon: 'ph--user--regular',
    subject: create(Testing.Contact, {
      name: faker.person.fullName(),
      organization: makeRef(Org.args.subject),
      email: faker.internet.email(),
    }),
  },
};
