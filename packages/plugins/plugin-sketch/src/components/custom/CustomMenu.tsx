//
// Copyright 2024 DXOS.org
//

import {
  DefaultQuickActions,
  DefaultQuickActionsContent,
  type TLUiStylePanelProps,
  TldrawUiMenuItem,
  useActions,
  useReadonly,
} from '@tldraw/tldraw';
import React from 'react';

export const CustomMenu = ({ isMobile }: TLUiStylePanelProps) => {
  const actions = useActions();
  const isReadonlyMode = useReadonly();

  return (
    <div className='tlui-style-panel__wrapper'>
      <div className='tlui-menu'>
        <div className='tlui-buttons__horizontal' data-ismobile={isMobile}>
          <DefaultQuickActions>
            <DefaultQuickActionsContent />
            <TldrawUiMenuItem {...actions.snap} disabled={isReadonlyMode} />
          </DefaultQuickActions>
        </div>
      </div>
    </div>
  );
};
