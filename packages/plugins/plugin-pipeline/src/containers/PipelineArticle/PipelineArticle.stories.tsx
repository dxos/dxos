//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Collection, Database, EchoURI, Feed, Filter, JsonSchema, Obj, Query, Ref, Tag, View } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-db';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { InboxPlugin } from '@dxos/plugin-inbox/plugin';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { useDatabase, useQuery } from '@dxos/react-client/echo';
import { translations as stackTranslations } from '@dxos/react-ui-stack/translations';
import { withLayout } from '@dxos/react-ui/testing';
import { ViewModel } from '@dxos/schema';
import { createObjectFactory } from '@dxos/schema/testing';
import { Message, Organization, Person, Pipeline, Task } from '@dxos/types';

import { translations } from '#translations';

import PipelineProperties from '../PipelineProperties';
import { PipelineArticle } from './PipelineArticle';

random.seed(0);

const DefaultStory = () => {
  const db = useDatabase();
  const pipelines = useQuery(db, Filter.type(Pipeline.Pipeline));
  const pipeline = pipelines[0];

  if (!pipeline) {
    return <p>Loading…</p>;
  }

  return (
    <div className='grow grid grid-cols-[1fr_350px] overflow-hidden h-full w-full'>
      <PipelineArticle role='article' subject={pipeline} attendableId='test' />
      <PipelineProperties pipeline={pipeline} classNames='border-s border-separator' />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-pipeline/containers/PipelineArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        ClientPlugin({
          types: [
            Tag.Tag,
            Feed.Feed,
            Pipeline.Pipeline,
            View.View,
            Collection.Collection,
            Organization.Organization,
            Task.Task,
            Person.Person,
            Message.Message,
          ],
          onClientInitialized: Effect.fnUntraced(function* ({ client }) {
            const { personalSpace } = yield* initializeIdentity(client);

            yield* Effect.gen(function* () {
              const tag = yield* Database.add(Tag.make({ label: 'important', hue: 'green' }));
              const tagUri = Obj.getURI(tag);

              // Create a view for Contacts.
              const personView = ViewModel.make({
                query: Query.select(Filter.type(Person.Person)),
                jsonSchema: JsonSchema.toJsonSchema(Person.Person),
              });

              // Create a view for Organizations.
              const organizationView = ViewModel.make({
                query: Query.select(Filter.type(Organization.Organization)).select(Filter.tag(tagUri)),
                jsonSchema: JsonSchema.toJsonSchema(Organization.Organization),
              });

              // Create a view for Tasks.
              const taskView = ViewModel.make({
                query: Query.select(Filter.type(Task.Task)).select(Filter.tag(tagUri)),
                jsonSchema: JsonSchema.toJsonSchema(Task.Task),
              });

              // Create a view for Project-Projects.
              const projectView = ViewModel.make({
                query: Query.select(Filter.type(Pipeline.Pipeline)),
                jsonSchema: JsonSchema.toJsonSchema(Pipeline.Pipeline),
              });

              // Create a feed for Messages.
              const messageFeed = yield* Database.add(Feed.make({ name: 'Messages' }));
              const messages = Array.from({ length: 20 }).map(() =>
                Obj.make(Message.Message, {
                  created: random.date.recent().toISOString(),
                  sender: { role: 'user' },
                  blocks: [{ _tag: 'text' as const, text: random.lorem.sentences(2) }],
                }),
              );
              yield* Feed.append(messageFeed, messages);

              const messageQueueDxn = Feed.getQueueUri(messageFeed)!;
              const messageView = ViewModel.make({
                query: Query.select(Filter.type(Message.Message)).from([
                  {
                    _tag: 'feed' as const,
                    feedUri: `dxn:queue:data:${EchoURI.getSpaceId(messageQueueDxn)}:${EchoURI.getObjectId(messageQueueDxn)}`,
                  },
                ]),
                jsonSchema: JsonSchema.toJsonSchema(Message.Message),
              });

              // Create a feed for Tasks (for testing feed switching in settings).
              const taskFeed = yield* Database.add(Feed.make({ name: 'Tasks' }));
              const feedTasks = Array.from({ length: 10 }).map(() =>
                Obj.make(Task.Task, {
                  title: random.lorem.sentence(),
                  status: random.helpers.arrayElement(['todo', 'in-progress', 'done']) as any,
                  priority: random.helpers.arrayElement(['low', 'medium', 'high']) as any,
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
                  Obj.make(Organization.Organization, {
                    [Obj.Meta]: {
                      tags: random.datatype.boolean() ? [tagUri] : [],
                    },
                    name: random.company.name(),
                    website: random.internet.url(),
                    description: random.lorem.paragraph(),
                    image: random.image.url(),
                  }),
                );
              }

              // Generate sample Tasks.
              for (const _ of Array.from({ length: 20 })) {
                yield* Database.add(
                  Obj.make(Task.Task, {
                    [Obj.Meta]: {
                      tags: random.datatype.boolean() ? [tagUri] : [],
                    },
                    title: random.lorem.sentence(),
                    status: random.helpers.arrayElement(['todo', 'in-progress', 'done']) as any,
                    priority: random.helpers.arrayElement(['low', 'medium', 'high']) as any,
                  }),
                );
              }

              // Generate sample Contacts.
              const factory = createObjectFactory(personalSpace.db, random as any);
              yield* Effect.promise(() => factory([{ type: Person.Person, count: 12 }]));

              // Generate sample Projects.
              for (const _ of Array.from({ length: 20 })) {
                yield* Database.add(
                  Pipeline.make({
                    name: random.commerce.productName(),
                    description: random.lorem.sentence(),
                  }),
                );
              }
            }).pipe(
              Effect.provide(
                Layer.merge(Database.layer(personalSpace.db), createFeedServiceLayer(personalSpace.queues)),
              ),
            );
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
} satisfies Meta<typeof PipelineArticle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
