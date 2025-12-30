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
import { useDatabase, useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useAsyncEffect } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { render } from '@dxos/storybook-utils';
import { AnchoredTo, Message, Thread } from '@dxos/types';

import { translations } from '../translations';

import { CommentsContainer } from './CommentsContainer';
import { createCommentThread, createProposalThread } from './testing';

faker.seed(1);

const DefaultStory = () => {
  const identity = useIdentity();
  const db = useDatabase();
  const anchors = useQuery(db, Query.type(AnchoredTo.AnchoredTo));

  useAsyncEffect(async () => {
    if (identity && db) {
      const object = db.add(Obj.make(Type.Expando, {}));
      const thread1 = db.add(createCommentThread(identity));
      const thread2 = db.add(createProposalThread(identity));
      db.add(
        Relation.make(AnchoredTo.AnchoredTo, {
          [Relation.Source]: thread1,
          [Relation.Target]: object,
          anchor: 'test',
        }),
      );
      db.add(
        Relation.make(AnchoredTo.AnchoredTo, {
          [Relation.Source]: thread2,
          [Relation.Target]: object,
          anchor: 'test',
        }),
      );
    }
  }, [identity, db]);

  if (!identity || !db || !anchors) {
    return null;
  }

  return <CommentsContainer anchors={anchors} onThreadDelete={console.log} onAcceptProposal={console.log} />;
};

const meta = {
  title: 'plugins/plugin-thread/Comments',
  render: render(DefaultStory),
  decorators: [
    withTheme,
    withLayout({ layout: 'column', scroll: true }),
    // TODO(wittjosiah): This shouldn't depend on app framework (use withClientProvider instead).
    //  Currently this is required due to useOnEditAnalytics.
    withPluginManager({
      plugins: [
        IntentPlugin(),
        ClientPlugin({
          types: [Message.Message, Thread.Thread, AnchoredTo.AnchoredTo],
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
