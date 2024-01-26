//
// Copyright 2024 DXOS.org
//

import {
  type Icon,
  At,
  Brain,
  CaretRight,
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

import { Button, type ButtonProps, DensityProvider, Select } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

export type Action =
  | 'blockquote'
  | 'bold'
  | 'code'
  | 'comment'
  | 'heading'
  | 'image'
  | 'italic'
  | 'link'
  | 'list'
  | 'list-ordered'
  | 'list-tasks'
  | 'mention'
  | 'prompt'
  | 'strikethrough'
  | 'table';

export type ToolbarProps = {
  onAction?: (action: { type: Action; data?: any }) => void;
};

const IconButton: FC<{ Icon: Icon; title: string } & NonNullable<Pick<ButtonProps, 'onClick'>>> = ({
  Icon,
  title,
  onClick,
}) => (
  <Button variant='ghost' classNames='p-2' onClick={onClick} title={title}>
    <Icon className={getSize(5)} />
  </Button>
);

// TODO(burdon): Update state based on current selection?
export const Toolbar = ({ onAction }: ToolbarProps) => {
  return (
    <DensityProvider density='fine'>
      <div role='toolbar' className='flex w-full p-2 items-center gap-4'>
        <div>
          <Select.Root
            defaultValue='0'
            onValueChange={(value) => onAction?.({ type: 'heading', data: parseInt(value) })}
          >
            <Select.TriggerButton classNames='w-[8rem]' />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  <Select.Option value='0'>Paragraph</Select.Option>
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
          <IconButton Icon={TextB} title='Bold' onClick={() => onAction?.({ type: 'bold' })} />
          <IconButton Icon={TextItalic} title='Italic' onClick={() => onAction?.({ type: 'italic' })} />
          <IconButton
            Icon={TextStrikethrough}
            title='Strike-through'
            onClick={() => onAction?.({ type: 'strikethrough' })}
          />
        </div>
        <div>
          <IconButton Icon={ListBullets} title='Bullet list' onClick={() => onAction?.({ type: 'list' })} />
          <IconButton Icon={ListNumbers} title='Numbered list' onClick={() => onAction?.({ type: 'list-ordered' })} />
          <IconButton Icon={ListChecks} title='Task list' onClick={() => onAction?.({ type: 'list-tasks' })} />
        </div>
        <div>
          <IconButton Icon={CaretRight} title='Block quite' onClick={() => onAction?.({ type: 'blockquote' })} />
          <IconButton Icon={Code} title='Code block' onClick={() => onAction?.({ type: 'code' })} />
          <IconButton Icon={Table} title='Table' onClick={() => onAction?.({ type: 'table' })} />
        </div>
        <div>
          <IconButton Icon={Link} title='Link' onClick={() => onAction?.({ type: 'link' })} />
          <IconButton Icon={At} title='Mention' onClick={() => onAction?.({ type: 'mention' })} />
          <IconButton Icon={Image} title='Image' onClick={() => onAction?.({ type: 'image' })} />
        </div>
        <div className='grow' />
        <div>
          <IconButton Icon={Brain} title='AI prompt' onClick={() => onAction?.({ type: 'prompt' })} />
          <IconButton Icon={ChatText} title='Create comment' onClick={() => onAction?.({ type: 'comment' })} />
        </div>
      </div>
    </DensityProvider>
  );
};
