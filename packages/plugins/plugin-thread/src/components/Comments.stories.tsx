//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, Query, Relation, Type } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { faker } from '@dxos/random';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useAsyncEffect } from '@dxos/react-ui';
import { AnchoredTo, DataType } from '@dxos/schema';
import { layoutCentered, render, withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../translations';
import { ThreadType } from '../types';

import { CommentsContainer } from './CommentsContainer';
import { createCommentThread } from './testing';

faker.seed(1);

const DefaultStory = () => {
  const identity = useIdentity();
  const space = useSpace();
  const anchors = useQuery(space, Query.type(AnchoredTo));

  useAsyncEffect(async () => {
    if (identity && space) {
      const object = space.db.add(Obj.make(Type.Expando, {}));
      const thread1 = space.db.add(createCommentThread(identity));
      const thread2 = space.db.add(createCommentThread(identity));
      space.db.add(
        Relation.make(AnchoredTo, {
          [Relation.Source]: thread1,
          [Relation.Target]: object,
        }),
      );
      space.db.add(
        Relation.make(AnchoredTo, {
          [Relation.Source]: thread2,
          [Relation.Target]: object,
        }),
      );
    }
  }, [identity, space]);

  if (!identity || !space || !anchors) {
    return null;
  }

  return (
    <div className='w-[30rem] overflow-y-auto bg-baseSurface'>
      <CommentsContainer anchors={anchors} onThreadDelete={console.log} />
    </div>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-thread/Comments',
  render: render(DefaultStory),
  decorators: [
    withTheme,
    withLayout({ fullscreen: true, classNames: layoutCentered }),
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
};

export default meta;

export const Default = {};
