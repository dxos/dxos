//
// Copyright 2024 DXOS.org
//

import React, { useRef } from 'react';

import { DEFAULT_OUTPUT } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';
import {
  type ShapeComponentProps,
  type ShapeDef,
  TextBox,
  type TextBoxControl,
  type TextBoxProps,
} from '@dxos/react-ui-canvas-editor';
import { createAnchorMap } from '@dxos/react-ui-canvas-editor';

import { Box } from './common';
import { ComputeShape, createAnchorId, createShape, type CreateShapeProps } from './defs';
import { useComputeNodeState } from '../hooks';

//
// Data
//

export const ChatShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('chat'),
  }),
);

export type ChatShape = S.Schema.Type<typeof ChatShape>;

//
// Component
//

export type TextInputComponentProps = ShapeComponentProps<ChatShape> & TextBoxProps & { title?: string };

export const TextInputComponent = ({ shape, title, ...props }: TextInputComponentProps) => {
  const { runtime } = useComputeNodeState(shape);
  const inputRef = useRef<TextBoxControl>(null);

  const handleEnter: TextBoxProps['onEnter'] = (text) => {
    const value = text.trim();
    if (value.length) {
      runtime.setOutput(DEFAULT_OUTPUT, value);
      inputRef.current?.setText('');
    }
  };

  return (
    <Box shape={shape} title={title}>
      <TextBox ref={inputRef} onEnter={handleEnter} {...props} />
    </Box>
  );
};

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
