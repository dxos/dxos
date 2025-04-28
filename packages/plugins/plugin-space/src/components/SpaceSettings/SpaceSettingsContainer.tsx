//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { ControlSection } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';

import { SpacePropertiesForm } from './SpacePropertiesForm';
import { SPACE_PLUGIN } from '../../meta';

export const SPACE_SETTINGS_DIALOG = `${SPACE_PLUGIN}/SpaceSettingsDialog`;

export type SpaceSettingsTab = 'members' | 'settings';

export type SpaceSettingsContainerProps = {
  space: Space;
};

export const SpaceSettingsContainer = ({ space }: SpaceSettingsContainerProps) => {
  const { t } = useTranslation(SPACE_PLUGIN);

  return (
    <StackItem.Content classNames='block overflow-y-auto'>
      <ControlSection
        title={t('space properties settings verbose label', { ns: SPACE_PLUGIN })}
        description={t('space properties settings description', { ns: SPACE_PLUGIN })}
      >
        <SpacePropertiesForm space={space} />
      </ControlSection>
    </StackItem.Content>
  );
};
