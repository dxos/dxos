//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { invokeFunctionWithTracing } from '@dxos/plugin-automation/hooks';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { Panel } from '@dxos/react-ui';
import { type Message } from '@dxos/types';

import { ComposeEmailPanel } from '#components';
import { GmailFunctions } from '../../operations/google/gmail';

export type DraftMessageArticleProps = AppSurface.ObjectArticleProps<Message.Message>;

export const DraftMessageArticle = ({ role, subject }: DraftMessageArticleProps) => {
  const db = Obj.getDatabase(subject);
  const computeRuntime = useCapability(AutomationCapabilities.ComputeRuntime);
  const runtime = db?.spaceId ? computeRuntime.getRuntime(db.spaceId) : undefined;

  const handleSend = useCallback(
    async (message: Message.Message) => {
      invariant(runtime);
      await runtime.runPromise(invokeFunctionWithTracing(GmailFunctions.Send, { message }));
    },
    [runtime],
  );

  return (
    <Panel.Root role={role} className='dx-document'>
      <Panel.Content asChild>
        <ComposeEmailPanel draft={subject} onSend={handleSend} />
      </Panel.Content>
    </Panel.Root>
  );
};
