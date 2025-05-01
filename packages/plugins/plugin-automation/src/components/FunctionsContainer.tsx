//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { ControlSection } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';

import { FunctionsPanel } from './FunctionsPanel';
import { AUTOMATION_PLUGIN } from '../meta';

export const FunctionsContainer = ({ space }: { space: Space }) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  return (
    <StackItem.Content classNames='block overflow-y-auto'>
      <div role='none'>
        <ControlSection
          title={t('functions verbose label', { ns: AUTOMATION_PLUGIN })}
          description={t('functions description', { ns: AUTOMATION_PLUGIN })}
        >
          <FunctionsPanel space={space} />
        </ControlSection>
      </div>
    </StackItem.Content>
  );
};

export default FunctionsContainer;
