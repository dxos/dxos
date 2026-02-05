//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withPluginManager } from '@dxos/app-framework/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type Organization, type Person, type Project, type Task } from '@dxos/types';

import { OrganizationCard, PersonCard, ProjectCard, TaskCard } from '../cards';
import { translations } from '../translations';

import { DefaultStory, createOrganization, createPerson, createProject, createTask } from './testing';

faker.seed(999);

const meta = {
  title: 'plugins/plugin-preview/Card',
  render: DefaultStory,
  decorators: [
    withTheme,
    withLayout({ layout: 'column', scroll: true }),
    // TODO(wittjosiah): Try to write story which does not depend on plugin manager.
    withPluginManager({ plugins: corePlugins() }),
  ],
  parameters: {
    translations,
    layout: 'fullscreen',
  },
  tags: ['cards'],
} satisfies Meta<typeof DefaultStory>;

export default meta;

export const _Person: StoryObj<typeof DefaultStory<Person.Person>> = {
  args: {
    Component: PersonCard,
    createObject: createPerson,
    image: true,
  },
};

export const _Organization: StoryObj<typeof DefaultStory<Organization.Organization>> = {
  args: {
    Component: OrganizationCard,
    createObject: createOrganization,
    image: true,
  },
};

export const _Project: StoryObj<typeof DefaultStory<Project.Project>> = {
  args: {
    Component: ProjectCard,
    createObject: createProject,
    image: true,
  },
};

export const _Task: StoryObj<typeof DefaultStory<Task.Task>> = {
  args: {
    Component: TaskCard,
    createObject: createTask,
    image: true,
  },
};
