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
const tooltipProps = { side: 'top' as const, classNames: 'z-10' };

const ToolbarSeparator = () => <div role='separator' className='grow' />;

//
// ToolbarButton
//

type ToolbarButtonProps = NaturalToolbarButtonProps & { icon: string };

export const ToolbarButton = ({ icon, children, ...props }: ToolbarButtonProps) => {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <NaturalToolbar.Button variant='ghost' {...props} classNames={buttonStyles}>
          <Icon icon={icon} size={5} />
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

//
// ToolbarToggleButton
//

export type ToolbarToggleButtonProps = NaturalToolbarToggleGroupItemProps & { icon: string };

export const ToolbarToggleButton = ({ icon, children, ...props }: ToolbarToggleButtonProps) => {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <NaturalToolbar.ToggleGroupItem variant='ghost' {...props} classNames={buttonStyles}>
          <Icon icon={icon} size={5} />
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

//
// Root
//

export type ToolbarAction =
  | { type: 'clear' }
  | { type: 'highlight' }
  | { type: 'left' }
  | { type: 'center' }
  | { type: 'right' }
  | { type: 'date' }
  | { type: 'currency' }
  | { type: 'comment'; anchor: string; cellContent?: string };

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
type ButtonProps = {
  type: ToolbarActionType;
  icon: string;
  getState: (state: Formatting) => boolean;
  disabled?: (state: Formatting) => boolean;
};

//
// Alignment
//

const formatOptions: ButtonProps[] = [
  { type: 'date', icon: 'ph--calendar--regular', getState: (state) => false },
  { type: 'currency', icon: 'ph--currency-dollar--regular', getState: (state) => false },
];

const Format = () => {
  const { onAction } = useToolbarContext('Format');
  const { t } = useTranslation(SHEET_PLUGIN);

  return (
    <NaturalToolbar.ToggleGroup
      type='single'
      // value={cellStyles.filter(({ getState }) => state && getState(state)).map(({ type }) => type)}
    >
      {formatOptions.map(({ type, getState, icon }) => (
        <ToolbarToggleButton
          key={type}
          value={type}
          icon={icon}
          // disabled={state?.blockType === 'codeblock'}
          // onClick={state ? () => onAction?.({ type, data: !getState(state) }) : undefined}
          onClick={() => onAction?.({ type: type as Exclude<typeof type, 'comment'> })}
        >
          {t(`toolbar ${type} label`)}
        </ToolbarToggleButton>
      ))}
    </NaturalToolbar.ToggleGroup>
  );
};

const alignmentOptions: ButtonProps[] = [
  { type: 'left', icon: 'ph--text-align-left--regular', getState: (state) => false },
  { type: 'center', icon: 'ph--text-align-center--regular', getState: (state) => false },
  { type: 'right', icon: 'ph--text-align-right--regular', getState: (state) => false },
];

const Alignment = () => {
  const { onAction } = useToolbarContext('Alignment');
  const { t } = useTranslation(SHEET_PLUGIN);

  return (
    <NaturalToolbar.ToggleGroup
      type='single'
      // value={cellStyles.filter(({ getState }) => state && getState(state)).map(({ type }) => type)}
    >
      {alignmentOptions.map(({ type, getState, icon }) => (
        <ToolbarToggleButton
          key={type}
          value={type}
          icon={icon}
          // disabled={state?.blockType === 'codeblock'}
          // onClick={state ? () => onAction?.({ type, data: !getState(state) }) : undefined}
          onClick={() => onAction?.({ type: type as Exclude<typeof type, 'comment'> })}
        >
          {t(`toolbar ${type} label`)}
        </ToolbarToggleButton>
      ))}
    </NaturalToolbar.ToggleGroup>
  );
};

const styleOptions: ButtonProps[] = [
  { type: 'clear', icon: 'ph--eraser--regular', getState: (state) => false },
  { type: 'highlight', icon: 'ph--highlighter--regular', getState: (state) => false },
];

const Styles = () => {
  const { onAction } = useToolbarContext('Alignment');
  const { t } = useTranslation(SHEET_PLUGIN);

  return (
    <NaturalToolbar.ToggleGroup
      type='single'
      // value={cellStyles.filter(({ getState }) => state && getState(state)).map(({ type }) => type)}
    >
      {styleOptions.map(({ type, getState, icon }) => (
        <ToolbarToggleButton
          key={type}
          value={type}
          icon={icon}
          // disabled={state?.blockType === 'codeblock'}
          // onClick={state ? () => onAction?.({ type, data: !getState(state) }) : undefined}
          onClick={() => onAction?.({ type: type as Exclude<typeof type, 'comment'> })}
        >
          {t(`toolbar ${type} label`)}
        </ToolbarToggleButton>
      ))}
    </NaturalToolbar.ToggleGroup>
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
    <ToolbarButton
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
    </ToolbarButton>
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
