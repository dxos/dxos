//
// Copyright 2024 DXOS.org
//

import React, { PropsWithChildren } from 'react';

import { type ObjectSurfaceProps } from '@dxos/app-toolkit/ui';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useActions } from '@dxos/plugin-graph';
import { Panel as DxPanel, Flex } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { isTauri } from '@dxos/util';

import { SketchComponent } from '../../components';
import { type Sketch, type Settings } from '#types';

export type SketchContainerProps = ObjectSurfaceProps<
  Sketch.Sketch,
  {
    settings: Settings.Settings;
  }
>;

export const SketchContainer = ({ role, attendableId, subject: sketch, settings }: SketchContainerProps) => {
  const id = Obj.getDXN(sketch).toString();
  const { hasAttention } = useAttention(attendableId);

  const props = {
    readonly: role === 'slide',
    autoZoom: role === 'section' ? true : undefined,
    maxZoom: role === 'slide' ? 1.5 : undefined,
  };

  // TODO(wittjosiah): Genericize tldraw toolbar actions w/ graph.
  const { graph } = useAppGraph();
  const actions = useActions(graph, id);
  const handleThreadCreate = actions.find((action) => action.id === `${id}/comment`)?.data;

  const sketchElement = (
    <SketchComponent
      // Force instance per sketch object. Otherwise, sketch shares the same instance.
      key={id}
      classNames='dx-attention-surface'
      sketch={sketch}
      // TODO(wittjosiah): Ensure attention works as expected on the mobile app.
      hideUi={!hasAttention && !isTauri()}
      settings={settings}
      onThreadCreate={handleThreadCreate}
      {...props}
    />
  );

  if (role === 'section') {
    return <Container>{sketchElement}</Container>;
  }

  return (
    <DxPanel.Root>
      <DxPanel.Content asChild>{sketchElement}</DxPanel.Content>
    </DxPanel.Root>
  );
};

const Container = (props: PropsWithChildren) => <Flex {...props} classNames='aspect-square' />;
