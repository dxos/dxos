//
// Copyright 2024 DXOS.org
//

import React, { useRef, useState } from 'react';

import { S } from '@dxos/echo-schema';

import { Box } from './common';
import { ComputeShape, createAnchorId, createShape, type CreateShapeProps } from './defs';
import {
  type ShapeComponentProps,
  type ShapeDef,
  TextBox,
  type TextBoxControl,
  type TextBoxProps,
} from '../../components';
import { createAnchorMap } from '../../components';
import { useComputeNodeState } from '../hooks';

//
// Data
//

export const TextShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('text'),
  }),
);

export type TextShape = S.Schema.Type<typeof TextShape>;

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

export type TextComponentProps = ShapeComponentProps<TextShape> & TextBoxProps & { title?: string; chat?: boolean };

export const TextComponent = ({ shape, title, chat, ...props }: TextComponentProps) => {
  const { node } = useComputeNodeState(shape);
  const [reset, setReset] = useState({});
  const inputRef = useRef<TextBoxControl>(null);

  const handleEnter: TextBoxProps['onEnter'] = (text) => {
    const value = text.trim();
    if (value.length) {
      node.value = value;
      if (chat) {
        setReset({});
      }

      inputRef.current?.focus();
    }
  };

  return (
    <Box shape={shape} name={title}>
      <TextBox
        ref={inputRef}
        reset={reset}
        onEnter={handleEnter}
        // value={chat ? '' : shape.node.getText()}
        {...props}
      />
    </Box>
  );
};

//
// Defs
//

export type CreateTextProps = CreateShapeProps<TextShape> & { text?: string };

export const createText = (props: CreateTextProps) =>
  createShape<TextShape>({ type: 'text', size: { width: 256, height: 128 }, ...props });

export type CreateChatProps = CreateShapeProps<TextShape>;

export const createChat = (props: CreateChatProps) =>
  createShape<ChatShape>({ type: 'chat', size: { width: 256, height: 128 }, ...props });

export const textShape: ShapeDef<TextShape> = {
  type: 'text',
  name: 'Text',
  icon: 'ph--article--regular',
  component: (props) => <TextComponent {...props} placeholder={'Text'} />,
  createShape: createText,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
  resizable: true,
};

export const chatShape: ShapeDef<TextShape> = {
  type: 'chat',
  name: 'Chat',
  icon: 'ph--textbox--regular',
  component: (props) => <TextComponent {...props} title={'Prompt'} placeholder={'Message'} chat />,
  createShape: createText,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
  resizable: true,
};
