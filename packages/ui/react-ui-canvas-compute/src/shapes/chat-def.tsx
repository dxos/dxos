//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import React from 'react';

import { type ShapeDef } from '@dxos/react-ui-canvas-editor';
import { createAnchorMap } from '@dxos/react-ui-canvas-editor';

import { TextInputComponent } from './Chat.tsx';
import { ComputeShape, type CreateShapeProps, createAnchorId, createShape } from './defs.ts';

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
  createShape<ChatShape>({ type: 'chat', size: { width: 256, height: 128 }, ...props });

export const chatShape: ShapeDef<ChatShape> = {
  type: 'chat',
  name: 'Chat',
  icon: 'ph--textbox--regular',
  component: (props) => <TextInputComponent {...props} title={'Prompt'} placeholder={'Message'} />,
  createShape: createChat,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
  resizable: true,
};
