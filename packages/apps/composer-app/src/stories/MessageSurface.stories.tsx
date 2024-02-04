//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { ThreadContainer } from '@braneframe/plugin-thread';
import { WildcardContent } from '@braneframe/plugin-wildcard';
import { type Thread as ThreadType, types } from '@braneframe/types';
import { SurfaceProvider } from '@dxos/app-framework';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { ClientRepeater } from '@dxos/react-client/testing';
import { Mosaic } from '@dxos/react-ui-mosaic';
import { withTheme } from '@dxos/storybook-utils';

import { createChatThread } from './testing';
import translations from '../translations';

faker.seed(1);

const Story = () => {
  const client = useClient();
  const identity = useIdentity();
  const [space, setSpace] = useState<Space>();
  const [thread, setThread] = useState<ThreadType | null>();

  useEffect(() => {
    if (identity) {
      setTimeout(async () => {
        const space = await client.spaces.create();
        const thread = space.db.add(createChatThread(identity));
        setSpace(space);
        setThread(thread);
      });
    }
  }, [identity]);

  if (!identity || !thread) {
    return null;
  }

  return (
    <SurfaceProvider
      value={{
        components: {
          Wildcard: (props) => {
            return <WildcardContent object={props.data} debug />;
          },
        },
      }}
    >
      <Mosaic.Root>
        <main className='max-is-prose mli-auto'>{space && <ThreadContainer thread={thread} space={space} />}</main>
        <Mosaic.DragOverlay />
      </Mosaic.Root>
    </SurfaceProvider>
  );
};

export default {
  title: 'composer-app/MessageSurface',
  component: ThreadContainer,
  render: () => <ClientRepeater Component={Story} types={types} createIdentity createSpace />,
  decorators: [withTheme],
  parameters: { translations, layout: 'fullscreen' },
};

export const Default = {};
