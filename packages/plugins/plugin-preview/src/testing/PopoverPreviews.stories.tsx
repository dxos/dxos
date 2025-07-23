//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';

import { withTheme, withLayout } from '@dxos/storybook-utils';

import { type StoryProps, render } from './util';
import { ContactCard, OrganizationCard, ProjectCard } from '../components';
import { translations } from '../translations';

const meta: Meta<StoryProps> = {
  title: 'Cards/plugin-preview/Popover',
  render,
  decorators: [withTheme, withLayout()],
  parameters: {
    layout: 'centered',
    translations,
  },
};

export default meta;

export const Contact = {
  args: {
    Component: ContactCard,
    icon: 'ph--user--regular',
    subject: 'contact',
    withImage: true,
    role: 'popover',
  },
};

export const Organization = {
  args: {
    Component: OrganizationCard,
    icon: 'ph--building-office--regular',
    subject: 'organization',
    withImage: true,
    role: 'popover',
  },
};

export const Project = {
  args: {
    Component: ProjectCard,
    icon: 'ph--building--regular',
    subject: 'project',
    withImage: true,
    role: 'popover',
  },
};
