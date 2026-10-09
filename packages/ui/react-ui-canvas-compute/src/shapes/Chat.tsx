//
// Copyright 2024 DXOS.org
//

import React, { useRef } from 'react';

import { DEFAULT_OUTPUT } from '@dxos/conductor';

import { useComputeNodeState } from '../hooks/index.ts';
import { type ChatShape } from './chat-def.tsx';
import { Box, type ComputeNodeViewProps, TextBox, type TextBoxControl, type TextBoxProps } from './common/index.ts';

//
// Component
//

export type TextInputComponentProps = ComputeNodeViewProps<ChatShape> &
  Pick<TextBoxProps, 'placeholder'> & { title?: string };

export const TextInputComponent = ({ node: shape, title, placeholder }: TextInputComponentProps) => {
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
      <TextBox ref={inputRef} onEnter={handleEnter} placeholder={placeholder} />
    </Box>
  );
};
