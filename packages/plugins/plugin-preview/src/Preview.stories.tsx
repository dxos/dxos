//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React, { type FC } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { faker } from '@dxos/random';
import { Icon, Popover } from '@dxos/react-ui';
import { DataType } from '@dxos/schema';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { ContactCard, OrganizationCard, ProjectCard } from './components';
import { translations } from './translations';
import { type PreviewProps } from './types';

faker.seed(1234);

type StoryProps = {
  Component: FC<PreviewProps<any>>;
  icon: string;
  subject: any;
};

const meta: Meta<StoryProps> = {
  title: 'plugins/plugin-preview/Preview',
  render: ({ Component, icon, ...args }) => {
    return (
      <Popover.Root open>
        <Popover.Content>
          <Popover.Viewport>
            <Component {...args} role='popover' />
          </Popover.Viewport>
          <Popover.Arrow />
        </Popover.Content>
        <Popover.Trigger>
          <Icon icon={icon} size={5} />
        </Popover.Trigger>
      </Popover.Root>
    );
  },
  decorators: [withTheme, withLayout()],
  parameters: {
    layout: 'centered',
    translations,
  },
};

export default meta;

const omitImage = ({ image, ...rest }: any) => rest;

const data = (() => {
  const organization = Obj.make(DataType.Organization, {
    name: faker.company.name(),
    image:
      'https://plus.unsplash.com/premium_photo-1672116452571-896980a801c8?q=80&w=2671&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    website: faker.internet.url(),
    description: faker.lorem.paragraph(),
  });

  const contact = Obj.make(DataType.Person, {
    fullName: faker.person.fullName(),
    image:
      'https://plus.unsplash.com/premium_photo-1664536392779-049ba8fde933?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    organization: Ref.make(organization),
    emails: [
      {
        label: 'Work',
        value: faker.internet.email(),
      },
      {
        label: 'Work',
        value: faker.internet.email(),
      },
      {
        label: 'Work',
        value: faker.internet.email(),
      },
    ],
  });

  const project = Obj.make(DataType.Project, {
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
    role: 'popover',
  },
};

export const ContactNoImage = {
  args: {
    Component: ContactCard,
    icon: 'ph--user--regular',
    subject: omitImage(data.contact),
    role: 'popover',
  },
};

export const OrganizationWithImage = {
  args: {
    Component: OrganizationCard,
    icon: 'ph--building-office--regular',
    subject: data.organization,
    role: 'popover',
  },
};

export const OrganizationNoImage = {
  args: {
    Component: OrganizationCard,
    icon: 'ph--building-office--regular',
    subject: omitImage(data.organization),
    role: 'popover',
  },
};

export const ProjectWithImage = {
  args: {
    Component: ProjectCard,
    icon: 'ph--building--regular',
    subject: data.project,
    role: 'popover',
  },
};

export const ProjectNoImage = {
  args: {
    Component: ProjectCard,
    icon: 'ph--building--regular',
    subject: omitImage(data.project),
    role: 'popover',
  },
};
