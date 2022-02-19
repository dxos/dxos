//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import React, { useMemo, useEffect, useRef } from 'react';

import { Box } from '@mui/material';

import { Item } from '@dxos/echo-db';
import { ItemID } from '@dxos/echo-protocol';
import { Grid, SVG, SVGContextProvider, Zoom, useSvgContext } from '@dxos/gem-core';
import { defaultGraphStyles, Graph, GraphLayoutNode, GraphForceProjector, Markers } from '@dxos/gem-spore';
import { ObjectModel } from '@dxos/object-model';

import { ItemAdapter } from '../adapter';
import { EchoGraphModel } from './model';

export interface EchoGraphProps {
  model?: EchoGraphModel
  selected?: Set<ItemID>
  itemAdapter: ItemAdapter
  styles?: any
}

export const EchoGraph = ({
  model,
  selected,
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

  // TODO(burdon): Update Graph renderer on mutation.
  // TODO(burdon): Hack!
  const selectedRef = useRef<Set<ItemID>>();
  useEffect(() => {
    selectedRef.current = selected;
    model?.refresh();
  }, [selected])

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
                node: (node: GraphLayoutNode<Item<ObjectModel>>) => getAttributes(node)
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
