//
// Copyright 2025 DXOS.org
//

import React, { type FC, useState } from 'react';

import { useTranslation } from '@dxos/react-ui';

import { AUTOMATION_PLUGIN } from '../../meta';
import { type AIChatType } from '../../types';
import { AmbientDialog } from '../AmbientDialog';
import { ThreadContainer } from '../Thread';

export const AssistantDialog: FC<{ chat?: AIChatType }> = ({ chat }) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  const [open, setOpen] = useState(false);

  return (
    <AmbientDialog open={open} onOpenChange={setOpen} title={t('assistant dialog title')}>
      <ThreadContainer chat={chat} onOpenChange={setOpen} />
    </AmbientDialog>
  );
};
