//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { LayoutAction, createIntent, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { type Node } from '@dxos/plugin-graph';
import { IconButton, toLocalizedString, useTranslation } from '@dxos/react-ui';

import { MobileLayoutState } from '../capabilities';
import { meta } from '../meta';

export const NavHeader = ({ node }: { node?: Node }) => {
  const { t } = useTranslation(meta.id);
  const layout = useCapability(MobileLayoutState);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const label = node ? toLocalizedString(node.properties.label, t) : 'Unknown';

  const handleClick = useCallback(async () => {
    if (layout.active) {
      await dispatch(
        createIntent(LayoutAction.Close, { part: 'main', subject: [layout.active], options: { state: false } }),
      );
    } else {
      await dispatch(createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: 'default' }));
    }
  }, [dispatch]);

  return (
    <div>
      <IconButton iconOnly icon='ph--arrow--left' label={t('back label')} onClick={handleClick} />
      <h1>{label}</h1>
    </div>
  );
};
