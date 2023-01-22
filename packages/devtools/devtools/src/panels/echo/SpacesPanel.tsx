//
// Copyright 2020 DXOS.org
//

import React, { useMemo } from 'react';

import { useDevtools, useStream } from '@dxos/react-client';
import { humanize } from '@dxos/util';

import { DetailsTable } from '../../components';
import { SpaceToolbar } from '../../containers';
import { useDevtoolsState } from '../../hooks';

// TODO(burdon): Show master/detail table with currently selected.
export const SpacesPanel = () => {
  const devtoolsHost = useDevtools();

  // TODO(burdon): Remove subscription.
  // TODO(burdon): Create hooks for devtools subscriptions; add to DevtoolsContext (and unsubscribe).
  const spaces = useStream(() => devtoolsHost.subscribeToSpaces({}), {}).spaces ?? [];

  const { space } = useDevtoolsState();
  const object = useMemo(() => {
    if (!space) {
      return undefined;
    }

    const spaceInfo = spaces.find((space) => space.key.equals(space.key))!;
    if (!spaceInfo) {
      return undefined;
    }

    // TODO(burdon): List feeds and nav.
    return space
      ? {
          id: space.key.truncate(4),
          name: humanize(space.key),
          open: spaceInfo.isOpen ? 'true' : 'false', // TODO(burdon): Checkbox.
          timeframe: spaceInfo.timeframe // TODO(burdon): Undefined.
        }
      : undefined;
  }, [space]);

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <SpaceToolbar />
      <div className='flex flex-1 flex-col w-2/3 overflow-auto'>
        {object && <DetailsTable object={object} expand />}
      </div>
    </div>
  );
};
