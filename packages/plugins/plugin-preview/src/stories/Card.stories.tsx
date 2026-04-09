//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { faker } from '@dxos/random';
import { Card } from '@dxos/react-ui';
import { withLayout } from '@dxos/react-ui/testing';
import { type Organization, type Person, type Pipeline, type Task } from '@dxos/types';

import { FormCard, JsonCard, OrganizationCard, PersonCard, ProjectCard, TaskCard } from '../cards';
import { translations } from '../translations';
import { DefaultStory, createOrganization, createPerson, createProject, createTask } from './testing';

faker.seed(999);

const meta = {
  title: 'plugins/plugin-preview/cards/Card',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    // TODO(wittjosiah): Try to write story which does not depend on plugin manager.
    withPluginManager({ plugins: corePlugins() }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
  tags: ['cards'],
} satisfies Meta<typeof DefaultStory>;

export default meta;

export const _Form: StoryObj<typeof DefaultStory<Person.Person>> = {
  args: {
    Component: FormCard,
    createObject: createPerson,
    image: true,
  },
};

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

export const _Project: StoryObj<typeof DefaultStory<Pipeline.Pipeline>> = {
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

export const _Json = {
  render: () => {
    const data = {
      subject: {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        email: faker.internet.email(),
        tags: [faker.lorem.word(), faker.lorem.word(), faker.lorem.word()],
        nested: {
          count: faker.number.int({ max: 100 }),
          active: faker.datatype.boolean(),
        },
      },
    };

    return (
      <div className='flex justify-center p-16'>
        <div className='dx-card-min-width dx-card-max-width'>
          <Card.Root>
            <Card.Toolbar>
              <Card.IconBlock />
              <Card.Title>JSON</Card.Title>
            </Card.Toolbar>
            <JsonCard data={data} />
          </Card.Root>
        </div>
      </div>
    );
  },
};
