//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Ref } from '@dxos/client/echo';
import { Obj, Query, Type } from '@dxos/echo';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { ClientPlugin } from '@dxos/plugin-client';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { faker } from '@dxos/random';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { withTheme } from '@dxos/react-ui/testing';
import { translations as stackTranslations } from '@dxos/react-ui-stack';
import { Stack } from '@dxos/react-ui-stack';
import { defaultTx } from '@dxos/react-ui-theme';
import { DataType, createView } from '@dxos/schema';
import { createObjectFactory } from '@dxos/schema/testing';

import { translations } from '../translations';

import { ProjectContainer } from './ProjectContainer';
import { ProjectObjectSettings } from './ProjectSettings';

faker.seed(0);

const DefaultStory = () => {
  const space = useSpace();
  const projects = useQuery(space, Filter.typename(DataType.Project.typename));
  const project = projects[0];

  if (!project) {
    return <p>Loading…</p>;
  }

  return (
    <Stack orientation='horizontal' size='split' rail={false} classNames='pli-0'>
      <ProjectContainer role='article' project={project} />
      <ProjectObjectSettings project={project} classNames='border-is border-separator' />
    </Stack>
  );
};

const meta = {
  title: 'plugins/plugin-project/ProjectContainer',
  render: DefaultStory,
  decorators: [
    withTheme,
    withPluginManager({
      plugins: [
        ClientPlugin({
          types: [
            DataType.Project,
            DataType.View,
            DataType.Collection,
            DataType.Organization,
            DataType.Task,
            DataType.Person,
            DataType.Message,
          ],
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
            await client.spaces.waitUntilReady();
            const space = client.spaces.default;
            await space.waitUntilReady();

            // Create a project
            const project = DataType.makeProject({ collections: [] });

            // Create a view for Contacts
            const personView = createView({
              name: 'Contacts',
              query: Query.select(Filter.type(DataType.Person)),
              queryString: 'Query.select(Filter.type(DataType.Person))',
              jsonSchema: Type.toJsonSchema(DataType.Person),
              presentation: project,
            });

            // Create a view for Organizations
            const organizationView = createView({
              name: 'Organizations',
              query: Query.select(Filter.type(DataType.Organization)),
              queryString: 'Query.select(Filter.type(DataType.Organization))',
              jsonSchema: Type.toJsonSchema(DataType.Organization),
              presentation: project,
            });

            // Create a view for Tasks
            const taskView = createView({
              name: 'Tasks',
              query: Query.select(Filter.type(DataType.Task)),
              queryString: 'Query.select(Filter.type(DataType.Task))',
              jsonSchema: Type.toJsonSchema(DataType.Task),
              presentation: project,
            });

            // Create a view for Project-Projects
            const projectView = createView({
              name: 'Projects (not the UI component)',
              query: Query.select(Filter.type(DataType.Project)),
              queryString: 'Query.select(Filter.type(DataType.Project))',
              jsonSchema: Type.toJsonSchema(DataType.Project),
              presentation: project,
            });

            // Create a view for Messages
            const messageQueue = space.queues.create();
            const messageView = createView({
              name: 'Messages',
              query: Query.select(Filter.type(DataType.Message)).options({ queues: [messageQueue.dxn.toString()] }),
              queryString: 'Query.select(Filter.type(DataType.Message))',
              jsonSchema: Type.toJsonSchema(DataType.Message),
              presentation: project,
            });

            // Add views to project collections
            project.collections.push(Ref.make(personView));
            project.collections.push(Ref.make(organizationView));
            project.collections.push(Ref.make(taskView));
            project.collections.push(Ref.make(projectView));
            project.collections.push(Ref.make(messageView));

            // Add views and project to space
            space.db.add(personView);
            space.db.add(organizationView);
            space.db.add(taskView);
            space.db.add(projectView);
            space.db.add(messageView);
            space.db.add(project);

            // Generate sample Organizations
            Array.from({ length: 5 }).forEach(() => {
              const org = Obj.make(DataType.Organization, {
                name: faker.company.name(),
                website: faker.internet.url(),
                description: faker.lorem.paragraph(),
                image: faker.image.url(),
              });
              space.db.add(org);
            });

            // Generate sample Tasks
            Array.from({ length: 8 }).forEach(() => {
              const task = Obj.make(DataType.Task, {
                title: faker.lorem.sentence(),
                status: faker.helpers.arrayElement(['todo', 'in-progress', 'done']) as any,
                priority: faker.helpers.arrayElement(['low', 'medium', 'high']) as any,
              });
              space.db.add(task);
            });

            // Generate sample Contacts
            const factory = createObjectFactory(space.db, faker as any);
            await factory([{ type: DataType.Person, count: 12 }]);

            // Generate sample Projects
            Array.from({ length: 3 }).forEach(() => {
              const nestedProject = DataType.makeProject({
                name: faker.commerce.productName(),
                description: faker.lorem.sentence(),
              });
              space.db.add(nestedProject);
            });

            // Generate sample Messages
            const messages = Array.from({ length: 6 }).map(() => {
              const message = Obj.make(DataType.Message, {
                created: faker.date.recent().toISOString(),
                sender: { role: 'user' },
                blocks: [
                  {
                    _tag: 'text' as const,
                    text: faker.lorem.sentences(2),
                  },
                ],
              });
              return message;
            });

            await messageQueue.append(messages);
          },
        }),
        SpacePlugin({}),
        IntentPlugin(),
        SettingsPlugin(),

        // UI
        ThemePlugin({ tx: defaultTx }),
        AttentionPlugin(),
        PreviewPlugin(),
        InboxPlugin(),
        StorybookLayoutPlugin({}),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...stackTranslations],
  },
} satisfies Meta<typeof ProjectContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
