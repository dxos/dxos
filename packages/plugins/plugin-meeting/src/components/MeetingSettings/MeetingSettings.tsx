//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/react-ui';
import { DeprecatedFormContainer, DeprecatedFormInput } from '@dxos/react-ui-form';

import { MEETING_PLUGIN } from '../../meta';
import { type MeetingSettingsProps } from '../../types';

export const MeetingSettings = ({ settings }: { settings: MeetingSettingsProps }) => {
  const { t } = useTranslation(MEETING_PLUGIN);

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
