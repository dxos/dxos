//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Ref } from '@dxos/client/echo';
import { Database, Feed, Obj, Query, Tag, Type } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-db';
import { ClientPlugin } from '@dxos/plugin-client';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { faker } from '@dxos/random';
import { useDatabase, useQuery } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as stackTranslations } from '@dxos/react-ui-stack';
import { Collection, View } from '@dxos/schema';
import { createObjectFactory } from '@dxos/schema/testing';
import { Message, Organization, Person, Pipeline, Task } from '@dxos/types';

import { translations } from '../../translations';
import PipelineObjectSettings from '../PipelineObjectSettings';

import { PipelineContainer } from './PipelineContainer';

faker.seed(0);

const DefaultStory = () => {
  const db = useDatabase();
  const pipelines = useQuery(db, Filter.type(Pipeline.Pipeline));
  const pipeline = pipelines[0];

  if (!pipeline) {
    return <p>Loading…</p>;
  }

  return (
    <div className='grow grid grid-cols-[1fr_350px] overflow-hidden h-full w-full'>
      <PipelineContainer role='article' subject={pipeline} />
      <PipelineObjectSettings pipeline={pipeline} classNames='border-s border-separator' />
    </div>
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
            Type.Feed,
            Pipeline.Pipeline,
            View.View,
            Collection.Collection,
            Organization.Organization,
            Task.Task,
            Person.Person,
            Message.Message,
          ],
          onClientInitialized: Effect.fnUntraced(function* ({ client }) {
            yield* Effect.promise(() => client.halo.createIdentity());
            yield* Effect.promise(() => client.spaces.waitUntilReady());
            const space = client.spaces.default;
            yield* Effect.promise(() => space.waitUntilReady());

            yield* Effect.gen(function* () {
              const tag = yield* Database.add(Tag.make({ label: 'important', hue: 'green' }));
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

              // Create a feed for Messages.
              const messageFeed = yield* Database.add(Feed.make({ name: 'Messages' }));
              const messages = Array.from({ length: 20 }).map(() =>
                Obj.make(Message.Message, {
                  created: faker.date.recent().toISOString(),
                  sender: { role: 'user' },
                  blocks: [{ _tag: 'text' as const, text: faker.lorem.sentences(2) }],
                }),
              );
              yield* Feed.append(messageFeed, messages);

              const messageQueueDxn = Feed.getQueueDxn(messageFeed)!.toString();
              const messageView = View.make({
                query: Query.select(Filter.type(Message.Message)).options({
                  queues: [messageQueueDxn],
                }),
                jsonSchema: Type.toJsonSchema(Message.Message),
              });

              // Create a feed for Tasks (for testing feed switching in settings).
              const taskFeed = yield* Database.add(Feed.make({ name: 'Tasks' }));
              const feedTasks = Array.from({ length: 10 }).map(() =>
                Obj.make(Task.Task, {
                  title: faker.lorem.sentence(),
                  status: faker.helpers.arrayElement(['todo', 'in-progress', 'done']) as any,
                  priority: faker.helpers.arrayElement(['low', 'medium', 'high']) as any,
                }),
              );
              yield* Feed.append(taskFeed, feedTasks);

              // Create pipeline with columns.
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
              yield* Database.add(pipeline);

              // Generate sample Organizations.
              for (const _ of Array.from({ length: 20 })) {
                yield* Database.add(
                  Obj.make(
                    Organization.Organization,
                    {
                      name: faker.company.name(),
                      website: faker.internet.url(),
                      description: faker.lorem.paragraph(),
                      image: faker.image.url(),
                    },
                    {
                      tags: faker.datatype.boolean() ? [tagDxn] : [],
                    },
                  ),
                );
              }

              // Generate sample Tasks.
              for (const _ of Array.from({ length: 20 })) {
                yield* Database.add(
                  Obj.make(
                    Task.Task,
                    {
                      title: faker.lorem.sentence(),
                      status: faker.helpers.arrayElement(['todo', 'in-progress', 'done']) as any,
                      priority: faker.helpers.arrayElement(['low', 'medium', 'high']) as any,
                    },
                    {
                      tags: faker.datatype.boolean() ? [tagDxn] : [],
                    },
                  ),
                );
              }

              // Generate sample Contacts.
              const factory = createObjectFactory(space.db, faker as any);
              yield* Effect.promise(() => factory([{ type: Person.Person, count: 12 }]));

              // Generate sample Projects.
              for (const _ of Array.from({ length: 20 })) {
                yield* Database.add(
                  Pipeline.make({
                    name: faker.commerce.productName(),
                    description: faker.lorem.sentence(),
                  }),
                );
              }
            }).pipe(Effect.provide(Layer.merge(Database.layer(space.db), createFeedServiceLayer(space.queues))));
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
