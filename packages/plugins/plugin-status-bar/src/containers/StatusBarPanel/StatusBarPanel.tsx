//
// Copyright 2024 DXOS.org
//

import React from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as DeckRole from '@dxos/plugin-deck/DeckRole';

import StatusBarActionsDefault from '../StatusBarActions/index.ts';

export type StatusBarPanelProps = {};

export const StatusBarPanel = (_props: StatusBarPanelProps) => {
  return (
    <>
      <StatusBarActionsDefault />
      <span role='separator' className='grow' />
      <Surface.Root.Surface type={DeckRole.StatusBar} />
    </>
  );
};

StatusBarPanel.displayName = 'StatusBarPanel';
