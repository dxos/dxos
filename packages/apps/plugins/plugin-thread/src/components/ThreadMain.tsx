//
// Copyright 2023 DXOS.org
//

import differenceInSeconds from 'date-fns/differenceInSeconds';
import React, { FC } from 'react';

import { Thread as ThreadType } from '@braneframe/types';
import { Main } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';
import { PublicKey, SpaceProxy } from '@dxos/client';
import { useIdentity } from '@dxos/react-client';

import { ThreadChannel } from './ThreadChannel';

// TODO(burdon): Goals.
// - Navigate via single column which may be visible in the sidebar of another content block (e.g., document).
// - Lightweight threads for document comments.

export const ThreadMain: FC<{ data: [SpaceProxy, ThreadType] }> = ({ data: [_, thread] }) => {
  const identity = useIdentity(); // TODO(burdon): Requires context for storybook?
  const identityKey = identity!.identityKey.toHex();
  // const identityKey = PublicKey.random().toHex();

  // TODO(burdon): Change to model.
  const handleAddMessage = (text: string) => {
    const message = {
      timestamp: new Date().toISOString(),
      text,
    };

    // Update current block if same user and time > 3m.
    const period = 3 * 60; // TODO(burdon): Config.
    const block = thread.blocks[thread.blocks.length - 1];
    if (block?.identityKey && PublicKey.equals(block.identityKey, identityKey)) {
      const previous = block.messages[block.messages.length - 1];
      if (
        previous.timestamp &&
        differenceInSeconds(new Date(message.timestamp), new Date(previous.timestamp)) < period
      ) {
        block.messages.push(message);
        return true;
      }
    }

    thread.blocks.push(
      new ThreadType.Block({
        identityKey,
        messages: [message],
      }),
    );

    // TODO(burdon): Scroll to bottom.
    return true;
  };

  return (
    <Main.Content
      classNames={mx(
        'flex flex-col grow min-bs-[100vh] h-full overflow-hidden items-center',
        'absolute left-0 right-0', // TODO(burdon): Check.
      )}
    >
      <ThreadChannel thread={thread} onAddMessage={handleAddMessage} />
    </Main.Content>
  );
};
