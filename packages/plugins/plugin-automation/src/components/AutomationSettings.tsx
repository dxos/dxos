//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { ControlPage, ControlSection } from '@dxos/react-ui-form';

import { AUTOMATION_PLUGIN } from '../meta';

import { AutomationPanel, type AutomationPanelProps } from './AutomationPanel';

export const AutomationSettings = (props: AutomationPanelProps) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  return (
    <ControlPage>
      <ControlSection
        title={t('automation verbose label', { ns: AUTOMATION_PLUGIN })}
        description={t('automation description', { ns: AUTOMATION_PLUGIN })}
      >
        <AutomationPanel {...props} />
      </ControlSection>
    </ControlPage>
  );
};

export default AutomationSettings;
