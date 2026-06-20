//
// Copyright 2025 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React, { useCallback, useMemo } from 'react';

import { AiService } from '@dxos/ai';
import { useProcessManagerRuntime } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Operation, ServiceResolver } from '@dxos/compute';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Integration } from '@dxos/plugin-integration';
import { useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { assistant, type AssistantOptions } from '@dxos/react-ui-editor';
import { type Message } from '@dxos/types';

import { EditMessage } from '#components';

import { type EditMessageProps } from '../../components';
import { email } from '../../extensions';
import { InboxOperation } from '../../types';
import { stripQuotedMessage } from '../../util';

export type EditMessageArticleProps = AppSurface.ObjectArticleProps<Message.Message>;

export const EditMessageArticle = ({ role, subject }: EditMessageArticleProps) => {
  const db = Obj.getDatabase(subject);
  const runtime = useProcessManagerRuntime();
  const spaceId = db?.spaceId;
  // Resolve the Integration that owns this draft's mailbox so SendMessage can dispatch by providerId.
  const integrations = useQuery(db, Filter.type(Integration.Integration));
  const ownerIntegration = useMemo(() => {
    const mailboxDxn = (subject.properties as Record<string, unknown> | undefined)?.mailbox;
    if (typeof mailboxDxn !== 'string') {
      return undefined;
    }
    return integrations.find((candidate) =>
      candidate.targets.some((entry) => entry.object?.uri.toString() === mailboxDxn),
    );
  }, [integrations, subject]);
  const extensions = useMemo(() => {
    if (!spaceId) {
      return [];
    }

    const generate: AssistantOptions['generate'] = ({ instructions, content }) =>
      runtime.runPromise(
        Effect.gen(function* () {
          const prompt = [instructions, stripQuotedMessage(content)].join('\n\n');
          const response = yield* LanguageModel.generateText({ prompt });
          return response.text;
        }).pipe(
          Effect.provide(
            AiService.model('ai.claude.model.claude-haiku-4-5').pipe(
              Layer.orDie,
              Layer.provide(ServiceResolver.provide({ space: spaceId }, AiService.AiService)),
            ),
          ),
        ),
      );

    return [assistant({ generate }), email()];
  }, [runtime, spaceId]);

  const handleSend = useCallback<NonNullable<EditMessageProps['onSend']>>(
    async (message) => {
      if (!spaceId) {
        throw new TypeError('Space not available.');
      }
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
        }).pipe(Effect.provide(ServiceResolver.provide({ space: spaceId }, Database.Service))),
      );
    },
    [runtime, spaceId, ownerIntegration],
  );

  return (
    <Panel.Root role={role} className='dx-document'>
      <Panel.Toolbar asChild>
        <Toolbar.Root />
      </Panel.Toolbar>
      <Panel.Content asChild>
        <EditMessage message={subject} extensions={extensions} onSend={handleSend} />
      </Panel.Content>
    </Panel.Root>
  );
};
