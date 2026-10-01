//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { type Database } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { Next } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

/**
 * Renders the space database's EDGE sync state (Automerge document counts and feed block backlogs)
 * as live JSON, driven by {@link Database.subscribeToSyncState}.
 */
export const SyncStateModule = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }
  return <SyncStateModuleContainer space={space} />;
};

const SyncStateModuleContainer = ({ space }: { space: Space }) => {
  const [syncState, setSyncState] = useState<Database.SyncState>();

  useEffect(() => {
    void space.db.getSyncState().then(setSyncState);
    return space.db.subscribeToSyncState(setSyncState);
  }, [space.db]);

  return (
    <Next.Panel.Root>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <Next.Toolbar.Text>Sync State</Next.Toolbar.Text>
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body classNames='flex flex-col gap-2 p-2 text-sm overflow-auto'>
        <JsonHighlighter data={syncState ?? {}} />
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};
