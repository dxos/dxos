//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { MessageType, ThreadType } from '@dxos/plugin-space/types';
import { faker } from '@dxos/random';
import { Filter, fullyQualifiedId, useQuery, useSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { type ClientRepeatedComponentProps, ClientRepeater } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { CommentsContainer } from './CommentsContainer';
import { createCommentThread } from './testing';
import translations from '../translations';

faker.seed(1);

const Story = ({ spaceKey }: ClientRepeatedComponentProps) => {
  const identity = useIdentity();
  const space = useSpace(spaceKey);
  const threads = useQuery(space, Filter.schema(ThreadType));
  const [detached, setDetached] = useState<string[]>([]);

  useEffect(() => {
    if (identity && space) {
      const t = setTimeout(async () => {
        space.db.add(createCommentThread(identity));
        const thread = space.db.add(createCommentThread(identity));
        setDetached([fullyQualifiedId(thread)]);
      });

      return () => clearTimeout(t);
    }
  }, [identity, space]);

  if (!identity || !space || !threads) {
    return null;
  }

  return (
    <div className='flex justify-center overflow-y-auto bg-white dark:bg-black'>
      <div className='flex flex-col w-[400px]'>
        <CommentsContainer threads={threads} detached={detached} onThreadDelete={console.log} />
      </div>
    </div>
  );
};

export const Default = {};

const meta: Meta = {
  title: 'plugins/plugin-thread/Comments',
  // TODO(wittjosiah): Use decorator.
  render: () => <ClientRepeater component={Story} createIdentity createSpace types={[ThreadType, MessageType]} />,
  decorators: [withTheme, withLayout({ fullscreen: true, tooltips: true })],
  parameters: { translations },
};

export default meta;
