//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { ControlPage, ControlSection } from '@dxos/react-ui-form';

import { meta } from '../meta';

import { FunctionsPanel } from './FunctionsPanel';

export const FunctionsContainer = ({ space }: { space: Space }) => {
  const { t } = useTranslation(meta.id);
  return (
    <ControlPage>
      <ControlSection
        title={t('functions verbose label', { ns: meta.id })}
        description={t('functions description', { ns: meta.id })}
      >
        <FunctionsPanel space={space} />
      </ControlSection>
    </ControlPage>
  );
};

export default FunctionsContainer;
