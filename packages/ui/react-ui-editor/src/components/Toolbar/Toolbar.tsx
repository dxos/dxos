//
// Copyright 2024 DXOS.org
//

import {
  type Icon,
  ChatText,
  Code,
  CodeBlock,
  Image,
  Link,
  ListBullets,
  ListChecks,
  ListNumbers,
  Paragraph,
  Quotes,
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
} from '@phosphor-icons/react';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';

import {
  DensityProvider,
  ElevationProvider,
  Select,
  Toolbar as NaturalToolbar,
  Tooltip,
  type ThemedClassName,
  type ToolbarToggleGroupItemProps as NaturalToolbarToggleGroupItemProps,
  type ToolbarButtonProps as NaturalToolbarButtonProps,
  useTranslation,
} from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { type Formatting } from '../../extensions';
import { translationKey } from '../../translations';

const tooltipProps = { side: 'top' as const, classNames: 'z-10' };

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
    state: Formatting | undefined;
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

type ToolbarToggleButtonProps = NaturalToolbarToggleGroupItemProps & { Icon: Icon };

const ToolbarToggleButton = ({ Icon, children, ...props }: ToolbarToggleButtonProps) => {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <NaturalToolbar.ToggleGroupItem variant='ghost' {...props} classNames={buttonStyles}>
          <Icon className={iconStyles} />
          <span className='sr-only'>{children}</span>
        </NaturalToolbar.ToggleGroupItem>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content {...tooltipProps}>
          {children}
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};

type ToolbarButtonProps = NaturalToolbarButtonProps & { Icon: Icon };

const ToolbarButton = ({ Icon, children, ...props }: ToolbarButtonProps) => {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <NaturalToolbar.Button variant='ghost' {...props} classNames={buttonStyles}>
          <Icon className={iconStyles} />
          <span className='sr-only'>{children}</span>
        </NaturalToolbar.Button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content {...tooltipProps}>
          {children}
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
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
  const suppressNextTooltip = useRef<boolean>(false);
  const [tooltipOpen, setTooltipOpen] = useState<boolean>(false);
  const [selectOpen, setSelectOpen] = useState<boolean>(false);
  return (
    <Tooltip.Root
      open={tooltipOpen}
      onOpenChange={(nextOpen) => {
        if (nextOpen && suppressNextTooltip.current) {
          suppressNextTooltip.current = false;
          return setTooltipOpen(false);
        } else {
          return setTooltipOpen(nextOpen);
        }
      }}
    >
      <Select.Root
        disabled={value === null}
        value={value ?? '0'}
        open={selectOpen}
        onOpenChange={(nextOpen: boolean) => {
          if (!nextOpen) {
            suppressNextTooltip.current = true;
          }
          return setSelectOpen(nextOpen);
        }}
        onValueChange={(value) => onAction?.({ type: 'heading', data: parseInt(value) })}
      >
        <Tooltip.Trigger asChild>
          <NaturalToolbar.Button asChild>
            <Select.TriggerButton variant='ghost' classNames={buttonStyles}>
              <span className='sr-only'>{t('heading label')}</span>
              <HeadingIcon className={iconStyles} />
            </Select.TriggerButton>
          </NaturalToolbar.Button>
        </Tooltip.Trigger>
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
      <Tooltip.Portal>
        <Tooltip.Content {...tooltipProps}>
          {t('heading label')}
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
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
        <ToolbarToggleButton
          key={type}
          value={type}
          Icon={Icon}
          disabled={state?.blockType === 'codeblock'}
          onClick={state ? () => onAction?.({ type, data: !getState(state) }) : undefined}
        >
          {t(`${type} label`)}
        </ToolbarToggleButton>
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
        <ToolbarToggleButton
          key={type}
          value={type}
          Icon={Icon}
          onClick={state ? () => onAction?.({ type, data: !getState(state) }) : undefined}
        >
          {t(`${type} label`)}
        </ToolbarToggleButton>
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
        <ToolbarToggleButton
          key={type}
          value={type}
          Icon={Icon}
          disabled={!state || disabled?.(state)}
          onClick={state ? () => onAction?.({ type, data: !getState(state) }) : undefined}
        >
          {t(`${type} label`)}
        </ToolbarToggleButton>
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

// TODO(burdon): Make extensible.
export type MarkdownCustomOptions = {
  onUpload?: (file: File) => Promise<{ url?: string }>;
};

const MarkdownCustom = ({ onUpload }: MarkdownCustomOptions = {}) => {
  const { onAction } = useToolbarContext('MarkdownStyles');
  const { t } = useTranslation(translationKey);
  // https://react-dropzone.js.org/#src
  const { acceptedFiles, getInputProps, open } = useDropzone({
    multiple: false,
    noDrag: true,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
    },
  });

  useEffect(() => {
    if (onUpload && acceptedFiles.length) {
      setTimeout(async () => {
        // NOTE: Clone file since react-dropzone patches in a non-standard `path` property, which confuses IPFS.
        const f = acceptedFiles[0];
        const file = new File([f], f.name, {
          type: f.type,
          lastModified: f.lastModified,
        });

        const { url } = await onUpload(file);
        if (url) {
          onAction?.({ type: 'image', data: url });
        }
      });
    }
  }, [acceptedFiles]);

  return (
    <>
      <input {...getInputProps()} />
      <ToolbarButton value='image' Icon={Image} onClick={() => open()}>
        {t('image label')}
      </ToolbarButton>
    </>
  );
};

// TODO(burdon): Make extensible.
const MarkdownActions = () => {
  const { onAction } = useToolbarContext('MarkdownStyles');
  const { t } = useTranslation(translationKey);
  return (
    <>
      {/* TODO(burdon): Toggle readonly state. */}
      {/* <ToolbarButton value='comment' Icon={BookOpenText} onClick={() => onAction?.({ type: 'comment' })}> */}
      {/*  {t('comment label')} */}
      {/* </ToolbarButton> */}
      <ToolbarButton
        value='comment'
        Icon={ChatText}
        data-testid='editor.toolbar.comment'
        onClick={() => onAction?.({ type: 'comment' })}
      >
        {t('comment label')}
      </ToolbarButton>
    </>
  );
};

export const Toolbar = {
  Root: ToolbarRoot,
  Button: ToolbarToggleButton,
  Separator: ToolbarSeparator,
  Markdown: MarkdownStandard,
  Custom: MarkdownCustom,
  Actions: MarkdownActions,
};

export { useToolbarContext };
