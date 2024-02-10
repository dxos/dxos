//
// Copyright 2024 DXOS.org
//

import {
  type Icon,
  ChatText,
  Code,
  CodeBlock,
  Link,
  ListBullets,
  ListChecks,
  ListNumbers,
  Paragraph,
  TextStrikethrough,
  Table,
  TextB,
  TextHOne,
  TextHTwo,
  TextHThree,
  TextHFour,
  TextHFive,
  TextHSix,
  TextItalic,
  Quotes,
} from '@phosphor-icons/react';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import {
  DensityProvider,
  ElevationProvider,
  Select,
  type ThemedClassName,
  Toolbar as NaturalToolbar,
  type ToolbarToggleGroupItemProps,
  useTranslation,
} from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { type Formatting } from '../../extensions';
import { translationKey } from '../../translations';

const HeadingIcons: { [key: string]: Icon } = {
  '0': Paragraph,
  '1': TextHOne,
  '2': TextHTwo,
  '3': TextHThree,
  '4': TextHFour,
  '5': TextHFive,
  '6': TextHSix,
};

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
  | 'list-task'
  | 'mention'
  | 'prompt'
  | 'strikethrough'
  | 'table';

export type Action = {
  type: ActionType;
  data?: any;
};

export type ToolbarProps = ThemedClassName<
  PropsWithChildren<{
    state: Formatting | null;
    onAction?: (action: Action) => void;
  }>
>;

const [ToolbarContextProvider, useToolbarContext] = createContext<ToolbarProps>('Toolbar');

const ToolbarRoot = ({ children, onAction, classNames, state }: ToolbarProps) => {
  return (
    <ToolbarContextProvider onAction={onAction} state={state}>
      <DensityProvider density='fine'>
        <ElevationProvider elevation='chrome'>
          <NaturalToolbar.Root classNames={['is-full shrink-0 overflow-x-auto p-1', classNames]}>
            {children}
          </NaturalToolbar.Root>
        </ElevationProvider>
      </DensityProvider>
    </ToolbarContextProvider>
  );
};

const buttonStyles = 'min-bs-0 p-2';
const iconStyles = getSize(5);

type ButtonProps = {
  type: ActionType;
  Icon: Icon;
  getState: (state: Formatting) => boolean;
  disabled?: (state: Formatting) => boolean;
};

type ToolbarButtonProps = ToolbarToggleGroupItemProps & { Icon: Icon };

const ToolbarButton = ({ Icon, children, ...props }: ToolbarButtonProps) => {
  return (
    <NaturalToolbar.ToggleGroupItem variant='ghost' {...props} classNames={buttonStyles}>
      <Icon className={iconStyles} />
      <span className='sr-only'>{children}</span>
    </NaturalToolbar.ToggleGroupItem>
  );
};

const ToolbarSeparator = () => <div role='separator' className='grow' />;

const MarkdownHeading = () => {
  const { t } = useTranslation(translationKey);
  const { onAction, state } = useToolbarContext('MarkdownFormatting');
  const blockType = state ? state.blockType : 'paragraph';
  const header = blockType && /heading(\d)/.exec(blockType);
  const value = header ? header[1] : blockType === 'paragraph' || !blockType ? '0' : undefined;
  const HeadingIcon = HeadingIcons[value ?? '0'];
  return (
    <Select.Root
      disabled={value === null}
      value={value ?? '0'}
      onValueChange={(value) => onAction?.({ type: 'heading', data: parseInt(value) })}
    >
      <NaturalToolbar.Button asChild>
        <Select.TriggerButton variant='ghost' classNames={buttonStyles}>
          <span className='sr-only'>{t('heading label')}</span>
          <HeadingIcon className={iconStyles} />
        </Select.TriggerButton>
      </NaturalToolbar.Button>
      <Select.Portal>
        <Select.Content>
          <Select.ScrollUpButton />
          <Select.Viewport>
            <Select.Option value='0'>
              <Paragraph className={iconStyles} />
            </Select.Option>
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <Select.Option key={level} value={String(level)}>
                {level === 1 && <TextHOne className={iconStyles} />}
                {level === 2 && <TextHTwo className={iconStyles} />}
                {level === 3 && <TextHThree className={iconStyles} />}
                {level === 4 && <TextHFour className={iconStyles} />}
                {level === 5 && <TextHFive className={iconStyles} />}
                {level === 6 && <TextHSix className={iconStyles} />}
              </Select.Option>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton />
          <Select.Arrow />
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};

const markdownStyles: ButtonProps[] = [
  { type: 'strong', Icon: TextB, getState: (state) => state.strong },
  { type: 'emphasis', Icon: TextItalic, getState: (state) => state.emphasis },
  { type: 'strikethrough', Icon: TextStrikethrough, getState: (state) => state.strikethrough },
  { type: 'code', Icon: Code, getState: (state) => state.code },
  { type: 'link', Icon: Link, getState: (state) => state.link },
];

const MarkdownStyles = () => {
  const { onAction, state } = useToolbarContext('MarkdownStyles');
  const { t } = useTranslation(translationKey);

  return (
    <NaturalToolbar.ToggleGroup
      type='multiple'
      value={markdownStyles.filter(({ getState }) => state && getState(state)).map(({ type }) => type)}
    >
      {markdownStyles.map(({ type, getState, Icon }) => (
        <ToolbarButton
          key={type}
          value={type}
          Icon={Icon}
          disabled={state?.blockType === 'codeblock'}
          onClick={state ? () => onAction?.({ type, data: !getState(state) }) : undefined}
        >
          {t(`${type} label`)}
        </ToolbarButton>
      ))}
    </NaturalToolbar.ToggleGroup>
  );
};

const markdownLists: ButtonProps[] = [
  { type: 'list-bullet', Icon: ListBullets, getState: (state) => state.listStyle === 'bullet' },
  { type: 'list-ordered', Icon: ListNumbers, getState: (state) => state.listStyle === 'ordered' },
  { type: 'list-task', Icon: ListChecks, getState: (state) => state.listStyle === 'task' },
];

const MarkdownLists = () => {
  const { onAction, state } = useToolbarContext('MarkdownStyles');
  const { t } = useTranslation(translationKey);
  return (
    <NaturalToolbar.ToggleGroup type='single' value={state?.listStyle ? `list-${state.listStyle}` : ''}>
      {markdownLists.map(({ type, getState, Icon }) => (
        <ToolbarButton
          key={type}
          value={type}
          Icon={Icon}
          onClick={state ? () => onAction?.({ type, data: !getState(state) }) : undefined}
        >
          {t(`${type} label`)}
        </ToolbarButton>
      ))}
    </NaturalToolbar.ToggleGroup>
  );
};

const markdownBlocks: ButtonProps[] = [
  {
    type: 'blockquote',
    Icon: Quotes,
    getState: (state) => state.blockQuote,
  },
  {
    type: 'codeblock',
    Icon: CodeBlock,
    getState: (state) => state.blockType === 'codeblock',
    disabled: (state) => !state.blankLine,
  },
  {
    type: 'table',
    Icon: Table,
    getState: (state) => state.blockType === 'tablecell',
    disabled: (state) => !state.blankLine,
  },
];

const MarkdownBlocks = () => {
  const { onAction, state } = useToolbarContext('MarkdownStyles');
  const { t } = useTranslation(translationKey);
  const value = markdownBlocks.find(({ getState }) => state && getState(state));
  return (
    <NaturalToolbar.ToggleGroup type='single' value={value?.type ?? ''}>
      {markdownBlocks.map(({ type, disabled, getState, Icon }) => (
        <ToolbarButton
          key={type}
          value={type}
          Icon={Icon}
          disabled={!state || disabled?.(state)}
          onClick={state ? () => onAction?.({ type, data: !getState(state) }) : undefined}
        >
          {t(`${type} label`)}
        </ToolbarButton>
      ))}
    </NaturalToolbar.ToggleGroup>
  );
};

const MarkdownStandard = () => (
  <>
    <MarkdownHeading />
    <MarkdownStyles />
    <MarkdownLists />
    <MarkdownBlocks />
  </>
);

const MarkdownExtended = () => {
  const { onAction } = useToolbarContext('MarkdownStyles');
  const { t } = useTranslation(translationKey);
  return (
    <NaturalToolbar.Button
      variant='ghost'
      data-testid='editor.toolbar.comment'
      onClick={() => onAction?.({ type: 'comment' })}
      classNames={buttonStyles}
    >
      <ChatText className={iconStyles} />
      <span className='sr-only'>{t('comment label')}</span>
    </NaturalToolbar.Button>
  );
};

export const Toolbar = {
  Root: ToolbarRoot,
  Button: ToolbarButton,
  Separator: ToolbarSeparator,
  Markdown: MarkdownStandard,
  Extended: MarkdownExtended,
};

export { useToolbarContext };
