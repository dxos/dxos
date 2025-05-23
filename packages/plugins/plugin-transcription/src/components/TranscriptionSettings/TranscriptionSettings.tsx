//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/react-ui';
import { DeprecatedFormContainer, DeprecatedFormInput } from '@dxos/react-ui-form';

import { TRANSCRIPTION_PLUGIN } from '../../meta';
import { type TranscriptionSettingsProps } from '../../types';

export const TranscriptionSettings = ({ settings }: { settings: TranscriptionSettingsProps }) => {
  const { t } = useTranslation(TRANSCRIPTION_PLUGIN);

  return (
    <DeprecatedFormContainer>
      <DeprecatedFormInput label={t('settings entity extraction label')}>
        <Input.Switch
          checked={!!settings.entityExtraction}
          onCheckedChange={(checked) => (settings.entityExtraction = checked)}
        />
      </DeprecatedFormInput>
    </DeprecatedFormContainer>
  );
};
