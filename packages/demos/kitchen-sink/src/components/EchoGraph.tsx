//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import React from 'react';
import { css } from '@emotion/css';
import { Box } from '@mui/material';

import { Event } from '@dxos/async';
import { Item } from '@dxos/echo-db';
import { Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
import { defaultGraphStyles, Graph, GraphData, GraphModel, GraphNode, Markers } from '@dxos/gem-spore';
import { ObjectModel } from '@dxos/object-model';

const styles = css``;

class EchoGraphModel implements GraphModel<Item<any>> {
  readonly updated = new Event<GraphData<Item<any>>>();

  get graph () {
    return {
      nodes: [],
      links: []
    }
  }

  subscribe (callback: (graph: GraphData<Item<any>>) => void) {
    return this.updated.on(callback);
  }
}

export interface EchoGraphProps {
  model?: EchoGraphModel
}

export const EchoGraph = ({
  model = new EchoGraphModel()
}: EchoGraphProps) => {
  return (
    <Box sx={{
      display: 'flex',
      flex: 1
    }}>
      <SVGContextProvider>
        <SVG>
          <Markers />
          <Grid axis />
          <Zoom>
            <Graph
              className={clsx(defaultGraphStyles, styles)}
              arrows
              drag
              model={model}
              classes={{
                node: (node: GraphNode<Item<ObjectModel>>) => node.data!.type!.replaceAll(/\W/g, '_')
              }}
              labels={{
                text: (node: GraphNode<Item<ObjectModel>>, highlight) =>
                  highlight ? node.data!.model.getProperty('title') : undefined
              }}
            />
          </Zoom>
        </SVG>
      </SVGContextProvider>
    </Box>
  );
};
