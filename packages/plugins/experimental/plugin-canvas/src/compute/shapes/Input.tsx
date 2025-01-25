//
// Copyright 2024 DXOS.org
//

import React, { useRef, useState } from 'react';

import { DEFAULT_OUTPUT } from '@dxos/conductor';
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

export const TemplateShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('text'),
  }),
);

export type TemplateShape = S.Schema.Type<typeof TemplateShape>;

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

export type TextInputComponentProps = ShapeComponentProps<TemplateShape> &
  TextBoxProps & { title?: string; chat?: boolean };

export const TextInputComponent = ({ shape, title, chat, ...props }: TextInputComponentProps) => {
  const { runtime } = useComputeNodeState(shape);
  const [reset, setReset] = useState({});
  const inputRef = useRef<TextBoxControl>(null);

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

export type CreateTemplateProps = CreateShapeProps<TemplateShape> & { text?: string };

export const createTemplate = (props: CreateTemplateProps) =>
  createShape<TemplateShape>({ type: 'template', size: { width: 256, height: 128 }, ...props });

export type CreateChatProps = CreateShapeProps<TemplateShape>;

export const createChat = (props: CreateChatProps) =>
  createShape<ChatShape>({ type: 'chat', size: { width: 256, height: 128 }, ...props });

// TODO(burdon): Rename tempalte. Handlebars dynamic schema.
export const templateShape: ShapeDef<TemplateShape> = {
  type: 'text',
  name: 'Template',
  icon: 'ph--article--regular',
  component: (props) => <TextInputComponent {...props} placeholder={'Text'} />,
  createShape: createTemplate,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
  resizable: true,
};

export const chatShape: ShapeDef<TemplateShape> = {
  type: 'chat',
  name: 'Chat',
  icon: 'ph--textbox--regular',
  component: (props) => <TextInputComponent {...props} title={'Prompt'} placeholder={'Message'} chat />,
  createShape: createTemplate,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
  resizable: true,
};
