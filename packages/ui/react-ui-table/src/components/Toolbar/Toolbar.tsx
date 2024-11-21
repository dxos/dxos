//
// Copyright 2024 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import { Toolbar as NaturalToolbar, type ThemedClassName, useTranslation } from '@dxos/react-ui';

import { ToolbarButton, ToolbarSeparator } from './common';
import { translationKey } from '../../translations';

//
// Root
//

// TODO(Zan): This should become a union later.
export type ToolbarAction = { type: 'add-row' } | { type: 'comment' };

export type ToolbarActionType = ToolbarAction['type'];

export type ToolbarActionHandler = (action: ToolbarAction) => void;

export type ToolbarProps = ThemedClassName<
  PropsWithChildren<{
    onAction?: ToolbarActionHandler;
  }>
>;

const [ToolbarContextProvider, useToolbarContext] = createContext<ToolbarProps>('Toolbar');

const ToolbarRoot = ({ classNames, children, onAction }: ToolbarProps) => {
  return (
    <ToolbarContextProvider onAction={onAction}>
      <NaturalToolbar.Root
        classNames={['is-full shrink-0 overflow-x-auto overflow-y-hidden p-1 attention-surface', classNames]}
      >
        {children}
      </NaturalToolbar.Root>
    </ToolbarContextProvider>
  );
};

const Editing = () => {
  const { onAction } = useToolbarContext('Editing');
  const { t } = useTranslation(translationKey);

  return (
    <>
      <ToolbarButton
        value='add-row'
        icon='ph--plus--regular'
        data-testid='table.toolbar.add-row'
        onClick={() => onAction?.({ type: 'add-row' })}
      >
        {t('add row')}
      </ToolbarButton>
    </>
  );
};

const Actions = () => {
  const { onAction } = useToolbarContext('Actions');
  const { t } = useTranslation(translationKey);

  return (
    <>
      <ToolbarButton
        value='comment'
        icon='ph--chat-text--regular'
        data-testid='table.toolbar.comment'
        onClick={() => onAction?.({ type: 'comment' })}
      >
        {t('create comment')}
      </ToolbarButton>
    </>
  );
};

export const Toolbar = {
  Root: ToolbarRoot,
  Editing,
  Actions,
  Separator: ToolbarSeparator,
};

export { useToolbarContext };
