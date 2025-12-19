//
// Copyright 2024 DXOS.org
//

import { Handle, type HandleProps, type Node, type NodeProps, Position } from '@xyflow/react';
import React, { memo, useCallback } from 'react';

import { raise } from '@dxos/debug';
import { mx } from '@dxos/react-ui-theme';

import { useEditorContext } from '../../hooks';
import { type Polygon } from '../../types';

export type GraphNodeProps = NodeProps<Node<Polygon>>;

export const GraphNode = memo(({ data, selected }: GraphNodeProps) => {
  const { registry } = useEditorContext();
  const { component: Component } =
    registry.getShapeDef(data.type) ?? raise(new Error(`ShapeDef not found for ${data.type}`));

  const handleConnect = useCallback<NonNullable<HandleProps['onConnect']>>(() => {
    console.log('handleConnect', data);
  }, [data]);

  return (
    <div
      className={mx(
        'relative group bg-groupSurface rounded-sm border border-separator bs-[64px] is-[128px]',
        selected && 'ring-1 ring-primary-500',
      )}
    >
      {Component && <Component shape={data} />}
      <Handle type='source' position={Position.Right} onConnect={handleConnect} />
      <Handle type='target' position={Position.Left} onConnect={handleConnect} />
    </div>
  );
});
