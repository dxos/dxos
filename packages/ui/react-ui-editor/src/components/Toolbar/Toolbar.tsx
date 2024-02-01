//
// Copyright 2024 DXOS.org
//

import {
  type Icon,
  CaretRight,
  ChatText,
  Code,
  Link,
  ListBullets,
  ListChecks,
  ListNumbers,
  Paragraph,
  TextStrikethrough,
  Table,
  TextB,
  TextItalic,
} from '@phosphor-icons/react';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import { Button, type ButtonProps, DensityProvider, Select } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { type Formatting } from '../../extensions';

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
        <div role='toolbar' className='flex w-full shrink-0 p-1 gap-2 items-center whitespace-nowrap overflow-hidden'>
          {children}
        </div>
      </DensityProvider>
    </ToolbarContextProvider>
  );
};

type ToolbarButtonProps = {
  Icon: Icon;
  disable?: (state: Formatting) => boolean;
  getState?: (state: Formatting) => boolean;
  onClick: (state: Formatting | null) => Action | undefined;
} & NonNullable<Pick<ButtonProps, 'title'>>;

const ToolbarButton = ({ Icon, onClick, title, getState, disable }: ToolbarButtonProps) => {
  const { onAction, state } = useToolbarContext('ToolbarButton');
  const active = getState && state ? getState(state) : false;
  const disabled = disable && state ? disable(state) : false;

  const handleClick = (event: React.MouseEvent) => {
    const action = onClick(state);
    if (action) {
      onAction?.(action);
      event.preventDefault();
    }
  };

  return (
    <Button
      variant='ghost'
      classNames={mx('p-2', active && 'ring-[1px]')}
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
      <Select.TriggerButton>
        <Paragraph className={getSize(5)} />
      </Select.TriggerButton>
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
      disable={(s) => s.blockType === 'codeblock'}
      getState={(s) => s.strong}
      onClick={(s) => ({ type: 'strong', data: s ? !s.strong : null })}
    />
    <ToolbarButton
      Icon={TextItalic}
      title='Emphasis'
      disable={(s) => s.blockType === 'codeblock'}
      getState={(s) => s.emphasis}
      onClick={(s) => ({ type: 'emphasis', data: s ? !s.emphasis : null })}
    />
    <ToolbarButton
      Icon={TextStrikethrough}
      title='Strike-through'
      disable={(s) => s.blockType === 'codeblock'}
      getState={(s) => s.strikethrough}
      onClick={(s) => ({ type: 'strikethrough', data: s ? !s.strikethrough : null })}
    />
    <ToolbarButton
      Icon={Code}
      title='Inline code'
      disable={(s) => s.blockType === 'codeblock'}
      getState={(s) => s.code}
      onClick={(s) => ({ type: 'code', data: s ? !s.code : null })}
    />
  </div>
);

const MarkdownLists = () => (
  <div role='none'>
    <ToolbarButton
      Icon={ListBullets}
      title='Bullet list'
      getState={(s) => s.listStyle === 'bullet'}
      onClick={(s) => ({ type: 'list-bullet', data: s ? s.listStyle !== 'bullet' : null })}
    />
    <ToolbarButton
      Icon={ListNumbers}
      title='Numbered list'
      getState={(s) => s.listStyle === 'ordered'}
      onClick={(s) => ({ type: 'list-ordered', data: s ? s.listStyle !== 'ordered' : null })}
    />
    <ToolbarButton
      Icon={ListChecks}
      title='Task list'
      getState={(s) => s.listStyle === 'task'}
      onClick={(s) => ({ type: 'list-tasks', data: s ? s.listStyle !== 'task' : null })}
    />
  </div>
);

const MarkdownBlocks = () => (
  <div role='none'>
    <ToolbarButton
      Icon={CaretRight}
      title='Block quote'
      getState={(s) => s.blockquote}
      onClick={(s) => ({ type: 'blockquote', data: s ? !s.blockquote : null })}
    />
    <ToolbarButton
      Icon={Code}
      title='Code block'
      getState={(s) => s.blockType === 'codeblock'}
      onClick={(s) => ({ type: 'codeblock', data: s ? s.blockType !== 'codeblock' : null })}
    />
    <ToolbarButton Icon={Table} title='Table' disable={(s) => !!s.blockType} onClick={() => ({ type: 'table' })} />
  </div>
);

const MarkdownLinks = () => (
  <div role='none'>
    <ToolbarButton
      Icon={Link}
      title='Link'
      getState={(s) => s.link}
      onClick={(s) => ({ type: 'link', data: s ? !s.link : null })}
    />
    {/* <ToolbarButton Icon={At} title='Mention' onClick={() => ({ type: 'mention' })} /> */}
    {/* <ToolbarButton Icon={Image} title='Image' onClick={() => ({ type: 'image' })} /> */}
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
