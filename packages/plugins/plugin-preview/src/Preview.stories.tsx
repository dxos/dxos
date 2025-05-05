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
import { Contact, Organization, Project } from '@dxos/schema';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { ContactCard, OrganizationCard, ProjectCard } from './components';
import translations from './translations';

faker.seed(1234);

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
        <Popover.Content classNames='overflow-hidden'>
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

const omitImage = ({ image, ...rest }: any) => rest;

const data = (() => {
  const organization = create(Organization, {
    name: faker.company.name(),
    image:
      'https://plus.unsplash.com/premium_photo-1672116452571-896980a801c8?q=80&w=2671&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    website: faker.internet.url(),
    description: faker.lorem.paragraph(),
  });

  const contact = create(Contact, {
    fullName: faker.person.fullName(),
    image:
      'https://plus.unsplash.com/premium_photo-1664536392779-049ba8fde933?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    organization: makeRef(organization),
    emails: [
      {
        label: 'Work',
        value: faker.internet.email(),
      },
    ],
  });

  const project = create(Project, {
    name: faker.person.fullName(),
    image: 'https://dxos.network/dxos-logotype-blue.png',
    description: faker.lorem.paragraph(),
  });

  return { organization, contact, project };
})();

export const ContactWithImage = {
  args: {
    Component: ContactCard,
    icon: 'ph--user--regular',
    subject: data.contact,
  },
};

export const ContactNoImage = {
  args: {
    Component: ContactCard,
    icon: 'ph--user--regular',
    subject: omitImage(data.contact),
  },
};

export const OrganizationWithImage = {
  args: {
    Component: OrganizationCard,
    icon: 'ph--building-office--regular',
    subject: data.organization,
  },
};

export const OrganizationNoImage = {
  args: {
    Component: OrganizationCard,
    icon: 'ph--building-office--regular',
    subject: omitImage(data.organization),
  },
};

export const ProjectWithImage = {
  args: {
    Component: ProjectCard,
    icon: 'ph--building--regular',
    subject: data.project,
  },
};

export const ProjectNoImage = {
  args: {
    Component: ProjectCard,
    icon: 'ph--building--regular',
    subject: omitImage(data.project),
  },
};
