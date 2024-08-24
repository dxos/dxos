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

import {
  DensityProvider,
  ElevationProvider,
  type ThemedClassName,
  Toolbar as NaturalToolbar,
  useTranslation,
} from '@dxos/react-ui';

import { ToolbarButton, ToolbarSeparator, ToolbarToggleButton } from './common';
import { SHEET_PLUGIN } from '../../meta';
import { type Formatting } from '../../types';

//
// Root
//

export type ToolbarAction = {
  type: string;
};

export type ToolbarActionHandler = ({ type }: ToolbarAction) => void;

export type ToolbarProps = ThemedClassName<
  PropsWithChildren<{
    onAction?: ToolbarActionHandler;
  }>
>;

const [ToolbarContextProvider, useToolbarContext] = createContext<ToolbarProps>('Toolbar');

const ToolbarRoot = ({ children, onAction, classNames }: ToolbarProps) => {
  return (
    <ToolbarContextProvider onAction={onAction}>
      <DensityProvider density='fine'>
        <ElevationProvider elevation='chrome'>
          <NaturalToolbar.Root classNames={['is-full shrink-0 overflow-x-auto overflow-y-hidden p-1', classNames]}>
            {children}
          </NaturalToolbar.Root>
        </ElevationProvider>
      </DensityProvider>
    </ToolbarContextProvider>
  );
};

// TODO(burdon): Generalize.
type ButtonProps = {
  type: string;
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
          onClick={() => onAction?.({ type })}
        >
          {t(`toolbar ${type} label`)}
        </ToolbarToggleButton>
      ))}
    </NaturalToolbar.ToggleGroup>
  );
};

// TODO(burdon): Detect and display current state.
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
          onClick={() => onAction?.({ type })}
        >
          {t(`toolbar ${type} label`)}
        </ToolbarToggleButton>
      ))}
    </NaturalToolbar.ToggleGroup>
  );
};

//
// TODO(burdon): Styles picker (colors, etc.)
//

// TODO(burdon): Detect and display current state.
const styleOptions: ButtonProps[] = [
  { type: 'erase', Icon: Eraser, getState: (state) => false },
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
          onClick={() => onAction?.({ type })}
        >
          {t(`toolbar ${type} label`)}
        </ToolbarToggleButton>
      ))}
    </NaturalToolbar.ToggleGroup>
  );
};

//
// TODO(burdon): Format menu (number, etc.)
//

// TODO(burdon): Show range with same formatting.

//
// Actions
//

const Actions = () => {
  // const { onAction } = useToolbarContext('Actions');
  const { t } = useTranslation(SHEET_PLUGIN);
  return (
    <ToolbarButton
      value='comment'
      Icon={ChatText}
      data-testid='editor.toolbar.comment'
      // onClick={() => onAction?.({ type: 'comment' })}
      // disabled={!state || state.comment || !state.selection}
    >
      {t('comment label')}
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
