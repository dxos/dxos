//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Collection, Filter, Ref } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Markdown } from '@dxos/plugin-markdown';
import { corePlugins } from '@dxos/plugin-testing';
import { useClient } from '@dxos/react-client';
import { useQuery } from '@dxos/react-client/echo';
import { withLayout } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { StackArticle } from './StackArticle';

const COLLECTION_NAME = 'Test Stack';

const meta: Meta<typeof StackArticle> = {
  title: 'plugins/plugin-stack/containers/StackArticle',
  component: StackArticle,
  render: (args) => {
    const client = useClient();
    const space = client.spaces.get()[0];
    const collections = useQuery(space?.db, Filter.type(Collection.Collection));
    const collection = collections.find((collection) => collection.name === COLLECTION_NAME);
    return collection ? <StackArticle {...args} subject={collection} attendableId='test' /> : <></>;
  },
  decorators: [
    withLayout({ layout: 'column', classNames: 'dx-document' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Collection.Collection, Markdown.Document],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              const sections = ['Section One', 'Section Two', 'Section Three'].map((title) =>
                Ref.make(personalSpace.db.add(Markdown.make({ name: title, content: `# ${title}\n\nContent for ${title}.` }))),
              );
              personalSpace.db.add(Collection.make({ name: COLLECTION_NAME, objects: sections }));
            }),
        }),
        // NOTE: No content-surface plugin is loaded, so sections render the empty placeholder; this
        // story exercises the StackArticle/StackTile layout (toolbar, section tiles, rail menus).
      ],
    }),
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    role: AppSurface.Article.role,
    // The required `subject` is supplied by `render()` from the queried collection; this is just an args placeholder.
    subject: undefined as any,
  },
};
