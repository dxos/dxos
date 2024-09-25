//
// Copyright 2024 DXOS.org
//

import { ChatText } from '@phosphor-icons/react';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import {
  DensityProvider,
  ElevationProvider,
  Toolbar as NaturalToolbar,
  type ThemedClassName,
  useTranslation,
} from '@dxos/react-ui';

import { ToolbarButton, ToolbarSeparator } from './common';
import { TABLE_PLUGIN } from '../../meta';

//
// Root
//

// TODO(Zan): This should become a union later.
export type ToolbarAction = { type: 'comment' };

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

//
// Actions
//

const Actions = () => {
  const { onAction } = useToolbarContext('Actions');
  const { t } = useTranslation(TABLE_PLUGIN);

  return (
    <ToolbarButton
      value='comment'
      Icon={ChatText}
      data-testid='editor.toolbar.comment'
      onClick={() => {
        return onAction?.({ type: 'comment' });
      }}
    >
      {t('create comment')}
    </ToolbarButton>
  );
};

export const Toolbar = {
  Root: ToolbarRoot,
  Separator: ToolbarSeparator,
  Actions,
};

export { useToolbarContext };
