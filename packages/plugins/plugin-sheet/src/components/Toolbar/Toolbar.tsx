//
// Copyright 2024 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useCallback } from 'react';

import { useIntentDispatcher } from '@dxos/app-framework';
import {
  Icon,
  type ThemedClassName,
  Toolbar as NaturalToolbar,
  type ToolbarButtonProps as NaturalToolbarButtonProps,
  type ToolbarToggleGroupItemProps as NaturalToolbarToggleGroupItemProps,
  type ToolbarToggleProps as NaturalToolbarToggleProps,
  Tooltip,
  useTranslation,
} from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { nonNullable } from '@dxos/util';

import {
  alignKey,
  type AlignKey,
  type AlignValue,
  type CommentKey,
  type CommentValue,
  inRange,
  rangeFromIndex,
  rangeToIndex,
  styleKey,
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
export type ToolbarActionAnnotated = ToolbarAction & { unset?: boolean };

export type ToolbarActionType = ToolbarAction['key'];

export type ToolbarActionHandler = (action: ToolbarActionAnnotated) => void;

export type ToolbarProps = ThemedClassName<
  PropsWithChildren<{
    role?: string;
  }>
>;

const [ToolbarContextProvider, useToolbarContext] = createContext<{
  onAction: (action: ToolbarActionAnnotated) => void;
}>('Toolbar');

type Range = SheetType['ranges'][number];

const ToolbarRoot = ({ children, role, classNames }: ToolbarProps) => {
  const { id, model, cursorFallbackRange, cursor } = useSheetContext();
  const { hasAttention } = useAttention(id);
  const dispatch = useIntentDispatcher();

  // TODO(Zan): Externalize the toolbar action handler. E.g., Toolbar/keys should both fire events.
  const handleAction = useCallback(
    (action: ToolbarActionAnnotated) => {
      switch (action.key) {
        case 'alignment':
          if (cursorFallbackRange) {
            const index =
              model.sheet.ranges?.findIndex(
                (range) =>
                  range.key === action.key &&
                  inRange(rangeFromIndex(model.sheet, range.range), cursorFallbackRange.from),
              ) ?? -1;
            const nextRangeEntity = {
              range: rangeToIndex(model.sheet, cursorFallbackRange),
              key: action.key,
              value: action.value,
            };
            if (index < 0) {
              model.sheet.ranges?.push(nextRangeEntity);
            } else if (model.sheet.ranges![index].value === action.value) {
              model.sheet.ranges?.splice(index, 1);
            } else {
              model.sheet.ranges?.splice(index, 1, nextRangeEntity);
            }
          }
          break;
        case 'style':
          if (action.unset) {
            const index = model.sheet.ranges?.findIndex(
              (range) =>
                range.key === action.key &&
                cursorFallbackRange &&
                inRange(rangeFromIndex(model.sheet, range.range), cursorFallbackRange.from),
            );
            if (index >= 0) {
              model.sheet.ranges?.splice(index, 1);
            }
          } else if (cursorFallbackRange) {
            model.sheet.ranges?.push({
              range: rangeToIndex(model.sheet, cursorFallbackRange),
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
      <NaturalToolbar.Root classNames={['pli-0.5 attention-surface', !hasAttention && 'opacity-0.5', classNames]}>
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

  // TODO(thure): Can this O(n) call be memoized?
  const value = cursor
    ? model.sheet.ranges?.findLast(
        ({ range, key }) => key === alignKey && inRange(rangeFromIndex(model.sheet, range), cursor),
      )?.value
    : undefined;

  return (
    <NaturalToolbar.ToggleGroup
      type='single'
      value={
        // TODO(thure): providing `undefined` leaves the last item active which was active rather than showing none.
        value ?? 'never'
      }
      onValueChange={(value: AlignValue) => onAction?.({ key: alignKey, value })}
    >
      {alignmentOptions.map(({ value, icon }) => (
        <ToolbarItem itemType='toggleGroupItem' key={value} value={value} icon={icon}>
          {t('toolbar action label', {
            key: t(`range key ${alignKey} label`),
            value: t(`range value ${value} label`),
          })}
        </ToolbarItem>
      ))}
    </NaturalToolbar.ToggleGroup>
  );
};

const styleOptions: ButtonProps<StyleValue>[] = [
  { value: 'highlight', icon: 'ph--highlighter--regular' },
  { value: 'softwrap', icon: 'ph--paragraph--regular' },
];

const Styles = () => {
  const { cursorFallbackRange, model } = useSheetContext();
  const { onAction } = useToolbarContext('Styles');
  const { t } = useTranslation(SHEET_PLUGIN);

  // TODO(thure): Can this O(n) call be memoized?
  const activeValues = cursorFallbackRange
    ? model.sheet.ranges
        ?.filter(
          ({ range, key }) => key === 'style' && inRange(rangeFromIndex(model.sheet, range), cursorFallbackRange.from),
        )
        .reduce((acc, { value }) => {
          acc.add(value);
          return acc;
        }, new Set())
    : undefined;

  return (
    <>
      {styleOptions.map(({ value, icon }) => (
        <ToolbarItem
          itemType='toggle'
          key={value}
          pressed={activeValues?.has(value)}
          onPressedChange={(nextPressed: boolean) => {
            onAction?.({ key: 'style', value, unset: !nextPressed });
          }}
          icon={icon}
        >
          {t('toolbar action label', {
            key: t(`range key ${styleKey} label`),
            value: t(`range value ${value} label`),
          })}
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
  const { cursorFallbackRange, cursor, model } = useSheetContext();
  const { t } = useTranslation(SHEET_PLUGIN);

  // TODO(thure): Can this O(n) call be memoized?
  const overlapsCommentAnchor = (model.sheet.threads ?? [])
    .filter(nonNullable)
    .filter((thread) => thread.status !== 'resolved')
    .some((thread) => {
      if (!cursorFallbackRange) {
        return false;
      }
      return rangeToIndex(model.sheet, cursorFallbackRange) === thread.anchor;
    });

  const tooltipLabelKey = !cursor
    ? 'no cursor label'
    : overlapsCommentAnchor
      ? 'selection overlaps existing comment label'
      : 'comment label';

  return (
    <ToolbarItem
      itemType='button'
      value='comment'
      icon='ph--chat-text--regular'
      data-testid='editor.toolbar.comment'
      onClick={() => {
        if (!cursorFallbackRange) {
          return;
        }
        return onAction?.({
          key: 'comment',
          value: rangeToIndex(model.sheet, cursorFallbackRange),
          cellContent: model.getCellText(cursorFallbackRange.from),
        });
      }}
      disabled={!cursorFallbackRange || overlapsCommentAnchor}
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
