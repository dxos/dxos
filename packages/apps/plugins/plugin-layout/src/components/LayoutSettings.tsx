//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { SettingsValue } from '@braneframe/plugin-settings';
import { parseIntentPlugin, useResolvePlugin } from '@dxos/app-framework';
import { Input, useTranslation } from '@dxos/react-ui';

import { LAYOUT_PLUGIN } from '../meta';
import { type LayoutSettingsProps } from '../types';

export const LayoutSettings = ({ settings }: { settings: LayoutSettingsProps }) => {
  const { t } = useTranslation(LAYOUT_PLUGIN);
  const intentPlugin = useResolvePlugin(parseIntentPlugin);

  return (
    <>
      {intentPlugin && (
        <SettingsValue label={t('settings enable complementary sidebar label')}>
          <Input.Switch
            checked={settings.enableComplementarySidebar}
            onCheckedChange={(checked) => (settings.enableComplementarySidebar = !!checked)}
          />
        </SettingsValue>
      )}
      <SettingsValue label={t('settings show footer label')}>
        <Input.Switch checked={settings.showFooter} onCheckedChange={(checked) => (settings.showFooter = !!checked)} />
      </SettingsValue>
    </>
  );
};
