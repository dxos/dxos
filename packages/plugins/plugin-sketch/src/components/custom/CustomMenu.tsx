//
// Copyright 2024 DXOS.org
//

import {
  DefaultQuickActions,
  DefaultQuickActionsContent,
  TldrawUiMenuItem,
  type TLUiStylePanelProps,
  useActions,
  useReadonly,
} from '@tldraw/tldraw';
import React from 'react';

import { mx } from '@dxos/react-ui-theme';

export const CustomMenu = ({ isMobile }: TLUiStylePanelProps) => {
  const actions = useActions();
  const isReadonlyMode = useReadonly();

  return (
    <div>
      <div className={mx('tlui-style-panel', !isMobile && 'tlui-style-panel__wrapper')} data-ismobile={isMobile}>
        <div className='tlui-buttons__horizontal'>
          <DefaultQuickActions>
            <DefaultQuickActionsContent />
            <TldrawUiMenuItem {...actions.snap} disabled={isReadonlyMode} />
          </DefaultQuickActions>
        </div>
      </div>
    </div>
  );
};
