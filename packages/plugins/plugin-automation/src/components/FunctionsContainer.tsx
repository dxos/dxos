//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { ControlPage, ControlSection } from '@dxos/react-ui-form';

import { AUTOMATION_PLUGIN } from '../meta';

import { FunctionsPanel } from './FunctionsPanel';

export const FunctionsContainer = ({ space }: { space: Space }) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  return (
    <ControlPage>
      <ControlSection
        title={t('functions verbose label', { ns: AUTOMATION_PLUGIN })}
        description={t('functions description', { ns: AUTOMATION_PLUGIN })}
      >
        <FunctionsPanel space={space} />
      </ControlSection>
    </ControlPage>
  );
};

export default FunctionsContainer;
