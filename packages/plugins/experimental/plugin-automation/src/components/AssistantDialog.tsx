//
// Copyright 2025 DXOS.org
//

import React, { type FC, useState } from 'react';

import { useCapability, Capabilities, useCapabilities } from '@dxos/app-framework';
import { TranscriptionCapabilities } from '@dxos/plugin-transcription';
import { useTranslation } from '@dxos/react-ui';

import { AmbientDialog } from './AmbientDialog';
import { ThreadContainer } from './Thread';
import { AUTOMATION_PLUGIN } from '../meta';
import { type AutomationSettingsProps, type AIChatType } from '../types';

export const AssistantDialog: FC<{ chat?: AIChatType }> = ({ chat }) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  const transcription = useCapabilities(TranscriptionCapabilities.Transcription).length > 0;
  const settings = useCapability(Capabilities.SettingsStore).getStore<AutomationSettingsProps>(
    AUTOMATION_PLUGIN,
  )?.value;
  const [open, setOpen] = useState(false);

  return (
    <AmbientDialog open={open} onOpenChange={setOpen} title={t('assistant dialog title')}>
      <ThreadContainer chat={chat} onOpenChange={setOpen} settings={settings} transcription={transcription} />
    </AmbientDialog>
  );
};

export default AssistantDialog;
