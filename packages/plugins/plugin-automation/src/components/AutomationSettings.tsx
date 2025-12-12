//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { ControlPage, ControlSection } from '@dxos/react-ui-form';

import { meta } from '../meta';

import { AutomationPanel, type AutomationPanelProps } from './AutomationPanel';
import { TriggersSettings } from './TriggerSettings';

export const AutomationSettings = (props: AutomationPanelProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <ControlPage>
      <ControlSection
        title={t('automation verbose label', { ns: meta.id })}
        description={t('automation description', { ns: meta.id })}
      >
        <AutomationPanel {...props} />
        <TriggersSettings db={props.space.db} />
      </ControlSection>
    </ControlPage>
  );
};

export default AutomationSettings;
