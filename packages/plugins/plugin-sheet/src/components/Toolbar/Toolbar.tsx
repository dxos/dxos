//
// Copyright 2024 DXOS.org
//

import {
  type Icon,
  Calendar,
  ChatText,
  CurrencyDollar,
  Eraser,
  HighlighterCircle,
  TextAlignCenter,
  TextAlignLeft,
  TextAlignRight,
} from '@phosphor-icons/react';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import { DensityProvider, ElevationProvider, Toolbar as NaturalToolbar, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { nonNullable } from '@dxos/util';

import { ToolbarButton, ToolbarSeparator, ToolbarToggleButton } from './common';
import { addressToIndex } from '../../defs';
import { SHEET_PLUGIN } from '../../meta';
import { type Formatting } from '../../types';
import { useSheetContext } from '../SheetContext';

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

export type ToolbarProps = PropsWithChildren<{
  onAction?: ToolbarActionHandler;
  role?: string;
}>;

const [ToolbarContextProvider, useToolbarContext] = createContext<ToolbarProps>('Toolbar');

// TODO(Zan): Factor out, copied this from MarkdownPlugin.
const sectionToolbarLayout =
  'bs-[--rail-action] bg-[--sticky-bg] sticky block-start-0 __-block-start-px transition-opacity';

const ToolbarRoot = ({ children, onAction, role }: ToolbarProps) => {
  const { id } = useSheetContext();
  const { hasAttention } = useAttention(id);

  return (
    <ToolbarContextProvider onAction={onAction}>
      <DensityProvider density='fine'>
        <ElevationProvider elevation='chrome'>
          <NaturalToolbar.Root
            classNames={[
              'is-full shrink-0 overflow-x-auto overflow-y-hidden p-1',
              [
                role === 'section'
                  ? ['z-[2] group-focus-within/section:visible', !hasAttention && 'invisible', sectionToolbarLayout]
                  : 'attention-surface',
              ],
            ]}
          >
            {children}
          </NaturalToolbar.Root>
        </ElevationProvider>
      </DensityProvider>
    </ToolbarContextProvider>
  );
};

// TODO(burdon): Generalize.
// TODO(burdon): Detect and display current state.
type ButtonProps = {
  type: ToolbarActionType;
  Icon: Icon;
  getState: (state: Formatting) => boolean;
  disabled?: (state: Formatting) => boolean;
};

//
// Alignment
//

const formatOptions: ButtonProps[] = [
  { type: 'date', Icon: Calendar, getState: (state) => false },
  { type: 'currency', Icon: CurrencyDollar, getState: (state) => false },
];

const Format = () => {
  const { onAction } = useToolbarContext('Format');
  const { t } = useTranslation(SHEET_PLUGIN);

  return (
    <NaturalToolbar.ToggleGroup
      type='single'
      // value={cellStyles.filter(({ getState }) => state && getState(state)).map(({ type }) => type)}
    >
      {formatOptions.map(({ type, getState, Icon }) => (
        <ToolbarToggleButton
          key={type}
          value={type}
          Icon={Icon}
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
  { type: 'left', Icon: TextAlignLeft, getState: (state) => false },
  { type: 'center', Icon: TextAlignCenter, getState: (state) => false },
  { type: 'right', Icon: TextAlignRight, getState: (state) => false },
];

const Alignment = () => {
  const { onAction } = useToolbarContext('Alignment');
  const { t } = useTranslation(SHEET_PLUGIN);

  return (
    <NaturalToolbar.ToggleGroup
      type='single'
      // value={cellStyles.filter(({ getState }) => state && getState(state)).map(({ type }) => type)}
    >
      {alignmentOptions.map(({ type, getState, Icon }) => (
        <ToolbarToggleButton
          key={type}
          value={type}
          Icon={Icon}
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
  { type: 'clear', Icon: Eraser, getState: (state) => false },
  { type: 'highlight', Icon: HighlighterCircle, getState: (state) => false },
];

const Styles = () => {
  const { onAction } = useToolbarContext('Alignment');
  const { t } = useTranslation(SHEET_PLUGIN);

  return (
    <NaturalToolbar.ToggleGroup
      type='single'
      // value={cellStyles.filter(({ getState }) => state && getState(state)).map(({ type }) => type)}
    >
      {styleOptions.map(({ type, getState, Icon }) => (
        <ToolbarToggleButton
          key={type}
          value={type}
          Icon={Icon}
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
      Icon={ChatText}
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
