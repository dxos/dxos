//
// Copyright 2024 DXOS.org
//

import {
  type Icon,
  ChatText,
  Code,
  Image,
  Link,
  ListBullets,
  ListChecks,
  ListNumbers,
  TextStrikethrough,
  Table,
  TextB,
  TextItalic,
} from '@phosphor-icons/react';
import React, { type FC } from 'react';

import { Button, DensityProvider, Select } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

export type ToolbarProps = {
  // TODO(burdon): Event type?
  onAction?: (action: { type: string; data?: any }) => void;
};

const IconButton: FC<{ Icon: Icon; title: string } & NonNullable<Pick<ToolbarProps, 'onAction'>>> = ({
  Icon,
  title,
  onAction,
}) => (
  <Button variant='ghost' classNames='p-2' onClick={onAction} title={title}>
    <Icon className={getSize(5)} />
  </Button>
);

// TODO(burdon): Update state based on current selection?
export const Toolbar = ({ onAction }: ToolbarProps) => {
  return (
    <DensityProvider density='fine'>
      <div role='toolbar' className='flex w-full p-2 items-center gap-4'>
        <div>
          <Select.Root onValueChange={(value) => onAction?.({ type: 'heading', data: parseInt(value) })}>
            <Select.TriggerButton classNames='w-[8rem]' placeholder='Heading' />
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
          <IconButton Icon={TextB} title='Bold' onAction={() => onAction?.({ type: 'bold' })} />
          <IconButton Icon={TextItalic} title='Italic' onAction={() => onAction?.({ type: 'italic' })} />
          <IconButton
            Icon={TextStrikethrough}
            title='Strike-through'
            onAction={() => onAction?.({ type: 'strikethrough' })}
          />
        </div>
        <div>
          <IconButton Icon={ListBullets} title='Bullet list' onAction={() => onAction?.({ type: 'list' })} />
          <IconButton Icon={ListNumbers} title='Numbered list' onAction={() => onAction?.({ type: 'list-ordered' })} />
          <IconButton Icon={ListChecks} title='Task list' onAction={() => onAction?.({ type: 'list-tasks' })} />
        </div>
        <div>
          <IconButton Icon={Code} title='Code block' onAction={() => onAction?.({ type: 'code' })} />
          <IconButton Icon={Table} title='Table' onAction={() => onAction?.({ type: 'table' })} />
        </div>
        <div>
          <IconButton Icon={Link} title='Link' onAction={() => onAction?.({ type: 'link' })} />
          <IconButton Icon={Image} title='Image' onAction={() => onAction?.({ type: 'image' })} />
        </div>
        <div className='grow' />
        <div>
          <IconButton Icon={ChatText} title='Create comment' onAction={() => onAction?.({ type: 'comment' })} />
        </div>
      </div>
    </DensityProvider>
  );
};
