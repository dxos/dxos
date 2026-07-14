//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { scheduleTaskInterval } from '@dxos/async';
import { Context } from '@dxos/context';
import { type Space, type SpaceSyncState } from '@dxos/react-client/echo';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

export const SyncStatePanel = ({ space }: { space?: Space }) => {
  const [syncState, setSyncState] = useState<SpaceSyncState>();

  useEffect(() => {
    if (!space) {
      setSyncState(undefined);
      return;
    }

    const ctx = new Context();
    space.internal.db.subscribeToSyncState(ctx, (state) => {
      setSyncState(structuredClone(state));
    });
    scheduleTaskInterval(
      ctx,
      async () => {
        setSyncState(structuredClone(await space.internal.db.getSyncState()));
      },
      1000,
    );

    return () => {
      void ctx.dispose();
    };
  }, [space]);

  return (
    <div className='flex flex-col w-[360px] shrink-0 h-full border-l border-neutral-500 dark:border-neutral-800 overflow-hidden'>
      <div className='p-2 text-xs font-bold'>Sync state</div>
      <div className='overflow-auto grow p-2'>
        {space ? <JsonHighlighter data={syncState ?? {}} /> : <div className='text-xs p-2'>No space selected</div>}
      </div>
    </div>
  );
};
