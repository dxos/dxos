//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { AutomationCapabilities, invokeFunctionWithTracing } from '@dxos/plugin-automation';
import { Layout } from '@dxos/react-ui';
import { type Message } from '@dxos/types';

import { ComposeEmailPanel } from '../../components/ComposeEmailPanel';
import { GmailFunctions } from '../../functions';

export type DraftMessageArticleProps = SurfaceComponentProps<Message.Message>;

export const DraftMessageArticle = ({ role, subject }: DraftMessageArticleProps) => {
  const db = Obj.getDatabase(subject);
  const computeRuntime = useCapability(AutomationCapabilities.ComputeRuntime);
  const runtime = db?.spaceId ? computeRuntime.getRuntime(db.spaceId) : undefined;

  const handleSend = useCallback(
    async (message: Message.Message) => {
      if (!runtime) {
        throw new Error('Runtime not available');
      }
      await runtime.runPromise(invokeFunctionWithTracing(GmailFunctions.Send, { message }));
    },
    [runtime],
  );

  return (
    <Layout.Main role={role}>
      <ComposeEmailPanel draft={subject} onSend={handleSend} />
    </Layout.Main>
  );
};
