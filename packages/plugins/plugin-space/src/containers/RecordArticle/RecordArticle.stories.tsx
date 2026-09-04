//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { random } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { createObjectFactory } from '@dxos/schema/testing';
import { Organization, Person } from '@dxos/types';

import { translations } from '#translations';

import { RecordArticle } from './RecordArticle';

random.seed(0);

// Kept small deliberately: the storybook client takes ~5s just to open the space, and seeding on top of
// that pushes the plugin manager past its 30s startup budget.
const PERSON_COUNT = 8;

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const organizations = useQuery(space?.db, Filter.type(Organization.Organization));
  const org = organizations[0];
  if (!org) {
    return <Loading />;
  }

  // The toolbar reads actions off the node named by `attendableId`, so the story must name the node the
  // extension below contributes to — not an arbitrary string, which would render an empty toolbar.
  return <RecordArticle role='article' subject={org} attendableId={Obj.getURI(org).toString()} />;
};

/**
 * Stands in for a donor plugin (plugin-crm contributes the real Enrich action this way). plugin-space
 * must not depend on plugin-crm — that separation is the point of sourcing toolbar actions from the
 * graph — so the story contributes its own action rather than importing one.
 */
const storyGraphBuilders = () =>
  Effect.runSync(
    Effect.all([
      AppGraphBuilder.createExtension({
        id: 'storyRecordActions',
        match: (node) =>
          Obj.instanceOf(Organization.Organization, node.data) ? Option.some(node.data) : Option.none(),
        actions: () =>
          Effect.succeed([
            {
              id: 'storyResearch',
              data: Effect.fnUntraced(function* () {
                log.info('enrich invoked');
              }),
              properties: {
                label: 'Research',
                icon: 'ph--sparkle--regular',
                disposition: ['toolbar', 'list-item'],
                presentation: { toolbar: { variant: 'primary', iconOnly: false } },
                testId: 'story.record.research',
              },
            },
          ]),
      }),
    ]),
  );

const meta = {
  title: 'plugins/plugin-space/containers/RecordArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      capabilities: [
        Capability.contribute(AppCapabilities.Translations, translations),
        Capability.contribute(AppCapabilities.AppGraphBuilder, storyGraphBuilders()),
      ],
      plugins: [
        ...corePlugins(),
        StorybookPlugin.make({}),
        PreviewPlugin.make(),
        ClientPlugin.make({
          types: [Organization.Organization, Person.Person],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => client.halo.createIdentity());
              const space = yield* Effect.promise(() => client.spaces.create());
              yield* Effect.promise(() => space.waitUntilReady());

              const factory = createObjectFactory(space.db, random as any);
              yield* Effect.promise(() =>
                factory([
                  { type: Organization.Organization, count: 1 },
                  { type: Person.Person, count: PERSON_COUNT },
                ]),
              );
            }),
        }),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
