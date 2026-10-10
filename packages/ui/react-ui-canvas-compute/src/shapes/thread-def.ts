//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { createInputSchema, createOutputSchema } from '@dxos/conductor';
import { Type } from '@dxos/echo';
import { Message } from '@dxos/types';

import { createFunctionPorts, defineComputeNode } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createShape, withZ } from './defs.ts';
import { ThreadComponent } from './Thread.tsx';

// Kept out of `Thread.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

const InputSchema = createInputSchema(Type.getSchema(Message.Message));

const OutputSchema = createOutputSchema(Schema.mutable(Schema.Array(Type.getSchema(Message.Message))));

export const ThreadShape = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.Literal('thread'),
  }),
);

export type ThreadShape = Schema.Schema.Type<typeof ThreadShape>;

export type CreateThreadProps = CreateShapeProps<ThreadShape>;

export const createThread = (props: CreateThreadProps) =>
  createShape<ThreadShape>({ type: 'thread', size: { width: 384, height: 384 }, ...props });

export const threadNodeDef = defineComputeNode<ThreadShape>({
  type: 'thread',
  name: 'Thread',
  icon: 'ph--chats-circle--regular',
  group: 'Outputs',
  schema: withZ(ThreadShape),
  component: ThreadComponent,
  create: createThread,
  ports: (shape) => createFunctionPorts(shape.size, InputSchema, OutputSchema),
  resizable: true,
});
