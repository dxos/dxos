//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Ref } from '@dxos/client/echo';
import { Obj, Query, Tag, Type } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { faker } from '@dxos/random';
import { useDatabase, useQuery } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as stackTranslations } from '@dxos/react-ui-stack';
import { Stack } from '@dxos/react-ui-stack';
import { Collection, View } from '@dxos/schema';
import { createObjectFactory } from '@dxos/schema/testing';
import { Message, Organization, Person, Pipeline, Task } from '@dxos/types';

import { translations } from '../translations';

import { PipelineContainer } from './PipelineContainer';
import { PipelineObjectSettings } from './PipelineSettings';

faker.seed(0);

const DefaultStory = () => {
  const db = useDatabase();
  const pipelines = useQuery(db, Filter.type(Pipeline.Pipeline));
  const pipeline = pipelines[0];

  if (!pipeline) {
    return <p>Loading…</p>;
  }

  return (
    <Stack orientation='horizontal' size='split' rail={false} classNames='px-0 h-full'>
      <PipelineContainer role='article' subject={pipeline} />
      <PipelineObjectSettings pipeline={pipeline} classNames='border-s border-separator' />
    </Stack>
  );
};

const meta = {
  title: 'plugins/plugin-pipeline/PipelineContainer',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        ClientPlugin({
          types: [
            Tag.Tag,
            Pipeline.Pipeline,
            View.View,
            Collection.Collection,
            Organization.Organization,
            Task.Task,
            Person.Person,
            Message.Message,
          ],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => client.halo.createIdentity());
              yield* Effect.promise(() => client.spaces.waitUntilReady());
              const space = client.spaces.default;
              yield* Effect.promise(() => space.waitUntilReady());

              const tag = space.db.add(Tag.make({ label: 'important', hue: 'green' }));
              const tagDxn = Obj.getDXN(tag).toString();

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
                query: Query.select(Filter.type(Pipeline.Pipeline)),
                jsonSchema: Type.toJsonSchema(Pipeline.Pipeline),
              });

              // Create a view for Messages.
              const messageQueue = space.queues.create();
              const messageView = View.make({
                query: Query.select(Filter.type(Message.Message)).options({
                  queues: [messageQueue.dxn.toString()],
                }),
                jsonSchema: Type.toJsonSchema(Message.Message),
              });

              // Create pipline with columns.
              const pipeline = Pipeline.make({
                columns: [
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
                ],
              });

              // Add pipeline to space.
              space.db.add(pipeline);

              // Generate sample Organizations
              Array.from({ length: 20 }).forEach(() => {
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
              Array.from({ length: 20 }).forEach(() => {
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
              yield* Effect.promise(() => factory([{ type: Person.Person, count: 12 }]));

              // Generate sample Projects
              Array.from({ length: 20 }).forEach(() => {
                const nestedProject = Pipeline.make({
                  name: faker.commerce.productName(),
                  description: faker.lorem.sentence(),
                });
                space.db.add(nestedProject);
              });

              // Generate sample Messages
              const messages = Array.from({ length: 20 }).map(() => {
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

              yield* Effect.promise(() => messageQueue.append(messages));
            }),
        }),

        InboxPlugin(),
        PreviewPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...stackTranslations],
  },
} satisfies Meta<typeof PipelineContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
