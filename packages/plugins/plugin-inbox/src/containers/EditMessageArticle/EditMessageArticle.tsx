//
// Copyright 2025 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React, { useCallback, useMemo } from 'react';

import { AiService } from '@dxos/ai';
import { useCapability } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Operation } from '@dxos/compute';
import { Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { Integration } from '@dxos/plugin-integration/types';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { assistant, type AssistantOptions } from '@dxos/react-ui-editor';
import { type Message } from '@dxos/types';

import { EditMessage } from '#components';

import { type EditMessageProps } from '../../components/EditMessage/EditMessage';
import { email } from '../../extensions';
import { InboxOperation } from '../../operations';
import { stripQuotedMessage } from '../../util';

export type EditMessageArticleProps = AppSurface.ObjectArticleProps<Message.Message>;

export const EditMessageArticle = ({ role, subject }: EditMessageArticleProps) => {
  const db = Obj.getDatabase(subject);
  const computeRuntime = useCapability(AutomationCapabilities.ComputeRuntime);
  const runtime = db?.spaceId ? computeRuntime.getRuntime(db.spaceId) : undefined;
  // Resolve the Integration that owns this draft's mailbox so SendMessage can dispatch by providerId.
  // The draft's owning mailbox is encoded as a DXN on `message.properties.mailbox` (see util.ts).
  const integrations = useQuery(db, Filter.type(Integration.Integration));
  const ownerIntegration = useMemo(() => {
    const mailboxDxn = (subject.properties as Record<string, unknown> | undefined)?.mailbox;
    if (typeof mailboxDxn !== 'string') {
      return undefined;
    }
    return integrations.find((candidate) =>
      candidate.targets.some((entry) => entry.object?.dxn.toString() === mailboxDxn),
    );
  }, [integrations, subject]);
  const extensions = useMemo(() => {
    if (!runtime) {
      return [];
    }

    // TODO(burdon): Factor out/configure.
    const generate: AssistantOptions['generate'] = ({ instructions, content }) =>
      runtime.runPromise(
        Effect.gen(function* () {
          const prompt = [instructions, stripQuotedMessage(content)].join('\n\n');
          const response = yield* LanguageModel.generateText({ prompt });
          return response.text;
        }).pipe(Effect.provide(AiService.model('@anthropic/claude-haiku-4-5').pipe(Layer.orDie))),
      );

    return [assistant({ generate }), email()];
  }, [runtime]);

  const handleSend = useCallback<NonNullable<EditMessageProps['onSend']>>(
    async (message) => {
      invariant(runtime);
      if (!ownerIntegration) {
        log.warn('EditMessageArticle: no Integration found for this draft; cannot send', {
          mailbox: (message.properties as Record<string, unknown> | undefined)?.mailbox,
        });
        return;
      }
      await runtime.runPromise(
        Operation.invoke(InboxOperation.SendMessage, {
          integration: Ref.make(ownerIntegration),
          message,
        }),
      );
    },
    [runtime, ownerIntegration],
  );

  return (
    <Panel.Root role={role} className='dx-document'>
      <Panel.Content asChild>
        <EditMessage message={subject} extensions={extensions} onSend={handleSend} />
      </Panel.Content>
    </Panel.Root>
  );
};
