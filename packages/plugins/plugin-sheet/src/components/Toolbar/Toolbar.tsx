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
import {
  type AlignKey,
  type AlignValue,
  type CommentKey,
  type CommentValue,
  type StyleKey,
  type StyleValue,
} from '../../defs/sheet-range-types';
import { SHEET_PLUGIN } from '../../meta';
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

type AlignAction = { key: AlignKey; value: AlignValue };
type CommentAction = { key: CommentKey; value: CommentValue; cellContent?: string };
type StyleAction = { key: StyleKey; value: StyleValue };

export type ToolbarAction = StyleAction | AlignAction | CommentAction;

export type ToolbarActionType = ToolbarAction['key'];

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
  getState: (state: Range) => boolean;
  disabled?: (state: Range) => boolean;
};

//
// Alignment
//

const alignmentOptions: ButtonProps<AlignValue>[] = [
  { value: 'start', icon: 'ph--text-align-left--regular', getState: (state) => false },
  { value: 'center', icon: 'ph--text-align-center--regular', getState: (state) => false },
  { value: 'end', icon: 'ph--text-align-right--regular', getState: (state) => false },
];

const Alignment = () => {
  const { onAction } = useToolbarContext('Alignment');
  const { t } = useTranslation(SHEET_PLUGIN);

  return (
    <NaturalToolbar.ToggleGroup
      type='single'
      // value={cellStyles.filter(({ getState }) => state && getState(state)).map(({ type }) => type)}
      // disabled={state?.blockType === 'codeblock'}
      onValueChange={(value: AlignValue) => onAction?.({ key: 'align', value })}
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
            onAction?.({ key: 'style', value: nextPressed ? 'highlight' : 'unset' })
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
          key: 'comment',
          value: addressToIndex(model.sheet, cursor),
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
  Styles,
  Actions,
};

export { useToolbarContext };
