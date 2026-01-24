//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withPluginManager } from '@dxos/app-framework/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Organization, Person, Project, Task } from '@dxos/types';

import { OrganizationCard, PersonCard, ProjectCard, TaskCard } from '../cards';
import { translations } from '../translations';

import { DefaultStory, createObject } from './testing';

faker.seed(999);

const meta = {
  title: 'plugins/plugin-preview/Card',
  render: DefaultStory,
  decorators: [
    withTheme,
    withLayout({ layout: 'column', scroll: true }),
    withPluginManager({
      plugins: [...corePlugins()],
    }),
  ],
  parameters: {
    translations,
    layout: 'fullscreen',
  },
  tags: ['cards'],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const _Person: Story = {
  args: {
    Component: PersonCard,
    object: createObject(Person.Person),
    image: true,
  },
};

export const _Organization: Story = {
  args: {
    Component: OrganizationCard,
    object: createObject(Organization.Organization),
    image: true,
  },
};

export const _Project: Story = {
  args: {
    Component: ProjectCard,
    object: createObject(Project.Project),
    image: true,
  },
};

export const _Task: Story = {
  args: {
    Component: TaskCard,
    object: createObject(Task.Task),
    image: true,
  },
};
