//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { ControlPage, ControlSection } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';

import { AUTOMATION_PLUGIN } from '../meta';

import { FunctionsPanel } from './FunctionsPanel';

export const FunctionsContainer = ({ space }: { space: Space }) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  return (
    <StackItem.Content classNames='block overflow-y-auto'>
      <ControlPage>
        <ControlSection
          title={t('functions verbose label', { ns: AUTOMATION_PLUGIN })}
          description={t('functions description', { ns: AUTOMATION_PLUGIN })}
        >
          <FunctionsPanel space={space} />
        </ControlSection>
      </ControlPage>
    </StackItem.Content>
  );
};

export default FunctionsContainer;
