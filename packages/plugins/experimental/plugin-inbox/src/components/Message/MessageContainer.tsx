//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { StackItem } from '@dxos/react-ui-stack';
import { type MessageType } from '@dxos/schema';

export type MessageContainerProps = {
  message: MessageType;
};

export const MessageContainer = ({ message }: MessageContainerProps) => {
  return (
    <StackItem.Content toolbar={false} classNames='overflow-y-auto p-2'>
      {message.blocks
        .filter((block) => 'text' in block)
        .map((block, b) => {
          return <p key={`block--${b}`}>{block.text}</p>;
        })}
    </StackItem.Content>
  );
};
