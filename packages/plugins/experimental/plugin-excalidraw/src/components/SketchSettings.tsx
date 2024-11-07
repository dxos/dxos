//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/react-ui';
import { DeprecatedFormInput } from '@dxos/react-ui-data';

import { SKETCH_PLUGIN } from '../meta';
import { type SketchSettingsProps } from '../types';

export const SketchSettings = ({ settings }: { settings: SketchSettingsProps }) => {
  const { t } = useTranslation(SKETCH_PLUGIN);

  return (
    <>
      <DeprecatedFormInput label={t('settings hover tools label')}>
        <Input.Switch
          checked={settings.autoHideControls}
          onCheckedChange={(checked) => (settings.autoHideControls = !!checked)}
        />
      </DeprecatedFormInput>

      <DeprecatedFormInput label={t('settings grid type label')}>
        <Input.Switch
          checked={settings.gridType === 'dotted'}
          onCheckedChange={(checked) => (settings.gridType = checked ? 'dotted' : 'mesh')}
        />
      </DeprecatedFormInput>
    </>
  );
};
