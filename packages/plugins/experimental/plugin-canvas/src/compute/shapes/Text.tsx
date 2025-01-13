//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { S } from '@dxos/echo-schema';

import { Box } from './components';
import { ComputeShape, createAnchorId, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef, TextBox, type TextBoxProps } from '../../components';
import { createAnchorMap } from '../../components';

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
  const handleEnter: TextBoxProps['onEnter'] = (value) => {
    if (value.trim().length) {
      // TODO(burdon): Standardize.
      // shape.node.setText(value);
      if (chat) {
        setReset({});
      }
    }
  };

  return (
    <Box name={title ?? 'Text'}>
      <TextBox
        classNames='flex grow p-2 overflow-hidden'
        {...props}
        reset={reset}
        // value={chat ? '' : shape.node.getText()}
        onEnter={handleEnter}
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
  icon: 'ph--article--regular',
  component: (props) => <TextComponent {...props} placeholder={'Text'} />,
  createShape: createText,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
};

export const chatShape: ShapeDef<TextShape> = {
  type: 'chat',
  icon: 'ph--textbox--regular',
  component: (props) => <TextComponent {...props} title={'Prompt'} placeholder={'Message'} chat />,
  createShape: createText,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
  resizeable: true,
};
