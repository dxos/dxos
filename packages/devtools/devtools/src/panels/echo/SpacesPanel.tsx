//
// Copyright 2020 DXOS.org
//

import React, { useMemo } from 'react';

import { humanize } from '@dxos/util';

import { DetailsTable } from '../../components';
import { SpaceToolbar } from '../../containers';
import { useDevtoolsState } from '../../hooks';

// TODO(burdon): Show master/detail table with currently selected.
const SpacesPanel = () => {
  const { spaceInfo: metadata } = useDevtoolsState();
  const object = useMemo(() => {
    if (!metadata) {
      return undefined;
    }

    // TODO(burdon): List feeds and nav.
    return {
      id: metadata.key.truncate(4),
      name: humanize(metadata?.key),
      open: metadata.isOpen ? 'true' : 'false', // TODO(burdon): Checkbox.
      timeframe: JSON.stringify(metadata?.timeframe?.frames), // TODO(mykola): Display in a better way.
      genesisFeed: humanize(metadata?.genesisFeed),
      controlFeed: humanize(metadata?.controlFeed),
      dataFeed: humanize(metadata?.dataFeed)
    };
  }, [metadata]);

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <SpaceToolbar />
      <div className='flex flex-1 flex-col w-2/3 overflow-auto'>
        {object && <DetailsTable object={object} expand />}
      </div>
    </div>
  );
};

export default SpacesPanel;
