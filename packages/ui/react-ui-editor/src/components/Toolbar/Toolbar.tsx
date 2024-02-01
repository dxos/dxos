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
import React, { type PropsWithChildren } from 'react';

import { Button, type ButtonProps, DensityProvider, Select } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { type Formatting } from '../../extensions/markdown';

// TODO(burdon): Revert to string to make extensible?
export type ActionType =
  | 'blockquote'
  | 'strong'
  | 'codeblock'
  | 'comment'
  | 'heading'
  | 'image'
  | 'emphasis'
  | 'code'
  | 'link'
  | 'list-bullet'
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
  state: Formatting | null;
  onAction?: (action: Action) => void;
}>;

const [ToolbarContextProvider, useToolbarContext] = createContext<ToolbarProps>('Toolbar');

const ToolbarRoot = ({ children, onAction, state }: ToolbarProps) => {
  return (
    <ToolbarContextProvider onAction={onAction} state={state}>
      <DensityProvider density='fine'>
        <div role='toolbar' className='flex w-full shrink-0 p-2 gap-4 items-center whitespace-nowrap overflow-hidden'>
          {children}
        </div>
      </DensityProvider>
    </ToolbarContextProvider>
  );
};

type ToolbarButtonProps = {
  Icon: Icon;
  onClick: (state: Formatting | null) => Action | undefined;
  getState?: (state: Formatting) => boolean;
  disable?: (state: Formatting) => boolean;
} & NonNullable<Pick<ButtonProps, 'title'>>;

const ToolbarButton = ({ Icon, onClick, title, getState, disable }: ToolbarButtonProps) => {
  const { onAction, state } = useToolbarContext('ToolbarButton');
  const handleClick = (event: React.MouseEvent) => {
    const action = onClick(state);
    if (action) {
      onAction?.(action);
      event.preventDefault();
    }
  };
  const active = getState && state ? getState(state) : false;
  const disabled = disable && state ? disable(state) : false;

  return (
    <Button
      variant='ghost'
      classNames={mx('p-2', active && 'ring')}
      onMouseDown={handleClick}
      title={title}
      disabled={disabled}
    >
      <Icon className={getSize(5)} />
    </Button>
  );
};

const ToolbarSeparator = () => <div className='grow' />;

const MarkdownHeading = () => {
  const { onAction, state } = useToolbarContext('MarkdownFormatting');
  const blockType = state ? state.blockType : 'paragraph';
  const header = blockType && /heading(\d)/.exec(blockType);
  const value = header ? header[1] : blockType === 'paragraph' || !blockType ? '0' : null;
  return (
    <Select.Root
      disabled={value === null}
      value={value ?? '0'}
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
  );
};

const MarkdownStyles = () => (
  <div role='none'>
    <ToolbarButton
      Icon={TextB}
      title='String'
      onClick={(s) => ({ type: 'strong', data: s ? !s.strong : null })}
      getState={(s) => s.strong}
      disable={(s) => s.blockType === 'codeblock'}
    />
    <ToolbarButton
      Icon={TextItalic}
      title='Emphasis'
      onClick={(s) => ({ type: 'emphasis', data: s ? !s.emphasis : null })}
      getState={(s) => s.emphasis}
      disable={(s) => s.blockType === 'codeblock'}
    />
    <ToolbarButton
      Icon={TextStrikethrough}
      title='Strike-through'
      onClick={(s) => ({ type: 'strikethrough', data: s ? !s.strikethrough : null })}
      getState={(s) => s.strikethrough}
      disable={(s) => s.blockType === 'codeblock'}
    />
    <ToolbarButton
      Icon={Code}
      title='Inline code'
      onClick={(s) => ({ type: 'code', data: s ? !s.code : null })}
      getState={(s) => s.code}
      disable={(s) => s.blockType === 'codeblock'}
    />
  </div>
);

const MarkdownLists = () => (
  <div role='none'>
    <ToolbarButton
      Icon={ListBullets}
      title='Bullet list'
      onClick={(s) => ({ type: 'list-bullet', data: s ? s.listStyle !== 'bullet' : null })}
      getState={(s) => s.listStyle === 'bullet'}
    />
    <ToolbarButton
      Icon={ListNumbers}
      title='Numbered list'
      onClick={(s) => ({ type: 'list-ordered', data: s ? s.listStyle !== 'ordered' : null })}
      getState={(s) => s.listStyle === 'ordered'}
    />
    <ToolbarButton
      Icon={ListChecks}
      title='Task list'
      onClick={(s) => ({ type: 'list-tasks', data: s ? s.listStyle !== 'task' : null })}
      getState={(s) => s.listStyle === 'task'}
    />
  </div>
);

const MarkdownBlocks = () => (
  <div role='none'>
    <ToolbarButton
      Icon={CaretRight}
      title='Block quote'
      onClick={(s) => ({ type: 'blockquote', data: s ? !s.blockquote : null })}
      getState={(s) => s.blockquote}
    />
    <ToolbarButton
      Icon={Code}
      title='Code block'
      onClick={(s) => ({ type: 'codeblock', data: s ? s.blockType !== 'codeblock' : null })}
      getState={(s) => s.blockType === 'codeblock'}
    />
    <ToolbarButton Icon={Table} title='Table' onClick={() => ({ type: 'table' })} />
  </div>
);

const MarkdownLinks = () => (
  <div role='none'>
    <ToolbarButton
      Icon={Link}
      title='Link'
      onClick={(s) => ({ type: 'link', data: s ? !s.link : null })}
      getState={(s) => s.link}
    />
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
