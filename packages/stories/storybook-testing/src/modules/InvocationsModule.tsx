//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Feed } from '@dxos/echo';
import { Panel, Toolbar } from '@dxos/react-ui';

export const InvocationsModule = () => {
  const space = useActiveSpace();
  const feed = space?.properties.invocationTraceFeed?.target;
  const feedDXN = feed ? Feed.getFeedUri(feed) : undefined;

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>Invocations</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <InvocationTraceContainer db={space?.db} feedDXN={feedDXN} detailAxis='block' />
      </Panel.Content>
    </Panel.Root>
  );
};
