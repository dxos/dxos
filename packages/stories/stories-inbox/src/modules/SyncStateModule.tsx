//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { type Database } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
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
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>Sync State</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='flex flex-col gap-2 p-2 text-sm overflow-auto'>
        <JsonHighlighter data={syncState ?? {}} />
      </Panel.Content>
    </Panel.Root>
  );
};
