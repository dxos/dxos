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
  CaretDown,
} from '@phosphor-icons/react';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import {
  DensityProvider,
  ElevationProvider,
  Select,
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
        <ElevationProvider elevation='chrome'>
          <NaturalToolbar.Root classNames='is-full shrink-0 overflow-x-auto p-1'>{children}</NaturalToolbar.Root>
        </ElevationProvider>
      </DensityProvider>
    </ToolbarContextProvider>
  );
};

type ToolbarButtonProps = ToolbarToggleGroupItemProps & {
  Icon: Icon;
};

const buttonStyles = 'min-bs-0 p-2';
const iconStyles = getSize(4);

const ToolbarButton = ({ Icon, children, ...props }: ToolbarButtonProps) => {
  return (
    <NaturalToolbar.ToggleGroupItem variant='ghost' {...props} classNames={buttonStyles}>
      <Icon className={iconStyles} />
      <span className='sr-only'>{children}</span>
    </NaturalToolbar.ToggleGroupItem>
  );
};

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
      <Select.Trigger asChild>
        <NaturalToolbar.Button variant='ghost' classNames={buttonStyles}>
          <span className='sr-only'>{t('heading label')}</span>
          <HeadingIcon className={iconStyles} />
          <CaretDown className={getSize(2)} weight='bold' />
        </NaturalToolbar.Button>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content>
          <Select.ScrollUpButton />
          <Select.Viewport>
            <Select.Option value='0'>Paragraph</Select.Option>
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <Select.Option key={level} value={String(level)}>
                Heading {level}
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

const markdownStyles = [
  { key: 'strong' as const, Icon: TextB },
  { key: 'emphasis' as const, Icon: TextItalic },
  { key: 'strikethrough' as const, Icon: TextStrikethrough },
  { key: 'code' as const, Icon: Code },
  { key: 'link' as const, Icon: Link },
  // <ToolbarButton Icon={At} title='Mention' onClick={() => ({ type: 'mention' })} />
  // <ToolbarButton Icon={Image} title='Image' onClick={() => ({ type: 'image' })} />
];

const MarkdownStyles = () => {
  const { onAction, state } = useToolbarContext('MarkdownStyles');
  const { t } = useTranslation(translationKey);

  return (
    <NaturalToolbar.ToggleGroup
      type='multiple'
      value={markdownStyles.filter(({ key }) => !!state?.[key]).map(({ key }) => key)}
    >
      {markdownStyles.map(({ key, Icon }) => (
        <ToolbarButton
          key={key}
          value={key}
          Icon={Icon}
          disabled={state?.blockType === 'codeblock'}
          onClick={() => onAction?.({ type: key, data: state ? !state[key] : null })}
        >
          {t(`${key} label`)}
        </ToolbarButton>
      ))}
    </NaturalToolbar.ToggleGroup>
  );
};

const markdownLists = [
  { key: 'bullet' as const, Icon: ListBullets, actionType: 'list-bullet' as const },
  { key: 'ordered' as const, Icon: ListNumbers, actionType: 'list-ordered' as const },
  { key: 'task' as const, Icon: ListChecks, actionType: 'list-tasks' as const },
];

const MarkdownLists = () => {
  const { onAction, state } = useToolbarContext('MarkdownStyles');
  const { t } = useTranslation(translationKey);
  return (
    <NaturalToolbar.ToggleGroup type='single' value={state?.listStyle ?? undefined}>
      {markdownLists.map(({ key, Icon, actionType }) => (
        <ToolbarButton
          key={key}
          value={key}
          Icon={Icon}
          onClick={() => onAction?.({ type: actionType, data: state ? state.listStyle !== key : null })}
        >
          {t(`${key} label`)}
        </ToolbarButton>
      ))}
    </NaturalToolbar.ToggleGroup>
  );
};

const markdownBlocks = [
  {
    key: 'blockquote' as const,
    Icon: Quotes,
    pressed: (state: Formatting | null) => state?.blockQuote,
    action: (state: Formatting | null) => ({ type: 'blockquote' as const, data: state ? !state.blockQuote : null }),
    disabled: (state: Formatting | null) => false,
  },
  {
    key: 'codeblock' as const,
    Icon: CodeBlock,
    pressed: (state: Formatting | null) => state?.blockType === 'codeblock',
    action: (state: Formatting | null) => ({ type: 'blockquote' as const, data: state ? !state.blockQuote : null }),
    disabled: (state: Formatting | null) => !state?.blankLine,
  },
];

const MarkdownBlocks = () => {
  const { onAction, state } = useToolbarContext('MarkdownStyles');
  const { t } = useTranslation(translationKey);
  return (
    <>
      <NaturalToolbar.ToggleGroup
        type='multiple'
        value={markdownBlocks.filter(({ pressed }) => pressed(state)).map(({ key }) => key)}
      >
        {markdownBlocks.map(({ key, Icon, action }) => (
          <ToolbarButton key={key} value={key} Icon={Icon} onClick={() => onAction?.(action(state))}>
            {t(`${key} label`)}
          </ToolbarButton>
        ))}
      </NaturalToolbar.ToggleGroup>
      <NaturalToolbar.Button
        variant='ghost'
        disabled={!state?.blankLine}
        onClick={() => onAction?.({ type: 'table' })}
        classNames={buttonStyles}
      >
        <Table className={iconStyles} />
        <span className='sr-only'>{t('table label')}</span>
      </NaturalToolbar.Button>
    </>
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
    <NaturalToolbar.Button variant='ghost' onClick={() => onAction?.({ type: 'comment' })} classNames={buttonStyles}>
      <ChatText className={iconStyles} />
      <span className='sr-only'>{t('comment label')}</span>
    </NaturalToolbar.Button>
  );
};

const Separator = () => <div role='none' className='grow' />;

export const Toolbar = {
  Root: ToolbarRoot,
  Button: ToolbarButton,
  Separator,
  Markdown: MarkdownStandard,
  Extended: MarkdownExtended,
};

export { useToolbarContext };
