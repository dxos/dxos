//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Ref } from '@dxos/client/echo';
import { Obj, Query, Tag, Type } from '@dxos/echo';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { ClientPlugin } from '@dxos/plugin-client';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookPlugin } from '@dxos/plugin-testing';
import { ThemePlugin } from '@dxos/plugin-theme';
import { faker } from '@dxos/random';
import { useDatabase, useQuery } from '@dxos/react-client/echo';
import { withTheme } from '@dxos/react-ui/testing';
import { translations as stackTranslations } from '@dxos/react-ui-stack';
import { Stack } from '@dxos/react-ui-stack';
import { Collection, View } from '@dxos/schema';
import { createObjectFactory } from '@dxos/schema/testing';
import { Message, Organization, Person, Project, Task } from '@dxos/types';
import { defaultTx } from '@dxos/ui-theme';

import { translations } from '../translations';

import { ProjectContainer } from './ProjectContainer';
import { ProjectObjectSettings } from './ProjectSettings';

faker.seed(0);

const DefaultStory = () => {
  const db = useDatabase();
  const projects = useQuery(db, Filter.type(Project.Project));
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
            Tag.Tag,
            Project.Project,
            View.View,
            Collection.Collection,
            Organization.Organization,
            Task.Task,
            Person.Person,
            Message.Message,
          ],
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
            await client.spaces.waitUntilReady();
            const space = client.spaces.default;
            await space.waitUntilReady();

            const tag = space.db.add(Tag.make({ label: 'important', hue: 'green' }));
            const tagDxn = Obj.getDXN(tag).toString();

            // Create a project.
            const project = Project.make();

            // Create a view for Contacts.
            const personView = View.make({
              query: Query.select(Filter.type(Person.Person)),
              jsonSchema: Type.toJsonSchema(Person.Person),
            });

            // Create a view for Organizations.
            const organizationView = View.make({
              query: Query.select(Filter.type(Organization.Organization)).select(Filter.tag(tagDxn)),
              jsonSchema: Type.toJsonSchema(Organization.Organization),
            });

            // Create a view for Tasks.
            const taskView = View.make({
              query: Query.select(Filter.type(Task.Task)).select(Filter.tag(tagDxn)),
              jsonSchema: Type.toJsonSchema(Task.Task),
            });

            // Create a view for Project-Projects.
            const projectView = View.make({
              query: Query.select(Filter.type(Project.Project)),
              jsonSchema: Type.toJsonSchema(Project.Project),
            });

            // Create a view for Messages.
            const messageQueue = space.queues.create();
            const messageView = View.make({
              query: Query.select(Filter.type(Message.Message)).options({
                queues: [messageQueue.dxn.toString()],
              }),
              jsonSchema: Type.toJsonSchema(Message.Message),
            });

            // Add views to project collections
            project.columns.push(
              {
                name: 'Contacts',
                view: Ref.make(personView),
                order: [],
              },
              {
                name: 'Organizations',
                view: Ref.make(organizationView),
                order: [],
              },
              {
                name: 'Tasks',
                view: Ref.make(taskView),
                order: [],
              },
              {
                name: 'Projects',
                view: Ref.make(projectView),
                order: [],
              },
              {
                name: 'Messages',
                view: Ref.make(messageView),
                order: [],
              },
            );

            // Add project to space
            space.db.add(project);

            // Generate sample Organizations
            Array.from({ length: 5 }).forEach(() => {
              const org = Obj.make(
                Organization.Organization,
                {
                  name: faker.company.name(),
                  website: faker.internet.url(),
                  description: faker.lorem.paragraph(),
                  image: faker.image.url(),
                },
                {
                  tags: faker.datatype.boolean() ? [Obj.getDXN(tag).toString()] : [],
                },
              );
              space.db.add(org);
            });

            // Generate sample Tasks
            Array.from({ length: 8 }).forEach(() => {
              const task = Obj.make(
                Task.Task,
                {
                  title: faker.lorem.sentence(),
                  status: faker.helpers.arrayElement(['todo', 'in-progress', 'done']) as any,
                  priority: faker.helpers.arrayElement(['low', 'medium', 'high']) as any,
                },
                {
                  tags: faker.datatype.boolean() ? [Obj.getDXN(tag).toString()] : [],
                },
              );
              space.db.add(task);
            });

            // Generate sample Contacts
            const factory = createObjectFactory(space.db, faker as any);
            await factory([{ type: Person.Person, count: 12 }]);

            // Generate sample Projects
            Array.from({ length: 3 }).forEach(() => {
              const nestedProject = Project.make({
                name: faker.commerce.productName(),
                description: faker.lorem.sentence(),
              });
              space.db.add(nestedProject);
            });

            // Generate sample Messages
            const messages = Array.from({ length: 6 }).map(() => {
              const message = Obj.make(Message.Message, {
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
        StorybookPlugin({}),
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
