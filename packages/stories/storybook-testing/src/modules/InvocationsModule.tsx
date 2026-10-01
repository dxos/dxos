//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Feed } from '@dxos/echo';
import { Next } from '@dxos/react-ui';

export const InvocationsModule = () => {
  const space = useActiveSpace();
  const feed = space?.properties.invocationTraceFeed?.target;
  const feedDXN = feed ? Feed.getFeedUri(feed) : undefined;

  return (
    <Next.Panel.Root>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <Next.Toolbar.Text>Invocations</Next.Toolbar.Text>
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body>
        <InvocationTraceContainer db={space?.db} feedDXN={feedDXN} detailAxis='block' />
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};
