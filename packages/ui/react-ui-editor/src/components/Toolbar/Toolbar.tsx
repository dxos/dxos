//
// Copyright 2024 DXOS.org
//

import {
  type Icon,
  At,
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
import { createContext } from '@radix-ui/react-context';
import React, { type FC, type PropsWithChildren } from 'react';

import { Button, type ButtonProps, DensityProvider, Select } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

// TODO(burdon): Revert to string to make extensible?
export type ActionType =
  | 'blockquote'
  | 'bold'
  | 'codeblock'
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

export type Action = {
  type: ActionType;
  data?: any;
};

export type ToolbarProps = PropsWithChildren<{
  onAction?: (action: Action) => void;
}>;

const [ToolbarContextProvider, useToolbarContext] = createContext<ToolbarProps>('Toolbar');

const ToolbarButton: FC<
  { Icon: Icon; onClick: () => Action | undefined } & NonNullable<Pick<ButtonProps, 'title'>>
> = ({ Icon, onClick, title }) => {
  const { onAction } = useToolbarContext('ToolbarButton');
  const handleClick = () => {
    const action = onClick();
    if (action) {
      onAction?.(action);
    }
  };

  return (
    <Button variant='ghost' classNames='p-2' onClick={handleClick} title={title}>
      <Icon className={getSize(5)} />
    </Button>
  );
};

const ToolbarRoot = ({ children, onAction }: ToolbarProps) => {
  return (
    <ToolbarContextProvider onAction={onAction}>
      <DensityProvider density='fine'>
        <div role='toolbar' className='flex w-full shrink-0 p-2 gap-4 items-center whitespace-nowrap overflow-hidden'>
          {children}
        </div>
      </DensityProvider>
    </ToolbarContextProvider>
  );
};

const ToolbarSeparator = () => <div className='grow' />;

const MarkdownHeading = () => {
  const { onAction } = useToolbarContext('MarkdownFormatting');
  return (
    <Select.Root defaultValue='0' onValueChange={(value) => onAction?.({ type: 'heading', data: parseInt(value) })}>
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
  );
};

const MarkdownStyles = () => (
  <div role='none'>
    <ToolbarButton Icon={TextB} title='Bold' onClick={() => ({ type: 'bold' })} />
    <ToolbarButton Icon={TextItalic} title='Italic' onClick={() => ({ type: 'italic' })} />
    <ToolbarButton Icon={TextStrikethrough} title='Strike-through' onClick={() => ({ type: 'strikethrough' })} />
  </div>
);

const MarkdownLists = () => (
  <div role='none'>
    <ToolbarButton Icon={ListBullets} title='Bullet list' onClick={() => ({ type: 'list' })} />
    <ToolbarButton Icon={ListNumbers} title='Numbered list' onClick={() => ({ type: 'list-ordered' })} />
    <ToolbarButton Icon={ListChecks} title='Task list' onClick={() => ({ type: 'list-tasks' })} />
  </div>
);

const MarkdownBlocks = () => (
  <div role='none'>
    <ToolbarButton Icon={CaretRight} title='Block quite' onClick={() => ({ type: 'blockquote' })} />
    <ToolbarButton Icon={Code} title='Code block' onClick={() => ({ type: 'codeblock' })} />
    <ToolbarButton Icon={Table} title='Table' onClick={() => ({ type: 'table' })} />
  </div>
);

const MarkdownLinks = () => (
  <div role='none'>
    <ToolbarButton Icon={Link} title='Link' onClick={() => ({ type: 'link' })} />
    <ToolbarButton Icon={At} title='Mention' onClick={() => ({ type: 'mention' })} />
    <ToolbarButton Icon={Image} title='Image' onClick={() => ({ type: 'image' })} />
  </div>
);

const MarkdownStandard = () => (
  <>
    <MarkdownHeading />
    <MarkdownStyles />
    <MarkdownLists />
    <MarkdownBlocks />
    <MarkdownLinks />
  </>
);

const MarkdownExtended = () => (
  <Toolbar.Button Icon={ChatText} title='Create comment' onClick={() => ({ type: 'comment' })} />
);

export const Toolbar = {
  Root: ToolbarRoot,
  Button: ToolbarButton,
  Separator: ToolbarSeparator,
  Markdown: MarkdownStandard,
  Extended: MarkdownExtended,
};

export { useToolbarContext };
