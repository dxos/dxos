//
// Copyright 2025 DXOS.org
//

import React, { type FC, useState } from 'react';

import { useCapability, Capabilities, useCapabilities } from '@dxos/app-framework';
import { TranscriptionCapabilities } from '@dxos/plugin-transcription';
import { useTranslation } from '@dxos/react-ui';
import { ChatDialog } from '@dxos/react-ui-chat';

// import { ThreadRoot } from './Thread';
import { ChatPrompt } from './ChatPrompt';
import { meta } from '../meta';
import { type AssistantSettingsProps, type AIChatType } from '../types';

export const AssistantDialog: FC<{ chat?: AIChatType }> = ({ chat }) => {
  const { t } = useTranslation(meta.id);
  const settings = useCapability(Capabilities.SettingsStore).getStore<AssistantSettingsProps>(meta.id)?.value;
  const transcription = useCapabilities(TranscriptionCapabilities.Transcriber).length > 0;

  // TODO(burdon): Refocus when open.
  const [open, setOpen] = useState(false);

  return (
    <ChatDialog.Root open={open} onOpenChange={setOpen}>
      <ChatDialog.Header title={t('assistant dialog title')} />
      <ChatDialog.Content>
        {/* <ThreadRoot
        part={'dialog'}
        chat={chat}
        onOpenChange={setOpen}
        settings={settings}
        transcription={transcription}
      /> */}
      </ChatDialog.Content>
      <ChatDialog.Footer>
        <ChatPrompt
          placeholder={t('assistant dialog placeholder')}
          onSubmit={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </ChatDialog.Footer>
    </ChatDialog.Root>
  );
};

export default AssistantDialog;
