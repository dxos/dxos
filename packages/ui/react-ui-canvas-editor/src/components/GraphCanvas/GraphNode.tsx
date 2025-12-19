//
// Copyright 2024 DXOS.org
//

import { Handle, type Node, type NodeProps, Position } from '@xyflow/react';
import React, { memo } from 'react';

import { raise } from '@dxos/debug';
import { useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useEditorContext } from '../../hooks';
import { type Polygon } from '../../types';

export type GraphNodeProps = NodeProps<Node<Polygon>>;

export const GraphNode = memo(({ data, selected }: GraphNodeProps) => {
  const { registry } = useEditorContext();
  const { themeMode } = useThemeContext();

  const shape = data;
  const { component: Component } =
    registry.getShapeDef(shape.type) ?? raise(new Error(`ShapeDef not found for ${shape.type}`));

  // TODO(burdon): Map anchors to Handles.
  // For now, we wrap the component.

  return (
    <div className={mx('relative group', selected && 'ring-2 ring-primary-500', themeMode === 'dark' ? 'dark' : '')}>
      {Component && <Component shape={shape} />}
      {/* Example handles - these should be dynamic based on anchors */}
      <Handle type='target' position={Position.Top} className='opacity-0 group-hover:opacity-100' />
      <Handle type='source' position={Position.Bottom} className='opacity-0 group-hover:opacity-100' />
    </div>
  );
});
