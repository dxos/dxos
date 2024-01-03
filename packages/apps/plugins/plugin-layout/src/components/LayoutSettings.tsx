//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SettingsValue, parseIntentPlugin, useResolvePlugin } from '@dxos/app-framework';
import { Input, useTranslation } from '@dxos/react-ui';

import { LAYOUT_PLUGIN } from '../meta';
import { type LayoutSettingsProps } from '../types';

export const LayoutSettings = ({ settings }: { settings: LayoutSettingsProps }) => {
  const { t } = useTranslation(LAYOUT_PLUGIN);
  const intentPlugin = useResolvePlugin(parseIntentPlugin);

  return (
    <>
      {intentPlugin && (
        <SettingsValue label={t('enable complementary sidebar label')}>
          <Input.Switch
            checked={settings.enableComplementarySidebar}
            onCheckedChange={(checked) =>
              intentPlugin.provides.intent.dispatch({
                plugin: LAYOUT_PLUGIN,
                action: 'dxos.org/plugin/layout/enable-complementary-sidebar',
                data: { state: !!checked },
              })
            }
          />
        </SettingsValue>
      )}
    </>
  );
};
