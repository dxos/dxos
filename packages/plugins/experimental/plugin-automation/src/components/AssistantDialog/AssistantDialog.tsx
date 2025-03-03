//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';

import { useTranslation } from '@dxos/react-ui';

import { AmbientDialog } from './AmbientDialog';
import { AUTOMATION_PLUGIN } from '../../meta';
import { type AIChatType } from '../../types';
import { ThreadContainer } from '../Thread';

export const AssistantDialog: FC<{ chat?: AIChatType }> = ({ chat }) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);

  return (
    <AmbientDialog title={t('assistant dialog title')}>
      <ThreadContainer chat={chat} />
    </AmbientDialog>
  );
};
