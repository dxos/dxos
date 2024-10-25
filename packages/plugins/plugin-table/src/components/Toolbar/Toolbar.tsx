//
// Copyright 2024 DXOS.org
//

import { ChatText, RowsPlusBottom } from '@phosphor-icons/react';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import { Toolbar as NaturalToolbar, type ThemedClassName, useTranslation } from '@dxos/react-ui';

import { ToolbarButton, ToolbarSeparator } from './common';
import { TABLE_PLUGIN } from '../../meta';

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

const ToolbarRoot = ({ children, onAction, classNames }: ToolbarProps) => {
  return (
    <ToolbarContextProvider onAction={onAction}>
      <NaturalToolbar.Root classNames={['is-full shrink-0 overflow-x-auto overflow-y-hidden p-1', classNames]}>
        {children}
      </NaturalToolbar.Root>
    </ToolbarContextProvider>
  );
};

//
// Actions
//

const Actions = () => {
  const { onAction } = useToolbarContext('Actions');
  const { t } = useTranslation(TABLE_PLUGIN);

  return (
    <>
      <ToolbarButton
        value='add-row'
        Icon={RowsPlusBottom}
        data-testid='table.toolbar.add-row'
        onClick={() => onAction?.({ type: 'add-row' })}
      >
        {t('add row')}
      </ToolbarButton>
      <ToolbarButton
        value='comment'
        Icon={ChatText}
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
  Separator: ToolbarSeparator,
  Actions,
};

export { useToolbarContext };
