//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { ControlPage, ControlSection } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';

import { AUTOMATION_PLUGIN } from '../meta';

import { AutomationPanel, type AutomationPanelProps } from './AutomationPanel';

export const AutomationContainer = (props: AutomationPanelProps) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  return (
    <StackItem.Content classNames='block overflow-y-auto'>
      <ControlPage>
        <ControlSection
          title={t('automation verbose label', { ns: AUTOMATION_PLUGIN })}
          description={t('automation description', { ns: AUTOMATION_PLUGIN })}
        >
          <AutomationPanel {...props} />
        </ControlSection>
      </ControlPage>
    </StackItem.Content>
  );
};

export default AutomationContainer;
