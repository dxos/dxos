//
// Copyright 2024 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React, { type PropsWithChildren } from 'react';

import { Button } from '@dxos/react-ui';
import {
  groupSurface,
  hoverableControlItem,
  hoverableControls,
  hoverableFocusedWithinControls,
  mx,
} from '@dxos/react-ui-theme';

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
  return (
    <div
      role='none'
      className={mx('flex flex-col w-full col-span-2 pie-2', hoverableControls, hoverableFocusedWithinControls)}
    >
      <p>{text}</p>
      {onDelete && (
        <div className={mx('flex justify-end')}>
          <Button
            variant='ghost'
            classNames={['p-1.5 min-bs-0 mie-1 items-start transition-opacity', hoverableControlItem]}
            onClick={() => onDelete()}
          >
            <X />
          </Button>
        </div>
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

export const DefaultMessageContainer = ({ children }: PropsWithChildren) => {
  return (
    <div className={mx('flex grow justify-center grow bg-white dark:bg-black')}>
      <div className={mx('flex flex-col overflow-y-auto w-[400px]', groupSurface)}>{children}</div>
    </div>
  );
};
