//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { MessageType, ThreadType } from '@braneframe/types';
import { faker } from '@dxos/random';
import { type PublicKey } from '@dxos/react-client';
import { Filter, useQuery, useSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { ClientRepeater } from '@dxos/react-client/testing';
import { Tooltip } from '@dxos/react-ui';
import { withFullscreen, withTheme } from '@dxos/storybook-utils';

import { CommentsContainer } from './CommentsContainer';
import { createCommentThread } from './testing';
import translations from '../translations';

faker.seed(1);

const Story = ({ spaceKey }: { spaceKey: PublicKey }) => {
  const identity = useIdentity();
  const space = useSpace(spaceKey);
  const threads = useQuery(space, Filter.schema(ThreadType));
  const [detached, setDetached] = useState<string[]>([]);

  useEffect(() => {
    if (identity && space) {
      const t = setTimeout(async () => {
        space.db.add(createCommentThread(identity));
        const thread = space.db.add(createCommentThread(identity));
        setDetached([thread.id]);
      });

      return () => clearTimeout(t);
    }
  }, [identity, space]);

  if (!identity || !space || !threads) {
    return null;
  }

  // TODO(wittjosiah): Include Tooltip.Provider in `withTheme` decorator?
  return (
    <Tooltip.Provider>
      <div className='flex justify-center overflow-y-auto bg-white dark:bg-black'>
        <div className='flex flex-col w-[400px]'>
          <CommentsContainer threads={threads} detached={detached} onThreadDelete={console.log} />
        </div>
      </div>
    </Tooltip.Provider>
  );
};

export default {
  title: 'plugin-thread/Comments',
  // TODO(wittjosiah): Register schemas.
  render: () => <ClientRepeater component={Story} createIdentity createSpace types={[ThreadType, MessageType]} />,
  decorators: [withTheme, withFullscreen()],
  parameters: { translations },
};

export const Default = {};
