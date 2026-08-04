//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type ShapeDef, createAnchorMap } from '@dxos/react-ui-canvas-editor';

import { ComputeShape, type CreateShapeProps, createAnchorId, createShape } from './defs';
import { ScopeComponent } from './Scope';

// Kept out of `Scope.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

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

export const scopeShape: ShapeDef<ScopeShape> = {
  type: 'scope',
  name: 'Scope',
  icon: 'ph--waveform--regular',
  component: ScopeComponent,
  createShape: createScope,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('input')]: { x: -1, y: 0 } }),
};
