//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useEffect } from 'react';

import { ThreadType } from '@braneframe/types';
import { faker } from '@dxos/random';
import { type PublicKey } from '@dxos/react-client';
import { Filter, useQuery, useSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { ClientRepeater } from '@dxos/react-client/testing';
import { Tooltip } from '@dxos/react-ui';
import { Thread } from '@dxos/react-ui-thread';
import { withTheme } from '@dxos/storybook-utils';

import { CommentsContainer } from './CommentsContainer';
import { createCommentThread } from './testing';
import translations from '../translations';

faker.seed(1);

const Story = ({ spaceKey }: { spaceKey: PublicKey }) => {
  const identity = useIdentity();
  const space = useSpace(spaceKey);
  const threads = useQuery(space, Filter.schema(ThreadType));
  const [detached, setDetached] = React.useState<string[]>([]);

  useEffect(() => {
    if (identity && space) {
      setTimeout(async () => {
        space.db.add(createCommentThread(identity));
        const thread = space.db.add(createCommentThread(identity));
        setDetached([thread.id]);
      });
    }
  }, [identity, space]);

  if (!identity || !space || !threads) {
    return null;
  }

  // TODO(wittjosiah): Include Tooltip.Provider in `withTheme` decorator?
  return (
    <Tooltip.Provider>
      <CommentsContainer threads={threads} detached={detached} onThreadDelete={console.log} />
    </Tooltip.Provider>
  );
};

export default {
  title: 'plugin-thread/Comments',
  component: Thread,
  // TODO(wittjosiah): Register schemas.
  render: () => <ClientRepeater component={Story} createIdentity createSpace />,
  decorators: [withTheme],
  parameters: { translations },
};

export const Default = {};
