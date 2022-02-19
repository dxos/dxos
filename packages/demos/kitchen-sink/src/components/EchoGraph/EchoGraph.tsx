//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import React, { useMemo } from 'react';

import { Box } from '@mui/material';

import { Item } from '@dxos/echo-db';
import { Grid, SVG, SVGContextProvider, Zoom, useSvgContext } from '@dxos/gem-core';
import { defaultGraphStyles, Graph, GraphLayoutNode, GraphForceProjector, Markers } from '@dxos/gem-spore';
import { ObjectModel } from '@dxos/object-model';

import { ItemAdapter } from '../adapter';
import { EchoGraphModel } from './model';

export interface EchoGraphProps {
  model?: EchoGraphModel
  itemAdapter: ItemAdapter
  styles?: any
}

export const EchoGraph = ({
  model,
  itemAdapter,
  styles
}: EchoGraphProps) => {
  const context = useSvgContext();
  const projector = useMemo(() => new GraphForceProjector(context, {
    forces: {
      radial: {
        strength: 0.02
      }
    }
  }), []);

  return (
    <Box
      className={styles}
      sx={{
        display: 'flex',
        flex: 1
      }}
    >
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
              projector={projector}
              attributes={{
                node: (node: GraphLayoutNode<Item<ObjectModel>>) => ({
                  class: node.data!.type!.replaceAll(/\W/g, '_')
                })
              }}
              labels={{
                text: (node: GraphLayoutNode<Item<ObjectModel>>, highlight) => {
                  return highlight ? itemAdapter.title(node.data!) : undefined;
                }
              }}
            />
          </Zoom>
        </SVG>
      </SVGContextProvider>
    </Box>
  );
};
