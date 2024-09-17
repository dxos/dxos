//
// Copyright 2024 DXOS.org
//

import {
  DefaultQuickActions,
  DefaultQuickActionsContent,
  TldrawUiMenuItem,
  useActions,
  useReadonly,
} from '@tldraw/tldraw';
import React from 'react';

export const CustomMenu = () => {
  const actions = useActions();
  const isReadonlyMode = useReadonly();
  return (
    <div className='tlui-style-panel__wrapper'>
      <div className='tlui-buttons__horizontal'>
        <DefaultQuickActions>
          <DefaultQuickActionsContent />
          <TldrawUiMenuItem {...actions.snap} disabled={isReadonlyMode} />
        </DefaultQuickActions>
      </div>
    </div>
  );
};
