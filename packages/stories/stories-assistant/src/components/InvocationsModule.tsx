//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { InvocationTraceContainer } from '@dxos/devtools';
import { Feed } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { Panel, Toolbar } from '@dxos/react-ui';

export const InvocationsModule = ({ space }: { space: Space }) => {
  const feed = space?.properties.invocationTraceFeed?.target;
  const feedDXN = feed ? Feed.getFeedUri(feed) : undefined;
  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>Invocations</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='flex min-h-[20rem] items-center justify-center'>
        <InvocationTraceContainer db={space?.db} feedDXN={feedDXN} detailAxis='block' />
      </Panel.Content>
    </Panel.Root>
  );
};
