//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { GraphData, GraphModel, GraphNode } from '@dxos/gem-spore';
import { Plexus, PlexusStateContext } from '@dxos/plexus';

import '@dxosTheme';

// TODO(burdon): Create GraphNode to shadow Document? or use real objects with accessors.
class EchoModel extends GraphModel<GraphNode> {
  get graph(): GraphData<GraphNode> {
    return {
      nodes: [],
      links: []
    };
  }
}

// TODO(burdon): Create profile, space, etc.
const Test = () => {
  const model = useMemo(() => new EchoModel(), []);
  return (
    <PlexusStateContext.Provider value={{}}>
      <Plexus model={model} />
    </PlexusStateContext.Provider>
  );
};

export default {
  component: Test,
  parameters: {
    layout: 'fullscreen'
  }
};

export const Default = () => {
  return (
    <div className='flex flex-col'>
      <Test />
    </div>
  );
};
