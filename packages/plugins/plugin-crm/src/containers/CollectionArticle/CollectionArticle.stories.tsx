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
import { random } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';
import { Organization, Person } from '@dxos/types';

import { translations } from '#translations';

import { CollectionArticle } from './CollectionArticle';

random.seed(1);

const generator: ValueGenerator = random as any;

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

              const createObjects = createObjectFactory(space.db, generator);
              const objects = yield* Effect.promise(() =>
                createObjects([
                  {
                    type: Organization.Organization,
                    count: 16,
                  },
                  {
                    type: Person.Person,
                    count: 32,
                  },
                ]),
              );

              // The generator only populates fields with a GeneratorAnnotation and skips array fields;
              // enrich persons (job data, distinct image, derived emails) and organizations (distinct
              // image) so the masonry and table views show varied, fully-populated cards.
              objects
                .filter((object): object is Person.Person => Obj.instanceOf(Person.Person, object))
                .forEach((person, index) => {
                  Obj.update(person, (person: Obj.Mutable<Person.Person>) => {
                    person.jobTitle = random.person.jobTitle();
                    person.department = random.commerce.department();
                    person.image = `https://picsum.photos/seed/${random.string.uuid()}/256/256`;
                    const slug = (person.fullName ?? 'user')
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '.')
                      .replace(/^\.+|\.+$/g, '');
                    person.emails = [
                      { value: `${slug}@example.com` },
                      ...(index % 3 === 0 ? [{ label: 'work', value: `${slug}@work.example.com` }] : []),
                    ];
                  });
                });
              objects
                .filter((object): object is Organization.Organization =>
                  Obj.instanceOf(Organization.Organization, object),
                )
                .forEach((organization) => {
                  Obj.update(organization, (organization: Obj.Mutable<Organization.Organization>) => {
                    organization.image = `https://picsum.photos/seed/${random.string.uuid()}/256/256`;
                  });
                });
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
