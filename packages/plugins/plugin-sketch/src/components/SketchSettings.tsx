//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/react-ui';
import { ControlGroup, ControlItemInput, ControlPage, ControlSection } from '@dxos/react-ui-form';

import { SKETCH_PLUGIN } from '../meta';
import { type SketchSettingsProps } from '../types';

export const SketchSettings = ({ settings }: { settings: SketchSettingsProps }) => {
  const { t } = useTranslation(SKETCH_PLUGIN);

  return (
    <ControlPage>
      <ControlSection title={t('sketch settings title', { ns: SKETCH_PLUGIN })}>
        <ControlGroup>
          <ControlItemInput title={t('settings grid')}>
            <Input.Switch
              checked={settings.showGrid !== false}
              onCheckedChange={(checked) => (settings.showGrid = checked)}
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
