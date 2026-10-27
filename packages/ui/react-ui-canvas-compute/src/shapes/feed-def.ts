//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { QueueInput, QueueOutput } from '@dxos/conductor';

import { createFunctionPorts, defineComputeNode } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createShape, withZ } from './defs.ts';
import { FeedComponent } from './Feed.tsx';

// Kept out of `Feed.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

export const FeedShape = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.Literal('queue'),
  }),
);

export type FeedShape = Schema.Schema.Type<typeof FeedShape>;

export type CreateFeedProps = CreateShapeProps<FeedShape>;

export const createFeed = (props: CreateFeedProps) =>
  createShape<FeedShape>({
    type: 'queue',
    size: { width: 256, height: 512 },
    ...props,
  });

export const feedNodeDef = defineComputeNode<FeedShape>({
  // Must match the shape's `type` literal ('queue') so the registry resolves it; the registry is keyed by this.
  type: 'queue',
  name: 'Feed',
  icon: 'ph--queue--regular',
  group: 'Outputs',
  schema: withZ(FeedShape),
  component: FeedComponent,
  create: createFeed,
  ports: (shape) => createFunctionPorts(shape.size, QueueInput, QueueOutput),
  resizable: true,
});
