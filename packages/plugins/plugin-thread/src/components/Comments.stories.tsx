//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React, { useEffect } from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, Query, Relation, Type } from '@dxos/echo';
import { faker } from '@dxos/random';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { type ClientRepeatedComponentProps, ClientRepeater } from '@dxos/react-client/testing';
import { AnchoredTo, DataType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { CommentsContainer } from './CommentsContainer';
import { createCommentThread } from './testing';
import translations from '../translations';
import { ThreadType } from '../types';

faker.seed(1);

const Story = ({ spaceKey }: ClientRepeatedComponentProps) => {
  const identity = useIdentity();
  const space = useSpace(spaceKey);
  const anchors = useQuery(space, Query.type(AnchoredTo));

  useEffect(() => {
    if (identity && space) {
      const t = setTimeout(async () => {
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
      });

      return () => clearTimeout(t);
    }
  }, [identity, space]);

  if (!identity || !space || !anchors) {
    return null;
  }

  return (
    <div className='flex justify-center overflow-y-auto bg-white dark:bg-black'>
      <div className='flex flex-col w-[30rem]'>
        <CommentsContainer anchors={anchors} onThreadDelete={console.log} />
      </div>
    </div>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-thread/Comments',
  // TODO(wittjosiah): Use decorator.
  render: () => <ClientRepeater component={Story} createIdentity createSpace types={[ThreadType, DataType.Message]} />,
  decorators: [
    withTheme,
    withLayout({ fullscreen: true }),
    withPluginManager({
      plugins: [IntentPlugin()],
    }),
  ],
  parameters: { translations },
};

export default meta;

export const Default = {};
