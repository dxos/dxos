//
// Copyright 2025 DXOS.org
//

import React, { type FC, useState } from 'react';

import { useCapability, Capabilities, useCapabilities } from '@dxos/app-framework';
import { TranscriptionCapabilities } from '@dxos/plugin-transcription';
import { useTranslation } from '@dxos/react-ui';

import { ChatDialog } from './ChatDialog';
import { ThreadContainer } from './Thread';
import { ASSISTANT_PLUGIN } from '../meta';
import { type AssistantSettingsProps, type AIChatType } from '../types';

export const AssistantDialog: FC<{ chat?: AIChatType }> = ({ chat }) => {
  const { t } = useTranslation(ASSISTANT_PLUGIN);
  const transcription = useCapabilities(TranscriptionCapabilities.Transcriber).length > 0;
  const settings = useCapability(Capabilities.SettingsStore).getStore<AssistantSettingsProps>(ASSISTANT_PLUGIN)?.value;

  // TODO(burdon): Refocus when open.
  const [open, setOpen] = useState(false);

  return (
    <ChatDialog.Root open={open} onOpenChange={setOpen} title={t('assistant dialog title')}>
      <ThreadContainer
        part={'dialog'}
        chat={chat}
        onOpenChange={setOpen}
        settings={settings}
        transcription={transcription}
      />
    </ChatDialog.Root>
  );
};

export default AssistantDialog;
