//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { IconButton } from '@dxos/react-ui';
import { hoverableControlItem, hoverableControls, hoverableFocusedWithinControls, mx } from '@dxos/react-ui-theme';

import { MessageBody, MessageHeading } from './Message';
import { type MessageMetadata } from './types';

export type MessageEntity<PartValue = any> = MessageMetadata & {
  text: string;
  parts?: PartValue[];
};

export type MessageTextProps = MessageMetadata & {
  text: string;
  onDelete?: () => void;
};

export const MessageStoryText = ({ text, onDelete, authorName, timestamp }: MessageTextProps) => (
  <>
    <MessageHeading authorName={authorName} timestamp={timestamp}>
      {onDelete && (
        <IconButton
          icon='ph--x--regular'
          iconOnly
          label='Delete'
          variant='ghost'
          classNames={['p-1.5 min-bs-0 mie-1 items-start transition-opacity', hoverableControlItem]}
          onClick={() => onDelete()}
        />
      )}
    </MessageHeading>
    <MessageBody>{text}</MessageBody>
  </>
);

export type MessagePartProps<PartValue> = {
  part: PartValue;
};

export const MessageStoryBlock = <PartValue,>({ part }: MessagePartProps<PartValue>) => (
  <div
    role='none'
    className={mx('grid grid-cols-subgrid col-span-3', hoverableControls, hoverableFocusedWithinControls)}
  >
    <pre className='font-mono max-is-full overflow-x-auto col-span-3'>
      <code>{JSON.stringify(part, undefined, 2)}</code>
    </pre>
  </div>
);
