//
// Copyright 2024 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import {
  Icon,
  Toolbar as NaturalToolbar,
  useTranslation,
  Tooltip,
  type ToolbarToggleGroupItemProps as NaturalToolbarToggleGroupItemProps,
  type ToolbarButtonProps as NaturalToolbarButtonProps,
  type ToolbarToggleProps as NaturalToolbarToggleProps,
  type ThemedClassName,
} from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { nonNullable } from '@dxos/util';

import { addressToIndex } from '../../defs';
import { SHEET_PLUGIN } from '../../meta';
import { type Formatting } from '../../types';
import { useSheetContext } from '../SheetContext';

//
// Buttons
//

const buttonStyles = 'min-bs-0 p-2';
const tooltipProps = { side: 'bottom' as const, classNames: 'z-10' };

const ToolbarSeparator = () => <div role='separator' className='grow' />;

//
// ToolbarItem
//

type ToolbarItemProps =
  | (NaturalToolbarButtonProps & { itemType: 'button'; icon: string })
  | (NaturalToolbarToggleGroupItemProps & { itemType: 'toggleGroupItem'; icon: string })
  | (NaturalToolbarToggleProps & { itemType: 'toggle'; icon: string });

export const ToolbarItem = ({ itemType, icon, children, ...props }: ToolbarItemProps) => {
  const Invoker =
    itemType === 'toggleGroupItem'
      ? NaturalToolbar.ToggleGroupItem
      : itemType === 'toggle'
        ? NaturalToolbar.Toggle
        : NaturalToolbar.Button;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        {/* TODO(thure): type the props spread better. */}
        <Invoker variant='ghost' {...(props as any)} classNames={buttonStyles}>
          <Icon icon={icon} size={5} />
          <span className='sr-only'>{children}</span>
        </Invoker>
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

//
// Root
//

type AlignValue = 'left' | 'center' | 'right' | 'unset';
type AlignAction = { type: 'align'; value: AlignValue };

type CommentAction = { type: 'comment'; anchor: string; cellContent?: string };

type FormatValue = 'date' | 'currency' | 'unset';
type FormatAction = { type: 'format'; value: FormatValue };

type StyleValue = 'highlight' | 'unset';
type StyleAction = { type: 'style'; value: StyleValue };

export type ToolbarAction = StyleAction | AlignAction | FormatAction | CommentAction;

export type ToolbarActionType = ToolbarAction['type'];

export type ToolbarActionHandler = (action: ToolbarAction) => void;

export type ToolbarProps = ThemedClassName<
  PropsWithChildren<{
    onAction?: ToolbarActionHandler;
    role?: string;
  }>
>;

const [ToolbarContextProvider, useToolbarContext] = createContext<ToolbarProps>('Toolbar');

// TODO(Zan): Factor out, copied this from MarkdownPlugin.
const sectionToolbarLayout =
  'bs-[--rail-action] bg-[--sticky-bg] sticky block-start-0 __-block-start-px transition-opacity';

const ToolbarRoot = ({ children, onAction, role, classNames }: ToolbarProps) => {
  const { id } = useSheetContext();
  const { hasAttention } = useAttention(id);

  return (
    <ToolbarContextProvider onAction={onAction}>
      <NaturalToolbar.Root
        classNames={[
          ...(role === 'section'
            ? ['z-[2] group-focus-within/section:visible', !hasAttention && 'invisible', sectionToolbarLayout]
            : ['attention-surface']),
          classNames,
        ]}
      >
        {children}
      </NaturalToolbar.Root>
    </ToolbarContextProvider>
  );
};

// TODO(burdon): Generalize.
// TODO(burdon): Detect and display current state.
type ButtonProps<T> = {
  value: T;
  icon: string;
  getState: (state: Formatting) => boolean;
  disabled?: (state: Formatting) => boolean;
};

//
// Alignment
//

const formatOptions: ButtonProps<FormatValue>[] = [
  { value: 'date', icon: 'ph--calendar--regular', getState: (state) => false },
  { value: 'currency', icon: 'ph--currency-dollar--regular', getState: (state) => false },
];

const Format = () => {
  const { onAction } = useToolbarContext('Format');
  const { t } = useTranslation(SHEET_PLUGIN);

  return (
    <NaturalToolbar.ToggleGroup
      type='single'
      // value={cellStyles.filter(({ getState }) => state && getState(state)).map(({ type }) => type)}
    >
      {formatOptions.map(({ value, getState, icon }) => (
        <ToolbarItem
          itemType='toggleGroupItem'
          key={value}
          value={value}
          icon={icon}
          onClick={() => onAction?.({ type: 'format', value })}
        >
          {t(`toolbar ${value} label`)}
        </ToolbarItem>
      ))}
    </NaturalToolbar.ToggleGroup>
  );
};

const alignmentOptions: ButtonProps<AlignValue>[] = [
  { value: 'left', icon: 'ph--text-align-left--regular', getState: (state) => false },
  { value: 'center', icon: 'ph--text-align-center--regular', getState: (state) => false },
  { value: 'right', icon: 'ph--text-align-right--regular', getState: (state) => false },
];

const Alignment = () => {
  const { onAction } = useToolbarContext('Alignment');
  const { t } = useTranslation(SHEET_PLUGIN);

  return (
    <NaturalToolbar.ToggleGroup
      type='single'
      // value={cellStyles.filter(({ getState }) => state && getState(state)).map(({ type }) => type)}
      // disabled={state?.blockType === 'codeblock'}
      onValueChange={(value: AlignValue) => onAction?.({ type: 'align', value })}
    >
      {alignmentOptions.map(({ value, getState, icon }) => (
        <ToolbarItem itemType='toggleGroupItem' key={value} value={value} icon={icon}>
          {t(`toolbar ${value} label`)}
        </ToolbarItem>
      ))}
    </NaturalToolbar.ToggleGroup>
  );
};

const styleOptions: ButtonProps<StyleValue>[] = [
  { value: 'highlight', icon: 'ph--highlighter--regular', getState: (state) => false },
];

const Styles = () => {
  const { onAction } = useToolbarContext('Styles');
  const { t } = useTranslation(SHEET_PLUGIN);

  return (
    <>
      {styleOptions.map(({ value, getState, icon }) => (
        <ToolbarItem
          itemType='toggle'
          key={value}
          onPressedChange={(nextPressed: boolean) =>
            onAction?.({ type: 'style', value: nextPressed ? 'highlight' : 'unset' })
          }
          icon={icon}
        >
          {t(`toolbar ${value} label`)}
        </ToolbarItem>
      ))}
    </>
  );
};

//
// Actions
//

const Actions = () => {
  const { onAction } = useToolbarContext('Actions');
  const { cursor, range, model } = useSheetContext();
  const { t } = useTranslation(SHEET_PLUGIN);

  const overlapsCommentAnchor = (model.sheet.threads ?? [])
    .filter(nonNullable)
    .filter((thread) => thread.status !== 'resolved')
    .some((thread) => {
      if (!cursor) {
        return false;
      }
      return addressToIndex(model.sheet, cursor) === thread.anchor;
    });

  const hasCursor = !!cursor;
  const cursorOnly = hasCursor && !range && !overlapsCommentAnchor;

  const tooltipLabelKey = !hasCursor
    ? 'no cursor label'
    : overlapsCommentAnchor
      ? 'selection overlaps existing comment label'
      : range
        ? 'comment ranges not supported label'
        : 'comment label';

  return (
    <ToolbarItem
      itemType='button'
      value='comment'
      icon='ph--chat-text--regular'
      data-testid='editor.toolbar.comment'
      onClick={() => {
        if (!cursor) {
          return;
        }
        return onAction?.({
          type: 'comment',
          anchor: addressToIndex(model.sheet, cursor),
          cellContent: model.getCellText(cursor),
        });
      }}
      disabled={!cursorOnly || overlapsCommentAnchor}
    >
      {t(tooltipLabelKey)}
    </ToolbarItem>
  );
};

export const Toolbar = {
  Root: ToolbarRoot,
  Separator: ToolbarSeparator,
  Alignment,
  Format,
  Styles,
  Actions,
};

export { useToolbarContext };
