//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { TracePanel } from '@dxos/plugin-assistant/components';
import { type Space } from '@dxos/react-client/echo';
import { Next } from '@dxos/react-ui/next';

/**
 * Renders the assistant `TracePanel` (process tree + execution-graph timeline) for the story space.
 */
export const TraceModule = ({ data }: { data?: { attendableId?: string } }) => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }
  return <TraceModuleContainer space={space} attendableId={data?.attendableId} />;
};

const TraceModuleContainer = ({ space, attendableId }: { space: Space; attendableId?: string }) => {
  return (
    <Next.Panel.Root>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <Next.Toolbar.Text>Trace</Next.Toolbar.Text>
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body>
        <TracePanel space={space} attendableId={attendableId ?? space.id} />
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};
