//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { ControlSection, ControlPage } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';

import { AutomationPanel } from './AutomationPanel';
import { AUTOMATION_PLUGIN } from '../meta';

export const AutomationContainer = ({ space }: { space: Space }) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  return (
    <StackItem.Content classNames='block overflow-y-auto'>
      <ControlPage>
        <ControlSection
          title={t('automation verbose label', { ns: AUTOMATION_PLUGIN })}
          description={t('automation description', { ns: AUTOMATION_PLUGIN })}
        >
          <AutomationPanel space={space} />
        </ControlSection>
      </ControlPage>
    </StackItem.Content>
  );
};

export default AutomationContainer;
