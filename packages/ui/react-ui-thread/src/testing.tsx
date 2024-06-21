//
// Copyright 2024 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React from 'react';

import { Button } from '@dxos/react-ui';
import { hoverableControlItem, hoverableControls, hoverableFocusedWithinControls, mx } from '@dxos/react-ui-theme';

import { type MessageMetadata } from './types';

export type MessageEntity<PartValue = any> = MessageMetadata & {
  text: string;
  parts?: PartValue[];
};

export type MessageTextProps = {
  text: string;
  onDelete?: () => void;
};

export const DefaultMessageText = ({ text, onDelete }: MessageTextProps) => {
  const contentWidth = onDelete ? 'col-span-2' : 'col-span-3';
  return (
    <div
      role='none'
      className={mx('grid grid-cols-subgrid col-span-3', hoverableControls, hoverableFocusedWithinControls)}
    >
      <p className={contentWidth}>{text}</p>
      {onDelete && (
        <Button
          variant='ghost'
          classNames={['p-1.5 min-bs-0 mie-1 items-start transition-opacity', hoverableControlItem]}
          onClick={() => onDelete()}
        >
          <X />
        </Button>
      )}
    </div>
  );
};

export type MessagePartProps<PartValue> = {
  part: PartValue;
};

export const DefaultMessageBlock = <PartValue,>({ part }: MessagePartProps<PartValue>) => {
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
