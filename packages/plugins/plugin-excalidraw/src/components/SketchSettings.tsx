//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/react-ui';
import { ControlGroup, ControlItemInput, ControlPage, ControlSection } from '@dxos/react-ui-form';

import { meta } from '../meta';
import { type SketchSettingsProps } from '../types';

export type SketchSettingsComponentProps = {
  settings: SketchSettingsProps;
  onSettingsChange: (fn: (current: SketchSettingsProps) => SketchSettingsProps) => void;
};

export const SketchSettings = ({ settings, onSettingsChange }: SketchSettingsComponentProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <ControlPage>
      <ControlSection title={t('settings title', { ns: meta.id })}>
        <ControlGroup>
          <ControlItemInput title={t('settings hover tools label')}>
            <Input.Switch
              checked={settings.autoHideControls}
              onCheckedChange={(checked) => onSettingsChange((s) => ({ ...s, autoHideControls: !!checked }))}
            />
          </ControlItemInput>

          <ControlItemInput title={t('settings grid type label')}>
            <Input.Switch
              checked={settings.gridType === 'dotted'}
              onCheckedChange={(checked) => onSettingsChange((s) => ({ ...s, gridType: checked ? 'dotted' : 'mesh' }))}
            />
          </ControlItemInput>
        </ControlGroup>
      </ControlSection>
    </ControlPage>
  );
};
