//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { createFunctionPorts, defineComputeNode } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createShape, withZ } from './defs.ts';
import { GptRealtimeComponent } from './GptRealtime.tsx';

// Kept out of `GptRealtime.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

export const GptRealtimeShape = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.Literal('gpt-realtime'),
  }),
);

export type GptRealtimeShape = Schema.Schema.Type<typeof GptRealtimeShape>;

export type CreateGptRealtimeProps = CreateShapeProps<GptRealtimeShape>;

export const createGptRealtime = (props: CreateGptRealtimeProps) =>
  createShape<GptRealtimeShape>({ type: 'gpt-realtime', size: { width: 256, height: 256 }, ...props });

export const gptRealtimeNodeDef = defineComputeNode<GptRealtimeShape>({
  type: 'gpt-realtime',
  name: 'GPT Realtime',
  icon: 'ph--pulse--regular',
  group: 'Transform',
  schema: withZ(GptRealtimeShape),
  component: GptRealtimeComponent,
  create: createGptRealtime,
  // TODO(dmaretskyi): Can we fetch the schema dynamically?
  ports: (shape) =>
    createFunctionPorts(
      shape.size,
      Schema.Struct({
        audio: Schema.Any,
      }),
      Schema.Struct({}),
    ),
  resizable: true,
});
