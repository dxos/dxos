//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { ControlSection } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';

import { AutomationPanel } from './AutomationPanel';
import { AUTOMATION_PLUGIN } from '../meta';

export const AutomationContainer = ({ space }: { space: Space }) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  return (
    <StackItem.Content classNames='block overflow-y-auto'>
      <div>
        <ControlSection
          title={t('automation verbose label', { ns: AUTOMATION_PLUGIN })}
          description={t('automation description', { ns: AUTOMATION_PLUGIN })}
        >
          <AutomationPanel space={space} />
        </ControlSection>
      </div>
    </StackItem.Content>
  );
};

export default AutomationContainer;
