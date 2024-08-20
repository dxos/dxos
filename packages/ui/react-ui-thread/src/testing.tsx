//
// Copyright 2024 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React, { type PropsWithChildren } from 'react';

import { Button } from '@dxos/react-ui';
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

export const MessageStoryText = ({ text, onDelete, authorName, timestamp }: MessageTextProps) => {
  return (
    <>
      <MessageHeading authorName={authorName} timestamp={timestamp}>
        {onDelete && (
          <Button
            variant='ghost'
            classNames={['p-1.5 min-bs-0 mie-1 items-start transition-opacity', hoverableControlItem]}
            onClick={() => onDelete()}
          >
            <X />
          </Button>
        )}
      </MessageHeading>
      <MessageBody>{text}</MessageBody>
    </>
  );
};

export type MessagePartProps<PartValue> = {
  part: PartValue;
};

export const MessageStoryBlock = <PartValue,>({ part }: MessagePartProps<PartValue>) => {
  return (
    <div
      role='none'
      className={mx('grid grid-cols-subgrid col-span-3', hoverableControls, hoverableFocusedWithinControls)}
    >
      <pre className='font-mono max-is-full overflow-x-auto col-span-3'>
        <code>{JSON.stringify(part, undefined, 2)}</code>
      </pre>
    </div>
  );
};

export const ThreadStoryContainer = ({ children }: PropsWithChildren) => {
  return <div className={mx('bg-white dark:bg-black mli-auto is-96 overflow-y-auto')}>{children}</div>;
};
