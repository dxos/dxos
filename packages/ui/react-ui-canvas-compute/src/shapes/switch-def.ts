//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type ShapeDef, createAnchorMap } from '@dxos/react-ui-canvas-editor';

import { ComputeShape, type CreateShapeProps, createAnchorId, createShape } from './defs';
import { SwitchComponent } from './Switch';

// Kept out of `Switch.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

export const SwitchShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('switch'),
  }),
);

export type SwitchShape = Schema.Schema.Type<typeof SwitchShape>;

export type CreateSwitchProps = CreateShapeProps<SwitchShape>;

export const createSwitch = (props: CreateSwitchProps) =>
  createShape<SwitchShape>({ type: 'switch', size: { width: 64, height: 64 }, ...props });

export const switchShape: ShapeDef<SwitchShape> = {
  type: 'switch',
  name: 'Switch',
  icon: 'ph--toggle-left--regular',
  component: SwitchComponent,
  createShape: createSwitch,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
};
