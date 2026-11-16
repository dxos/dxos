//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import React from 'react';

import { MAJOR_GRID } from '@dxos/scene';

import { TextInputComponent } from './Chat.tsx';
import { createPorts, defineComputeNode } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createAnchorId, createShape, withZ } from './defs.ts';

// Kept out of `Chat.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

//
// Data
//

export const ChatShape = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.Literal('chat'),
  }),
);

export type ChatShape = Schema.Schema.Type<typeof ChatShape>;

//
// Defs
//

export type CreateChatProps = CreateShapeProps<ChatShape>;

export const createChat = (props: CreateChatProps) =>
  createShape<ChatShape>({ type: 'chat', size: { width: 4 * MAJOR_GRID, height: 2 * MAJOR_GRID }, ...props });

export const chatNodeDef = defineComputeNode<ChatShape>({
  type: 'chat',
  name: 'Chat',
  icon: 'ph--textbox--regular',
  group: 'Inputs',
  schema: withZ(ChatShape),
  component: (props) => <TextInputComponent {...props} title={'Prompt'} placeholder={'Message'} />,
  create: createChat,
  ports: (shape) => createPorts(shape.size, { [createAnchorId('output')]: { x: 1, y: 0 } }),
  resizable: true,
});
