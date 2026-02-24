//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { DEFAULT_INPUT } from '@dxos/conductor';
import { type ShapeComponentProps, type ShapeDef, createAnchorMap } from '@dxos/react-ui-canvas-editor';
import { Chaos, shaderPresets, useAudioStream } from '@dxos/react-ui-sfx';

import { useComputeNodeState } from '../hooks';

import { ComputeShape, type CreateShapeProps, createAnchorId, createShape } from './defs';

export const ScopeShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('scope'),
  }),
);

export type ScopeShape = Schema.Schema.Type<typeof ScopeShape>;

export type CreateScopeProps = CreateShapeProps<ScopeShape>;

export const createScope = (props: CreateScopeProps) =>
  createShape<ScopeShape>({
    type: 'scope',
    size: { width: 128, height: 128 },
    classNames: 'rounded-full border-primary-800',
    ...props,
  });

export const ScopeComponent = ({ shape }: ShapeComponentProps<ScopeShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const input = runtime.inputs[DEFAULT_INPUT];
  const active = input?.type === 'executed' ? input.value : false;
  const { getAverage } = useAudioStream(active);

  return (
    <div className='flex w-full justify-center items-center bg-black'>
      <Chaos active={active} getValue={getAverage} options={{ ...shaderPresets.heptapod, zoom: 1.2 }} />
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
