//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import React, { useMemo } from 'react';

import { Box } from '@mui/material';

import { Item, ItemID, ObjectModel } from '@dxos/client';
import { Grid, SVG, SVGContextProvider, Zoom, useSvgContext } from '@dxos/gem-core';
import { defaultGraphStyles, Graph, GraphLayoutNode, GraphForceProjector, Markers } from '@dxos/gem-spore';
import { useDynamicRef } from '@dxos/react-async';
import { ItemAdapter } from '@dxos/react-client-testing';

import { EchoGraphModel } from './model.js';

export interface EchoGraphProps {
  model?: EchoGraphModel
  selected?: Set<ItemID>
  itemAdapter: ItemAdapter
  styles?: any
  options?: {
    grid?: boolean
  }
}

export const EchoGraph = ({
  model,
  selected,
  itemAdapter,
  styles,
  options = {}
}: EchoGraphProps) => {
  const context = useSvgContext();
  const projector = useMemo(() => new GraphForceProjector(context, {
    forces: {
      radial: {
        strength: 0.02
      }
    }
  }), []);

  // TODO(burdon): Hack for stale callback.
  const selectedRef = useDynamicRef<Set<ItemID> | undefined>(() => selected, [selected]);
  const getAttributes = (node: GraphLayoutNode<Item<ObjectModel>>) => {
    const selected = selectedRef.current;
    return {
      class: selected?.size
        ? (selected?.has(node.id) ? 'selected' : 'undefined')
        : node.data!.type!.replaceAll(/\W/g, '_')
    };
  };

  return (
    <Box
      className={styles}
      sx={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        height: '100%'
      }}
    >
      <SVGContextProvider>
        <SVG>
          <Markers />
          {options.grid !== false && (
            <Grid axis />
          )}
          <Zoom>
            <Graph
              className={clsx(defaultGraphStyles, styles)}
              arrows
              drag
              model={model}
              projector={projector}
              attributes={{
                node: (node: GraphLayoutNode<Item<ObjectModel>>) => getAttributes(node)
              }}
              labels={{
                text: (node: GraphLayoutNode<Item<ObjectModel>>, highlight) => highlight ? itemAdapter.title(node.data!) : undefined
              }}
            />
          </Zoom>
        </SVG>
      </SVGContextProvider>
    </Box>
  );
};
