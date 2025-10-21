//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, Query, Relation, Type } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { faker } from '@dxos/random';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useAsyncEffect } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { AnchoredTo, DataType } from '@dxos/schema';
import { render } from '@dxos/storybook-utils';

import { translations } from '../translations';
import { ThreadType } from '../types';

import { CommentsContainer } from './CommentsContainer';
import { createCommentThread, createProposalThread } from './testing';

faker.seed(1);

const DefaultStory = () => {
  const identity = useIdentity();
  const space = useSpace();
  const anchors = useQuery(space, Query.type(AnchoredTo));

  useAsyncEffect(async () => {
    if (identity && space) {
      const object = space.db.add(Obj.make(Type.Expando, {}));
      const thread1 = space.db.add(createCommentThread(identity));
      const thread2 = space.db.add(createProposalThread(identity));
      space.db.add(
        Relation.make(AnchoredTo, {
          [Relation.Source]: thread1,
          [Relation.Target]: object,
          anchor: 'test',
        }),
      );
      space.db.add(
        Relation.make(AnchoredTo, {
          [Relation.Source]: thread2,
          [Relation.Target]: object,
          anchor: 'test',
        }),
      );
    }
  }, [identity, space]);

  if (!identity || !space || !anchors) {
    return null;
  }

  return <CommentsContainer anchors={anchors} onThreadDelete={console.log} onAcceptProposal={console.log} />;
};

const meta = {
  title: 'plugins/plugin-thread/Comments',
  render: render(DefaultStory),
  decorators: [
    withTheme,
    withLayout({ container: 'column', scroll: true }),
    // TODO(wittjosiah): This shouldn't depend on app framework (use withClientProvider instead).
    //  Currently this is required due to useOnEditAnalytics.
    withPluginManager({
      plugins: [
        IntentPlugin(),
        ClientPlugin({
          types: [DataType.Message, ThreadType, AnchoredTo],
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
          },
        }),
      ],
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
