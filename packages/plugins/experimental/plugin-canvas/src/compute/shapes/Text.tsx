//
// Copyright 2024 DXOS.org
//

import React, { useRef, useState } from 'react';

import { DEFAULT_OUTPUT } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';

import { Box } from './common';
import { ComputeShape, createAnchorId, type CreateShapeProps } from './defs';
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
  const [reset, setReset] = useState({});
  const inputRef = useRef<TextBoxControl>(null);
  const { runtime } = useComputeNodeState(shape);

  const handleEnter: TextBoxProps['onEnter'] = (text) => {
    const value = text.trim();
    if (value.length) {
      runtime.setOutput(DEFAULT_OUTPUT, value);
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

export const createText = ({ id, text, size = { width: 256, height: 128 }, ...rest }: CreateTextProps): TextShape => ({
  id,
  type: 'text',
  size,
  ...rest,
});

export type CreateChatProps = CreateShapeProps<TextShape>;

export const createChat = ({ id, ...rest }: CreateChatProps): ChatShape => ({
  id,
  type: 'chat',
  size: { width: 256, height: 128 },
  ...rest,
});

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