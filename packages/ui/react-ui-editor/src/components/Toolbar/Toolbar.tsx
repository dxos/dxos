//
// Copyright 2024 DXOS.org
//

import { TextB, TextItalic } from '@phosphor-icons/react';
import React from 'react';

import { Button, DensityProvider, Select } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

export type ToolbarProps = {
  // TODO(burdon): Event type?
  onAction?: (action: { type: string; data?: any }) => void;
};

// TODO(burdon): Actions
//  - Bold/italic
//  - Lists
//  - Table
//  - Comment
//  - Link (page/web)
//  - Image
//  - Code

// TODO(burdon): Update state based on current selection?
export const Toolbar = ({ onAction }: ToolbarProps) => {
  return (
    <DensityProvider density='fine'>
      <div role='toolbar' className='flex p-2 items-center gap-2'>
        <div>
          <Select.Root onValueChange={(value) => onAction?.({ type: 'heading', data: parseInt(value) })}>
            <Select.TriggerButton placeholder='Heading' />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {[1, 2, 3, 4, 5, 6].map((level) => (
                    <Select.Option key={level} value={String(level)}>
                      Heading {level}
                    </Select.Option>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
        <div>
          <Button variant='ghost' classNames='p-0' onClick={() => onAction?.({ type: 'bold' })}>
            <TextB className={getSize(5)} />
          </Button>
          <Button variant='ghost' classNames='p-0' onClick={() => onAction?.({ type: 'italic' })}>
            <TextItalic className={getSize(5)} />
          </Button>
        </div>
      </div>
    </DensityProvider>
  );
};
