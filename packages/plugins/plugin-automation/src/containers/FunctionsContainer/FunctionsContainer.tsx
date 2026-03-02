//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { FunctionsPanel } from '../../components/FunctionsPanel';
import { FunctionsRegistry } from '../../components/FunctionsRegistry';
import { meta } from '../../meta';

export const FunctionsContainer = ({ space }: { space: Space }) => {
  const { t } = useTranslation(meta.id);
  return (
    <Settings.Root>
      <Settings.Section
        title={t('functions verbose label', { ns: meta.id })}
        description={t('functions description', { ns: meta.id })}
      >
        <FunctionsPanel space={space} />
      </Settings.Section>
      <Settings.Section
        title={t('functions registry verbose label', { ns: meta.id })}
        description={t('functions registry description', { ns: meta.id })}
      >
        <FunctionsRegistry space={space} />
      </Settings.Section>
    </Settings.Root>
  );
};
