//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { Document, id } from '@dxos/echo-schema';
import { GraphData, GraphModel } from '@dxos/gem-spore';
import { Plexus } from '@dxos/plexus';

import '@dxosTheme';

import { FullScreen } from '../testing';

// TODO(burdon): Create GraphNode to shadow Document? or use real objects with accessors.
export class EchoGraphModel extends GraphModel<Document> {
  constructor() {
    super((object: Document) => object[id]);
  }

  get graph(): GraphData<Document> {
    return {
      nodes: [],
      links: []
    };
  }
}

// TODO(burdon): Create profile, space, etc.
const StoryContainer = () => {
  const model = useMemo(() => new EchoGraphModel(), []);
  return <Plexus model={model} />;
};

export default {
  component: Plexus,
  decorators: [FullScreen],
  parameters: {
    layout: 'fullscreen'
  }
};

export const Default = () => <StoryContainer />;
