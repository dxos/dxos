//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { type Database } from '@dxos/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { type ModuleProps } from '@dxos/story-modules';

/**
 * Renders the space database's EDGE sync state (Automerge document counts and feed block backlogs)
 * as live JSON, driven by {@link Database.subscribeToSyncState}.
 */
export const SyncStateModule = ({ space }: ModuleProps) => {
  const [syncState, setSyncState] = useState<Database.SyncState>();

  useEffect(() => {
    console.log('getSyncState');
    void space.db.getSyncState().then(setSyncState);
    return space.db.subscribeToSyncState(setSyncState);
  }, [space.db]);

  console.log('syncState', syncState);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>Sync State</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content className='flex flex-col gap-2 p-2 text-sm overflow-auto'>
        <JsonHighlighter data={syncState ?? {}} />
      </Panel.Content>
    </Panel.Root>
  );
};
