//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/react-ui';
import { ControlGroup, ControlItemInput, ControlPage, ControlSection } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import { type Meeting } from '../../types';

export const MeetingSettings = ({ settings }: { settings: Meeting.Settings }) => {
  const { t } = useTranslation(meta.id);

  return (
    <ControlPage>
      <ControlSection title={t('settings title', { ns: meta.id })}>
        <ControlGroup>
          <ControlItemInput title={t('entity extraction label')} description={t('entity extraction description')}>
            <Input.Switch
              checked={!!settings.entityExtraction}
              onCheckedChange={(checked) => (settings.entityExtraction = checked)}
            />
          </ControlItemInput>
        </ControlGroup>
      </ControlSection>
    </ControlPage>
  );
};
