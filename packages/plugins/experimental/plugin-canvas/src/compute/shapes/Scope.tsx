//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { DEFAULT_INPUT } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';

import { useAudioStream, Chaos, shaderOptions } from './common';
import { ComputeShape, createAnchorId, type CreateShapeProps } from './defs';
import { createAnchorMap, type ShapeComponentProps, type ShapeDef } from '../../components';
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
  size: { width: 128, height: 128 },
  classNames: 'rounded-full border-primary-800',
  ...rest,
});

export const ScopeComponent = ({ shape }: ShapeComponentProps<ScopeShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const input = runtime.inputs[DEFAULT_INPUT];
  const active = input?.type === 'executed' ? input.value : false;
  const { getAverage } = useAudioStream(active);

  return (
    <div className='flex w-full justify-center items-center bg-black'>
      <Chaos active={active} getValue={getAverage} options={{ ...shaderOptions.heptapod, zoom: 1.2 }} />
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
