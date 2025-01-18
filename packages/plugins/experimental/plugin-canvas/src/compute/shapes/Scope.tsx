//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';
import { Icon } from '@dxos/react-ui';

import { ComputeShape, createAnchorId, type CreateShapeProps } from './defs';
import { createAnchorMap, type ShapeComponentProps, type ShapeDef } from '../../components';
import { DEFAULT_INPUT } from '../graph';
import { useComputeNodeState } from '../hooks';

export const ScopeShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('scope'),
  }),
);

export type ScopeShape = S.Schema.Type<typeof ScopeShape>;

export type CreateScopeProps = CreateShapeProps<ScopeShape>;

export const createScope = ({ id, ...rest }: CreateScopeProps): ScopeShape => ({
  id,
  type: 'scope',
  size: { width: 256, height: 256 },
  ...rest,
});

export const ScopeComponent = ({ shape }: ShapeComponentProps<ScopeShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const input = runtime.inputs[DEFAULT_INPUT];
  const active = input?.type === 'executed' ? input.value : false;

  return (
    <div className='flex w-full justify-center items-center'>
      <Icon icon='ph--waveform--regular' size={16} classNames={active && 'animate-pulse'} />
    </div>
  );
};

export const scopeShape: ShapeDef<ScopeShape> = {
  type: 'scope',
  name: 'Scope',
  icon: 'ph--waveform--regular',
  component: ScopeComponent,
  createShape: createScope,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('input')]: { x: -1, y: 0 } }),
};
