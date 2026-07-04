//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Obj, type Type } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Organization, Person } from '@dxos/types';

import { translations } from '#translations';

import { CollectionArticle } from './CollectionArticle';

const OBJECT_COUNT = 8;

type StoryArgs = {
  type: Type.AnyEntity;
};

const DefaultStory = ({ type }: StoryArgs) => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  if (!space) {
    return <Loading />;
  }

  return <CollectionArticle role='article' space={space} type={type} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-crm/containers/CollectionArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      capabilities: [Capability.contributes(AppCapabilities.Translations, translations)],
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        PreviewPlugin(),
        ClientPlugin({
          types: [Organization.Organization, Person.Person],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => client.halo.createIdentity());
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());

              for (let i = 0; i < OBJECT_COUNT; i++) {
                space.db.add(
                  Obj.make(Organization.Organization, {
                    name: `Organization ${i + 1}`,
                    description: `A sample organization used to exercise the collection card body (${i + 1}).`,
                    website: `https://example-${i + 1}.com`,
                  }),
                );
                space.db.add(
                  Obj.make(Person.Person, {
                    fullName: `Person ${i + 1}`,
                    jobTitle: 'Engineer',
                    emails: [{ value: `person${i + 1}@example.com` }],
                  }),
                );
              }
            }),
        }),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Organizations: Story = {
  args: {
    type: Organization.Organization,
  },
};

export const People: Story = {
  args: {
    type: Person.Person,
  },
};
