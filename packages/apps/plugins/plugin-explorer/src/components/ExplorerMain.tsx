//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { type SpacePluginProvides } from '@braneframe/plugin-space';
import { type View as ViewType } from '@braneframe/types';
import { findPlugin, usePlugins } from '@dxos/app-framework';
import { type PluginComponentProps } from '@dxos/app-framework';
import { type TypedObject } from '@dxos/client/echo';
import { Grid, SVG, SVGContextProvider, Zoom } from '@dxos/gem-core';
import { Graph, type GraphLayoutNode, Markers } from '@dxos/gem-spore';
import { Main } from '@dxos/react-ui';
import { baseSurface, coarseBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { EchoGraphModel } from './EchoGraphModel';

type Slots = {
  root?: { className?: string };
  grid?: { className?: string };
};

const slots: Slots = {};

export const ExplorerMain = ({ data }: PluginComponentProps<ViewType>) => {
  // TODO(burdon): Get from node.
  const { plugins } = usePlugins();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides?.space.active;
  const model = useMemo(() => (space ? new EchoGraphModel().open(space) : undefined), [space]);

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, coarseBlockPaddingStart]}>
      <SVGContextProvider>
        <SVG className={slots?.root?.className}>
          <Markers arrowSize={6} />
          <Grid className={slots?.grid?.className} />
          <Zoom extent={[1, 4]}>
            <Graph
              model={model}
              drag
              arrows
              labels={{
                text: (node: GraphLayoutNode<TypedObject>) => {
                  return node.data?.label ?? node.data?.title ?? node.data?.name;
                },
              }}
            />
          </Zoom>
        </SVG>
      </SVGContextProvider>
    </Main.Content>
  );
};
