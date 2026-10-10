//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { createPorts, defineComputeNode } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createAnchorId, createShape, withZ } from './defs.ts';
import { ScopeComponent } from './Scope.tsx';

// Kept out of `Scope.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

export const ScopeShape = ComputeShape.mapFields(
  Struct.assign({
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

export const scopeNodeDef = defineComputeNode<ScopeShape>({
  type: 'scope',
  name: 'Scope',
  icon: 'ph--waveform--regular',
  group: 'Outputs',
  schema: withZ(ScopeShape),
  component: ScopeComponent,
  create: createScope,
  ports: (shape) => createPorts(shape.size, { [createAnchorId('input')]: { x: -1, y: 0 } }),
});
