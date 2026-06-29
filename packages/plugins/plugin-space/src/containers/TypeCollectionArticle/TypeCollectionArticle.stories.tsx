//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React from 'react';

import { Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppAnnotation, AppCapabilities } from '@dxos/app-toolkit';
import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { TypeCollectionArticle } from './TypeCollectionArticle';

/**
 * Type that opts in to a content preview card via `CardAnnotation`.
 */
class CardType extends Type.makeObject<CardType>(DXN.make('org.dxos.type.test.cardType', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--cards--regular', hue: 'emerald' }),
    AppAnnotation.CardAnnotation.set(true),
  ),
) {}

/**
 * Type without the annotation; renders as a header-only tile.
 */
class PlainType extends Type.makeObject<PlainType>(DXN.make('org.dxos.type.test.plainType', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
  }).pipe(LabelAnnotation.set(['name']), Annotation.IconAnnotation.set({ icon: 'ph--circle--regular', hue: 'indigo' })),
) {}

const OBJECT_COUNT = 6;

type StoryArgs = {
  type: Type.AnyObj;
};

const DefaultStory = ({ type }: StoryArgs) => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  if (!space) {
    return <Loading />;
  }

  return <TypeCollectionArticle role='article' space={space} typeUri={Type.getURI(type)} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-space/containers/TypeCollectionArticle',
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
          types: [CardType, PlainType],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => client.halo.createIdentity());
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());

              for (let i = 0; i < OBJECT_COUNT; i++) {
                space.db.add(
                  Obj.make(CardType, { name: `Card ${i + 1}`, description: `Preview body for card ${i + 1}.` }),
                );
                space.db.add(Obj.make(PlainType, { name: `Plain ${i + 1}`, description: `Plain object ${i + 1}.` }));
              }
            }),
        }),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Collection of objects without the annotation — header-only tiles. */
export const Default: Story = {
  args: {
    type: PlainType,
  },
};

/** Collection of objects whose type carries `CardAnnotation` — tiles render a preview body. */
export const WithCardContent: Story = {
  args: {
    type: CardType,
  },
};
