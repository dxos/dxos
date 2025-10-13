//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useAppGraph } from '@dxos/app-framework';
import { useActions } from '@dxos/plugin-graph';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { useAttention } from '@dxos/react-ui-attention';
import { StackItem } from '@dxos/react-ui-stack';

import { type DiagramType, type SketchSettingsProps } from '../types';

import { Sketch } from './Sketch';

export type SketchContainerProps = {
  role: string;
  sketch: DiagramType;
  settings: SketchSettingsProps;
};

export const SketchContainer = ({ role, sketch, settings }: SketchContainerProps) => {
  const id = fullyQualifiedId(sketch);
  const { hasAttention } = useAttention(id);

  const props = {
    readonly: role === 'slide',
    autoZoom: role === 'section' ? true : undefined,
    maxZoom: role === 'slide' ? 1.5 : undefined,
  };

  // TODO(wittjosiah): Genericize tldraw toolbar actions w/ graph.
  const { graph } = useAppGraph();
  const actions = useActions(graph, fullyQualifiedId(sketch));
  const handleThreadCreate = actions.find((action) => action.id === `${fullyQualifiedId(sketch)}/comment`)?.data;

  return (
    <StackItem.Content size={role === 'section' ? 'square' : 'intrinsic'}>
      <Sketch
        // Force instance per sketch object. Otherwise, sketch shares the same instance.
        key={id}
        classNames='attention-surface'
        sketch={sketch}
        hideUi={!hasAttention}
        settings={settings}
        onThreadCreate={handleThreadCreate}
        {...props}
      />
    </StackItem.Content>
  );
};

export default SketchContainer;
