//
// Copyright 2020 DXOS.org
//

import React, { useMemo } from 'react';

import { humanize } from '@dxos/util';

import { DetailsTable } from '../../components';
import { SpaceToolbar } from '../../containers';
import { useDevtoolsState } from '../../hooks';

// TODO(burdon): Show master/detail table with currently selected.
export const SpacesPanel = () => {
  const { space, spaceInfo: metadata } = useDevtoolsState();
  const object = useMemo(() => {
    if (!space) {
      return undefined;
    }

    // TODO(burdon): List feeds and nav.
    return space
      ? {
          id: space.key.truncate(4),
          name: humanize(space.key),
          open: space.isOpen ? 'true' : 'false', // TODO(burdon): Checkbox.
          timeframe: metadata?.timeframe, // TODO(burdon): Undefined.
          controlFeed: metadata?.controlFeed,
          genesisFeed: metadata?.genesisFeed,
          dataFeed: metadata?.dataFeed
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
