//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { DevtoolsContextProvider, InvocationTraceContainer } from '@dxos/devtools';
import { Feed } from '@dxos/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { type ModuleProps } from '@dxos/story-modules';

export const InvocationsModule = ({ space }: ModuleProps) => {
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
        {/* `InvocationTraceContainer` reads the devtools context, which the deck normally provides. */}
        <DevtoolsContextProvider>
          <InvocationTraceContainer db={space?.db} feedDXN={feedDXN} detailAxis='block' />
        </DevtoolsContextProvider>
      </Panel.Content>
    </Panel.Root>
  );
};
