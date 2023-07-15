//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { Thread as ThreadType } from '@braneframe/types';
import { Main } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';
import { PublicKey, SpaceProxy } from '@dxos/client';
// import { useIdentity } from '@dxos/react-client';

import { ThreadChannel } from './ThreadChannel';

export const ThreadMain: FC<{ data: [SpaceProxy, ThreadType] }> = ({ data: [_, thread] }) => {
  // const identity = useIdentity(); // TODO(burdon): Requires context for storybook?

  // TODO(burdon): Model.
  const handleAddMessage = (text: string) => {
    thread.blocks.push(
      new ThreadType.Block({
        messages: [
          {
            // TODO(burdon): Key type in proto.
            identityKey: PublicKey.random().toHex(),
            // identityKey: identity!.identityKey.toHex(),
            timestamp: new Date().toISOString(),
            text,
          },
        ],
      }),
    );

    // TODO(burdon): Scroll to bottom.
    return true;
  };

  // TODO(burdon): Different width form factors.
  return (
    <Main.Content
      classNames={mx(
        'flex flex-col grow min-bs-[100vh] h-full overflow-hidden items-center',
        'absolute left-0 right-0',
      )}
    >
      <ThreadChannel thread={thread} onAddMessage={handleAddMessage} />
    </Main.Content>
  );
};
