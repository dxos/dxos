//
// Copyright 2024 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useCallback, useMemo } from 'react';

import { useIntentDispatcher } from '@dxos/app-framework';
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

import {
  addressToIndex,
  type AlignKey,
  type AlignValue,
  type CommentKey,
  type CommentValue,
  inRange,
  type StyleKey,
  type StyleValue,
} from '../../defs';
import { completeCellRangeToThreadCursor } from '../../integrations';
import { SHEET_PLUGIN } from '../../meta';
import { type SheetType } from '../../types';
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
    role?: string;
  }>
>;

const [ToolbarContextProvider, useToolbarContext] = createContext<{ onAction: (action: ToolbarAction) => void }>(
  'Toolbar',
);

// TODO(Zan): Factor out, copied this from MarkdownPlugin.
const sectionToolbarLayout =
  'bs-[--rail-action] bg-[--sticky-bg] sticky block-start-0 __-block-start-px transition-opacity';

type Range = SheetType['ranges'][number];

const ToolbarRoot = ({ children, role, classNames }: ToolbarProps) => {
  const { id, model, cursorFallbackRange, cursor } = useSheetContext();
  const { hasAttention } = useAttention(id);
  const dispatch = useIntentDispatcher();

  // TODO(Zan): Centralise the toolbar action handler. Current implementation in stories.
  const handleAction = useCallback(
    (action: ToolbarAction) => {
      switch (action.key) {
        case 'align':
          if (cursor && cursorFallbackRange) {
            const index = model.sheet.ranges?.findIndex(
              (range) => range.key === action.key && inRange(range.range, cursor),
            );
            const nextRangeEntity = {
              range: cursorFallbackRange,
              key: action.key,
              value: action.value,
            };
            if (index < 0) {
              model.sheet.ranges?.push(nextRangeEntity);
            } else {
              model.sheet.ranges?.splice(index, 1, nextRangeEntity);
            }
          }
          break;
        case 'style':
          if (action.value === 'unset') {
            const index = model.sheet.ranges?.findIndex((range) => range.key === action.key);
            if (index >= 0) {
              model.sheet.ranges?.splice(index, 1);
            }
          } else if (cursorFallbackRange) {
            model.sheet.ranges?.push({
              range: cursorFallbackRange,
              key: action.key,
              value: action.value,
            });
          }
          break;
        case 'comment': {
          // TODO(Zan): We shouldn't hardcode the action ID.
          if (cursorFallbackRange) {
            void dispatch({
              action: 'dxos.org/plugin/thread/action/create',
              data: {
                cursor: completeCellRangeToThreadCursor(cursorFallbackRange),
                name: action.cellContent,
                subject: model.sheet,
              },
            });
          }
        }
      }
    },
    [model.sheet, cursorFallbackRange, cursor, dispatch],
  );

  return (
    <ToolbarContextProvider onAction={handleAction}>
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
  disabled?: (state: Range) => boolean;
};

//
// Alignment
//

const alignmentOptions: ButtonProps<AlignValue>[] = [
  { value: 'start', icon: 'ph--text-align-left--regular' },
  { value: 'center', icon: 'ph--text-align-center--regular' },
  { value: 'end', icon: 'ph--text-align-right--regular' },
];

const Alignment = () => {
  const { cursor, model } = useSheetContext();
  const { onAction } = useToolbarContext('Alignment');
  const { t } = useTranslation(SHEET_PLUGIN);

  const value = useMemo(
    () =>
      cursor
        ? model.sheet.ranges?.find(({ range, key }) => key === 'alignment' && inRange(range, cursor))?.value
        : undefined,
    [cursor, model.sheet.ranges],
  );

  return (
    <NaturalToolbar.ToggleGroup
      type='single'
      value={value}
      onValueChange={(value: AlignValue) => onAction?.({ key: 'align', value })}
    >
      {alignmentOptions.map(({ value, icon }) => (
        <ToolbarItem itemType='toggleGroupItem' key={value} value={value} icon={icon}>
          {t(`toolbar ${value} label`)}
        </ToolbarItem>
      ))}
    </NaturalToolbar.ToggleGroup>
  );
};

const styleOptions: ButtonProps<StyleValue>[] = [{ value: 'highlight', icon: 'ph--highlighter--regular' }];

const Styles = () => {
  const { cursor, model } = useSheetContext();
  const { onAction } = useToolbarContext('Styles');
  const { t } = useTranslation(SHEET_PLUGIN);

  const activeValues = useMemo(
    () =>
      cursor
        ? model.sheet.ranges
            ?.filter(({ range, key }) => key === 'style' && inRange(range, cursor))
            .reduce((acc, { value }) => {
              acc.add(value);
              return acc;
            }, new Set())
        : undefined,
    [cursor, model.sheet.ranges],
  );

  return (
    <>
      {styleOptions.map(({ value, icon }) => (
        <ToolbarItem
          itemType='toggle'
          key={value}
          pressed={activeValues?.has(value)}
          onPressedChange={(nextPressed: boolean) => onAction?.({ key: 'style', value: nextPressed ? value : 'unset' })}
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
