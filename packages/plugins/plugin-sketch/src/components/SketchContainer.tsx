//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useActions } from '@dxos/plugin-graph';
import { useAttention } from '@dxos/react-ui-attention';
import { Layout, type LayoutFlexProps } from '@dxos/react-ui-mosaic';
import { isTauri } from '@dxos/util';

import { type Diagram, type SketchSettingsProps } from '../types';

import { Sketch } from './Sketch';

export type SketchContainerProps = SurfaceComponentProps<
  Diagram.Diagram,
  {
    settings: SketchSettingsProps;
  }
>;

export const SketchContainer = ({ role, subject: sketch, settings }: SketchContainerProps) => {
  const id = Obj.getDXN(sketch).toString();
  const { hasAttention } = useAttention(id);

  const props = {
    readonly: role === 'slide',
    autoZoom: role === 'section' ? true : undefined,
    maxZoom: role === 'slide' ? 1.5 : undefined,
  };

  // TODO(wittjosiah): Genericize tldraw toolbar actions w/ graph.
  const { graph } = useAppGraph();
  const actions = useActions(graph, id);
  const handleThreadCreate = actions.find((action) => action.id === `${id}/comment`)?.data;

  const Root = role === 'section' ? Container : Layout.Main;

  return (
    <Root>
      <Sketch
        // Force instance per sketch object. Otherwise, sketch shares the same instance.
        key={id}
        classNames='attention-surface'
        sketch={sketch}
        // TODO(wittjosiah): Ensure attention works as expected on the mobile app.
        hideUi={!hasAttention && !isTauri()}
        settings={settings}
        onThreadCreate={handleThreadCreate}
        {...props}
      />
    </Root>
  );
};

const Container = (props: LayoutFlexProps) => <Layout.Flex {...props} classNames='aspect-square' />;

export default SketchContainer;
