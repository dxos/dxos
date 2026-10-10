//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { createPorts, defineComputeNode } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createAnchorId, createShape, withZ } from './defs.ts';
import { SwitchComponent } from './Switch.tsx';

// Kept out of `Switch.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

export const SwitchShape = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.Literal('switch'),
  }),
);

export type SwitchShape = Schema.Schema.Type<typeof SwitchShape>;

export type CreateSwitchProps = CreateShapeProps<SwitchShape>;

export const createSwitch = (props: CreateSwitchProps) =>
  createShape<SwitchShape>({ type: 'switch', size: { width: 64, height: 64 }, ...props });

export const switchNodeDef = defineComputeNode<SwitchShape>({
  type: 'switch',
  name: 'Switch',
  icon: 'ph--toggle-left--regular',
  group: 'Inputs',
  schema: withZ(SwitchShape),
  component: SwitchComponent,
  create: createSwitch,
  ports: (shape) => createPorts(shape.size, { [createAnchorId('output')]: { x: 1, y: 0 } }),
});
