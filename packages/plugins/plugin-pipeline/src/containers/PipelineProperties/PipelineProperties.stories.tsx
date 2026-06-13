//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Collection, Database, Feed, Filter, JsonSchema, Obj, Query, Ref, Scope, Tag, View } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-client';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { useDatabase, useQuery } from '@dxos/react-client/echo';
import { translations as stackTranslations } from '@dxos/react-ui-stack/translations';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { ViewModel } from '@dxos/schema';
import { createObjectFactory } from '@dxos/schema/testing';
import { Message, Organization, Person, Pipeline, Task } from '@dxos/types';

import { translations } from '#translations';

import { PipelineProperties } from './PipelineProperties';

random.seed(0);

const DefaultStory = () => {
  const db = useDatabase();
  const pipelines = useQuery(db, Filter.type(Pipeline.Pipeline));
  const pipeline = pipelines.find((pipeline) => (pipeline.columns?.length ?? 0) > 0);

  if (!pipeline) {
    return <Loading data={{ pipelines: pipelines.length }} />;
  }

  return <PipelineProperties pipeline={pipeline} classNames='border-is border-ie border-separator' />;
};

const meta = {
  title: 'plugins/plugin-pipeline/containers/PipelineProperties',
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

              // Create a feed for Messages.
              const messageFeed = yield* Database.add(Feed.make({ name: 'Messages' }));
              const messageView = ViewModel.make({
                query: Query.select(Filter.type(Message.Message)).from(Scope.feed(Obj.getURI(messageFeed))),
                jsonSchema: JsonSchema.toJsonSchema(Message.Message),
              });

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
                    name: 'Messages',
                    view: Ref.make(messageView),
                    order: [],
                  },
                ],
              });
              yield* Database.add(pipeline);

              // Generate sample Contacts.
              const factory = createObjectFactory(personalSpace.db, random as any);
              yield* Effect.promise(() => factory([{ type: Person.Person, count: 12 }]));
            }).pipe(
              Effect.provide(
                Layer.merge(Database.layer(personalSpace.db), createFeedServiceLayer(personalSpace.queues)),
              ),
            );
          }),
        }),
        PreviewPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...stackTranslations],
  },
} satisfies Meta<typeof PipelineProperties>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
