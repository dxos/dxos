//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/react-ui';
import { ControlGroup, ControlItemInput, ControlPage, ControlSection } from '@dxos/react-ui-form';

import { EXCALIDRAW_PLUGIN } from '../meta';
import { type SketchSettingsProps } from '../types';

export const SketchSettings = ({ settings }: { settings: SketchSettingsProps }) => {
  const { t } = useTranslation(EXCALIDRAW_PLUGIN);

  return (
    <ControlPage>
      <ControlSection title={t('sketch settings title', { ns: EXCALIDRAW_PLUGIN })}>
        <ControlGroup>
          <ControlItemInput title={t('settings hover tools label')}>
            <Input.Switch
              checked={settings.autoHideControls}
              onCheckedChange={(checked) => (settings.autoHideControls = !!checked)}
            />
          </ControlItemInput>

          <ControlItemInput title={t('settings grid type label')}>
            <Input.Switch
              checked={settings.gridType === 'dotted'}
              onCheckedChange={(checked) => (settings.gridType = checked ? 'dotted' : 'mesh')}
            />
          </ControlItemInput>
        </ControlGroup>
      </ControlSection>
    </ControlPage>
  );
};
