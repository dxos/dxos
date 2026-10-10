//
// Copyright 2025 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/app-toolkit/Hooks';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Feed } from '@dxos/echo';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

export const InvocationsModule = () => {
  const space = Hooks.useActiveSpace();
  const feed = space?.properties.invocationTraceFeed?.target;
  const feedDXN = feed ? Feed.getFeedUri(feed) : undefined;

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Invocations</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        <InvocationTraceContainer db={space?.db} feedDXN={feedDXN} detailAxis='block' />
      </Panel.Body>
    </Panel.Root>
  );
};
