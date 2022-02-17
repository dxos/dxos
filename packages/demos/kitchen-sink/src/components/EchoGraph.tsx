//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import React from 'react';
import { css } from '@emotion/css';
import { Box } from '@mui/material';

import { Item } from '@dxos/echo-db';
import { Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
import { defaultGraphStyles, Graph, GraphLayoutNode, Markers } from '@dxos/gem-spore';
import { ObjectModel } from '@dxos/object-model';

const styles = css`
  g.node {
    &.example_type_org {
      circle {
        fill: orange;
      }
    }
    &.example_type_person {
      circle {
        fill: green;
      }
    }
    &.example_type_project {
      circle {
        fill: cornflowerblue;
      }
    }
    &.example_type_task {
    }
  }
`;

export interface EchoGraphProps {
}

export const EchoGraph = ({
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
              attributes={{
                node: (node: GraphLayoutNode<Item<ObjectModel>>) => ({
                  class: node.data!.type!.replaceAll(/\W/g, '_')
                })
              }}
              labels={{
                text: (node: GraphLayoutNode<Item<ObjectModel>>, highlight) =>
                  highlight ? node.data!.model.getProperty('title') : undefined
              }}
            />
          </Zoom>
        </SVG>
      </SVGContextProvider>
    </Box>
  );
};
