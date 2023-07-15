//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { Thread as ThreadType } from '@braneframe/types';
import { Main } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';
import { PublicKey, SpaceProxy } from '@dxos/client';
import { observer } from '@dxos/react-client';
import { humanize } from '@dxos/util';

import { ThreadBlock } from './ThreadBlock';
import { ThreadInput } from './ThreadInput';

// TODO(burdon): Make observer generic.
export const ThreadMain: FC<{ data: [SpaceProxy, ThreadType] }> = observer(({ data }) => {
  const thread = data[1];

  // TODO(burdon): Resolve username (and avatar) from identityKey.
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-orange-500', 'bg-purple-500'];
  const getBlockProperties = (identityKey: PublicKey) => ({
    displayName: humanize(identityKey),
    classes: ['text-white', colors[Number('0x' + identityKey) % colors.length]].join(' '),
  });

  // TODO(burdon): Model.
  const handleAddMessage = (text: string) => {
    // TODO(burdon): Not updated. observer()?
    thread.blocks.push(
      new ThreadType.Block({
        messages: [{ text }],
      }),
    );

    return true;
  };

  // TODO(burdon): Different width form factors.
  return (
    <Main.Content classNames='flex flex-col grow min-bs-[100vh] overflow-hidden items-center pb-8'>
      <div
        className={mx(
          'flex flex-col w-full min-w-[300px] md:max-w-[480px] h-full overflow-hidden',
          'p-4 m-2 bg-zinc-50 dark:bg-neutral-800',
        )}
      >
        <div className='flex grow overflow-hidden'>
          {/* TODO(burdon): Scroll panel. */}
          <div className='flex flex-col-reverse overflow-auto py-4 px-4'>
            {thread.blocks
              .map((block) => (
                <div key={block.id} className='my-2'>
                  <ThreadBlock block={block} getBlockProperties={getBlockProperties} />
                </div>
              ))
              .reverse()}
          </div>
        </div>
        <ThreadInput onMessage={handleAddMessage} />
      </div>
    </Main.Content>
  );
});
