//
// Copyright 2025 DXOS.org
//

import { Handle, Position } from '@xyflow/react';
import React, { memo } from 'react';

import { type NodeType } from './Chain';

/**
 * https://reactflow.dev/examples/styling/tailwind
 */
const CustomNodeComponent = ({ data }: { data: NodeType['data'] }) => {
  return (
    <div className='is-20 p-2 border border-separator rounded-sm shadow bg-inputSurface'>
      <div className='flex grow justify-center'>{data.label}</div>

      <Handle type='target' position={Position.Top} className='border rounded-full' />
      <Handle type='source' position={Position.Bottom} className='border rounded-full' />
    </div>
  );
};

export const CustomNode = memo(CustomNodeComponent);
