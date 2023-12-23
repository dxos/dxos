//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SettingsValue, parseIntentPlugin, usePlugin, useResolvePlugin } from '@dxos/app-framework';
import { Input, useTranslation } from '@dxos/react-ui';

import { type LayoutState } from '../LayoutContext';
import { LAYOUT_PLUGIN } from '../meta';

export const LayoutSettings = () => {
  const { t } = useTranslation(LAYOUT_PLUGIN);
  const intentPlugin = useResolvePlugin(parseIntentPlugin);
  const layoutPlugin = usePlugin<{ layout: LayoutState }>(LAYOUT_PLUGIN);
  if (!layoutPlugin || !intentPlugin) {
    return null;
  }

  return (
    <>
      <SettingsValue label={t('enable complementary sidebar label')}>
        <Input.Checkbox
          checked={layoutPlugin.provides.layout.enableComplementarySidebar}
          onCheckedChange={(checked) =>
            intentPlugin.provides.intent.dispatch({
              plugin: LAYOUT_PLUGIN,
              action: 'dxos.org/plugin/layout/enable-complementary-sidebar',
              data: { state: !!checked },
            })
          }
        />
      </SettingsValue>
    </>
  );
};
